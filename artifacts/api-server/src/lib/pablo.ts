import { and, eq, inArray, or } from "drizzle-orm";
import { rides, type RideRecord } from "@workspace/db";

export const provinces = ["القاهرة","الجيزة","الإسكندرية","دمياط","الدقهلية","الشرقية","البحيرة","المنوفية","الغربية","كفر الشيخ","بورسعيد","الإسماعيلية","السويس","الفيوم","بني سويف","المنيا","أسيوط","سوهاج","قنا","الأقصر","أسوان","مطروح","شمال سيناء","جنوب سيناء","البحر الأحمر","الوادي الجديد","القليوبية"];
export const activeStates = ["pending", "accepted", "arrived", "in_progress"];
export const belongsTo = (id: string) => or(eq(rides.customerId, id), eq(rides.driverId, id));
export const activeFor = (id: string) => and(belongsTo(id), inArray(rides.status, activeStates));
export function rideJson(ride: RideRecord, queue = false, showCommission = false) {
  return {
    ...ride,
    customerPhone: queue ? null : ride.customerPhone,
    // Coordinates and notes are shared only after the driver accepts.
    pickupLat: queue ? null : ride.pickupLat,
    pickupLng: queue ? null : ride.pickupLng,
    destinationLat: queue ? null : ride.destinationLat,
    destinationLng: queue ? null : ride.destinationLng,
    commissionPiasters: showCommission ? ride.commissionPiasters : null,
    commissionState: showCommission ? ride.commissionState : null,
    promoCommissionWaived: showCommission ? ride.promoCommissionWaived : false,
    notes: queue ? "" : ride.notes,
    createdAt: ride.createdAt.toISOString(),
    updatedAt: ride.updatedAt.toISOString(),
    feedbackSubmittedAt: ride.feedbackSubmittedAt?.toISOString() ?? null,
  };
}
export class AppError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
