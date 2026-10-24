import { and, eq, inArray, or } from "drizzle-orm";
import { rides, type ProfileRecord, type RideRecord } from "@workspace/db";

export const provinces = ["القاهرة","الجيزة","الإسكندرية","دمياط","الدقهلية","الشرقية","البحيرة","المنوفية","الغربية","كفر الشيخ","بورسعيد","الإسماعيلية","السويس","الفيوم","بني سويف","المنيا","أسيوط","سوهاج","قنا","الأقصر","أسوان","مطروح","شمال سيناء","جنوب سيناء","البحر الأحمر","الوادي الجديد","القليوبية"];
export const activeStates = ["pending", "accepted", "arrived", "in_progress"];
export const CUSTOMER_TERMS_VERSION = "pablo-customer-terms-v1";
export const DRIVER_TERMS_VERSION = "pablo-captain-terms-v2";
const normalizeSignature = (value: string) => value.normalize("NFKC").replace(/\s+/g, " ").trim();
export function hasCurrentCustomerTerms(profile: Pick<ProfileRecord, "name" | "customerAge18Attested" | "customerTermsSignature" | "customerTermsAcceptedAt" | "customerTermsVersion">) {
  return profile.customerAge18Attested
    && profile.customerTermsSignature.trim().length > 0
    && normalizeSignature(profile.customerTermsSignature) === normalizeSignature(profile.name)
    && profile.customerTermsAcceptedAt !== null
    && profile.customerTermsVersion === CUSTOMER_TERMS_VERSION;
}
export function hasCurrentDriverTerms(profile: Pick<ProfileRecord, "name" | "driverTermsAcceptedAt" | "driverTermsVersion" | "driverTermsSignature">) {
  return profile.driverTermsAcceptedAt !== null
    && profile.driverTermsVersion === DRIVER_TERMS_VERSION
    && profile.driverTermsSignature.trim().length > 0
    && normalizeSignature(profile.driverTermsSignature) === normalizeSignature(profile.name);
}
export function hasDriverLicenseDocuments(profile: Pick<ProfileRecord,
  "driverLicenseFrontPhotoPath" | "driverLicenseBackPhotoPath" | "vehicleLicenseFrontPhotoPath" | "vehicleLicenseBackPhotoPath"
>) {
  return Boolean(
    profile.driverLicenseFrontPhotoPath
    && profile.driverLicenseBackPhotoPath
    && profile.vehicleLicenseFrontPhotoPath
    && profile.vehicleLicenseBackPhotoPath,
  );
}
export const belongsTo = (id: string) => or(eq(rides.customerId, id), eq(rides.driverId, id));
export const activeFor = (id: string) => and(belongsTo(id), inArray(rides.status, activeStates));
export function rideJson(ride: RideRecord, queue = false, showCommission = false, showPabloFeedback = false) {
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
    customerPayPiasters: ride.farePiasters == null
      ? null
      : Math.max(0, ride.farePiasters - ride.customerDiscountPiasters),
    notes: queue ? "" : ride.notes,
    recipientName: queue ? "" : ride.recipientName,
    recipientPhone: queue ? "" : ride.recipientPhone,
    pabloRating: showPabloFeedback ? ride.pabloRating : null,
    pabloFeedbackNote: showPabloFeedback ? ride.pabloFeedbackNote : "",
    createdAt: ride.createdAt.toISOString(),
    updatedAt: ride.updatedAt.toISOString(),
    feedbackSubmittedAt: ride.feedbackSubmittedAt?.toISOString() ?? null,
  };
}
export class AppError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
