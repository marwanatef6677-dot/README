import { AppError } from "./pablo";

export type RoutePointInput = {
  pickupLat: number;
  pickupLng: number;
  destinationLat: number;
  destinationLng: number;
};

export async function getRoutePreview(input: RoutePointInput) {
  const coordinates = `${input.pickupLng},${input.pickupLat};${input.destinationLng},${input.destinationLat}`;
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=simplified&geometries=geojson&steps=false`;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Routing provider status ${response.status}`);
    const data = await response.json() as { code?: string; routes?: { distance: number; duration: number; geometry: { coordinates: number[][] } }[] };
    const route = data.routes?.[0];
    if (data.code !== "Ok" || !route) throw new AppError(422, "مفيش مسار قيادة متاح بين النقطتين. راجع اختيارك.");
    return {
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      coordinates: route.geometry.coordinates,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(503, "خدمة حساب المسار مش متاحة دلوقتي. مقدرناش نحسب أجرة تقديرية للطلب.");
  }
}

export function calculateFarePiasters(distanceMeters: number, durationSeconds: number): number {
  if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds) || distanceMeters <= 0 || durationSeconds <= 0) {
    throw new AppError(422, "المسافة أو مدة الرحلة غير صالحة لحساب الأجرة.");
  }
  // EGP 20 start + EGP 10/km + EGP 1/minute, minimum EGP 40.
  const distancePiasters = Math.round(distanceMeters);
  const timePiasters = Math.round((durationSeconds * 100) / 60);
  return Math.max(4_000, 2_000 + distancePiasters + timePiasters);
}

export function moneyEgp(piasters: number): string {
  return (piasters / 100).toFixed(2);
}
