import { AppError } from "./pablo";

export type RoutePointInput = {
  pickupLat: number;
  pickupLng: number;
  destinationLat: number;
  destinationLng: number;
};

type RideType = "economy" | "family" | "premium" | "motorcycle";
type ServiceType = "passenger" | "delivery";

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

export function getMinimumFarePiasters(rideType: RideType, serviceType: ServiceType): number {
  if (serviceType === "delivery") return 3_000;
  return rideType === "motorcycle" ? 3_000 : 4_000;
}

export function calculateFarePiasters(
  distanceMeters: number,
  durationSeconds: number,
  rideType: RideType,
  serviceType: ServiceType,
): number {
  if (!Number.isFinite(distanceMeters) || !Number.isFinite(durationSeconds) || distanceMeters <= 0 || durationSeconds <= 0) {
    throw new AppError(422, "المسافة أو مدة الرحلة غير صالحة لحساب الأجرة.");
  }
  if (serviceType === "delivery" && rideType !== "motorcycle") {
    throw new AppError(400, "توصيل المنتجات متاح بالموتوسيكل فقط.");
  }
  const policy = serviceType === "delivery"
    ? { startPiasters: 3_000, perKmPiasters: 800, perMinutePiasters: 0 }
    : rideType === "motorcycle"
      ? { startPiasters: 1_500, perKmPiasters: 800, perMinutePiasters: 100 }
      : { startPiasters: 2_000, perKmPiasters: 1_000, perMinutePiasters: 100 };
  const distancePiasters = Math.round((distanceMeters * policy.perKmPiasters) / 1_000);
  const timePiasters = Math.round((durationSeconds * policy.perMinutePiasters) / 60);
  return Math.max(getMinimumFarePiasters(rideType, serviceType), policy.startPiasters + distancePiasters + timePiasters);
}

export function moneyEgp(piasters: number): string {
  return (piasters / 100).toFixed(2);
}
