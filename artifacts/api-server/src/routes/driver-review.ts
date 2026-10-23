import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import {
  db, profiles,
} from "@workspace/db";
import {
  ListDriverReviewsResponse, ReviewDriverBody, ReviewDriverParams, ReviewDriverResponse,
} from "@workspace/api-zod";
import { requirePabloAuth } from "../middlewares/auth";
import { requirePabloAdmin } from "../middlewares/admin";
import { AppError, hasCurrentDriverTerms, hasDriverLicenseDocuments } from "../lib/pablo";

const router: IRouter = Router();
const checks = [
  "captainPhotoVerified",
  "identityVerified",
  "drivingLicenseVerified",
  "vehicleVerified",
  "workPermitVerified",
  "socialInsuranceVerified",
  "backgroundCheckCompleted",
  "vehicleRequirementsVerified",
  "operatorLicenseVerified",
  "randomTestProcessConfirmed",
] as const;

function driverReviewJson(profile: typeof profiles.$inferSelect) {
  const documentsReady = hasDriverLicenseDocuments(profile);
  const termsAccepted = hasCurrentDriverTerms(profile);
  return {
    id: profile.id,
    name: profile.name,
    phone: profile.phone,
    province: profile.province,
    vehicle: profile.vehicle,
    vehicleType: profile.vehicleType,
    plate: profile.plate,
    driverReviewStatus: profile.driverReviewStatus === "approved" && (!documentsReady || !termsAccepted || !profile.captainVehiclePhotoPath) ? "pending" : profile.driverReviewStatus,
    driverTermsAccepted: termsAccepted,
    driverReviewNote: profile.driverReviewNote,
    driverReviewedAt: profile.driverReviewedAt?.toISOString() ?? null,
    captainVehiclePhotoAvailable: Boolean(profile.captainVehiclePhotoPath),
    driverLicenseFrontAvailable: Boolean(profile.driverLicenseFrontPhotoPath),
    driverLicenseBackAvailable: Boolean(profile.driverLicenseBackPhotoPath),
    vehicleLicenseFrontAvailable: Boolean(profile.vehicleLicenseFrontPhotoPath),
    vehicleLicenseBackAvailable: Boolean(profile.vehicleLicenseBackPhotoPath),
    captainPhotoVerified: profile.captainPhotoVerified,
    identityVerified: profile.identityVerified,
    drivingLicenseVerified: profile.drivingLicenseVerified,
    vehicleVerified: profile.vehicleVerified,
    workPermitVerified: profile.workPermitVerified,
    socialInsuranceVerified: profile.socialInsuranceVerified,
    backgroundCheckCompleted: profile.backgroundCheckCompleted,
    vehicleRequirementsVerified: profile.vehicleRequirementsVerified,
    operatorLicenseVerified: profile.operatorLicenseVerified,
    randomTestProcessConfirmed: profile.randomTestProcessConfirmed,
  };
}

router.use("/admin/drivers", requirePabloAuth, requirePabloAdmin);

router.get("/admin/drivers", async (_req, res): Promise<void> => {
  const drivers = await db.select().from(profiles)
    .where(eq(profiles.role, "driver"))
    .orderBy(asc(profiles.name));
  const pending = drivers.filter((driver) => driver.driverReviewStatus !== "approved"
    || !hasCurrentDriverTerms(driver) || !hasDriverLicenseDocuments(driver) || !driver.captainVehiclePhotoPath);
  res.json(ListDriverReviewsResponse.parse(pending.map(driverReviewJson)));
});

router.post("/admin/drivers/:id/review", async (req, res): Promise<void> => {
  const params = ReviewDriverParams.safeParse(req.params);
  const parsed = ReviewDriverBody.safeParse(req.body);
  if (!params.success || !parsed.success) throw new AppError(400, "بيانات مراجعة الكابتن غير صحيحة.");
  const { decision, note, ...verified } = parsed.data;
  if (decision === "approved" && (checks.some((field) => !verified[field]))) {
    throw new AppError(400, "لازم تراجع كل المتطلبات وتؤكدها قبل اعتماد الكابتن.");
  }
  const updated = await db.transaction(async (tx) => {
    const [driver] = await tx.select().from(profiles).where(eq(profiles.id, params.data.id)).for("update");
    if (!driver || driver.role !== "driver") throw new AppError(404, "حساب الكابتن غير موجود.");
    if (decision === "approved" && !hasCurrentDriverTerms(driver)) {
      throw new AppError(409, "الكابتن لازم يوافق على الإقرار قبل الاعتماد.");
    }
    if (decision === "approved" && !hasDriverLicenseDocuments(driver)) {
      throw new AppError(409, "لازم تراجع صور وجهي رخصة القيادة ورخصة المركبة قبل الاعتماد.");
    }
    if (decision === "approved" && !driver.captainVehiclePhotoPath) {
      throw new AppError(409, "صورة الكابتن مع المركبة مطلوبة قبل الاعتماد.");
    }
    const [result] = await tx.update(profiles).set({
      ...verified,
      driverReviewStatus: decision,
      driverReviewNote: note,
      driverReviewedAt: new Date(),
      driverReviewedBy: res.locals.userId,
    }).where(eq(profiles.id, driver.id)).returning();
    return result;
  });
  res.json(ReviewDriverResponse.parse(driverReviewJson(updated)));
});

export default router;
