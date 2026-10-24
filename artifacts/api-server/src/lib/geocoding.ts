import { AppError } from "./pablo";

export type MapPlaceResult = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

type CachedSearch = { expiresAt: number; results: MapPlaceResult[] };
type NominatimPlace = { place_id?: number; display_name?: string; lat?: string; lon?: string };

const SEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const SEARCH_CACHE_MAX_ENTRIES = 500;
const MIN_PROVIDER_INTERVAL_MS = 1_100;
const searchCache = new Map<string, CachedSearch>();
const inFlightSearches = new Map<string, Promise<MapPlaceResult[]>>();

let providerQueue: Promise<void> = Promise.resolve();
let lastProviderStartAt = 0;

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function normalize(value: string) {
  return value.normalize("NFKC").replace(/\s+/g, " ").trim().toLocaleLowerCase("ar-EG");
}

function withProviderSlot<T>(work: () => Promise<T>): Promise<T> {
  const result = providerQueue.then(async () => {
    const waitMs = MIN_PROVIDER_INTERVAL_MS - (Date.now() - lastProviderStartAt);
    if (waitMs > 0) await sleep(waitMs);
    lastProviderStartAt = Date.now();
    return work();
  });
  providerQueue = result.then(() => undefined, () => undefined);
  return result;
}

function cacheResults(key: string, results: MapPlaceResult[]) {
  if (searchCache.size >= SEARCH_CACHE_MAX_ENTRIES) {
    const oldestKey = searchCache.keys().next().value;
    if (oldestKey) searchCache.delete(oldestKey);
  }
  searchCache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, results });
}

async function fetchNominatim(query: string): Promise<MapPlaceResult[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.search = new URLSearchParams({
    q: query,
    format: "jsonv2",
    addressdetails: "1",
    countrycodes: "eg",
    limit: "6",
    "accept-language": "ar",
  }).toString();

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Accept-Language": "ar-EG,ar;q=0.9,en;q=0.8",
      "User-Agent": "PabloRide/1.0 (Egypt place search)",
    },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    throw new AppError(503, "بحث الأماكن مش متاح دلوقتي. اكتب العنوان يدويًا أو حدد الدبوس على الخريطة.");
  }

  const data = await response.json() as NominatimPlace[];
  if (!Array.isArray(data)) throw new AppError(503, "نتائج البحث غير متاحة دلوقتي.");

  const seenCoordinates = new Set<string>();
  return data.flatMap((place) => {
    const latitude = Number(place.lat);
    const longitude = Number(place.lon);
    const label = place.display_name?.trim().slice(0, 240);
    if (!label || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
    // Search is restricted to Egypt, with a coordinate guard against bad provider data.
    if (latitude < 21.5 || latitude > 32.5 || longitude < 24 || longitude > 37.5) return [];
    const coordinateKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    if (seenCoordinates.has(coordinateKey)) return [];
    seenCoordinates.add(coordinateKey);
    return [{ id: String(place.place_id ?? `${latitude},${longitude}`), label, latitude, longitude }];
  });
}

export async function searchMapPlaces(query: string, province?: string): Promise<MapPlaceResult[]> {
  const normalizedQuery = normalize(query);
  const normalizedProvince = normalize(province ?? "");
  const key = `${normalizedQuery}|${normalizedProvince}`;
  const cached = searchCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.results;
  if (cached) searchCache.delete(key);

  const pending = inFlightSearches.get(key);
  if (pending) return pending;

  const providerQuery = [query.trim(), province?.trim(), "Egypt"].filter(Boolean).join(", ");
  const request = withProviderSlot(() => fetchNominatim(providerQuery))
    .then((results) => {
      cacheResults(key, results);
      return results;
    })
    .catch((error: unknown) => {
      if (error instanceof AppError) throw error;
      throw new AppError(503, "تعذر البحث عن المكان. اكتب العنوان يدويًا أو حدد الدبوس على الخريطة.");
    })
    .finally(() => inFlightSearches.delete(key));
  inFlightSearches.set(key, request);
  return request;
}
