import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, profiles, rides } from "@workspace/db";
import { GetConfigResponse, GetProfileResponse, UpdateProfileBody, UpdateProfileResponse, GetSummaryResponse } from "@workspace/api-zod";
import { requirePabloAuth } from "../middlewares/auth";
import { provinces, activeFor, belongsTo, activeStates, AppError } from "../lib/pablo";

const router: IRouter = Router();
router.get("/config", (_req, res) => {
  res.json(GetConfigResponse.parse({
    provinces,
    rideTypes: [
      { id: "economy", name: "اقتصادي", description: "اختيارك للمشاوير اليومية", seats: 4 },
      { id: "family", name: "عائلي", description: "مساحة أكبر ليك ولعيلتك", seats: 6 },
      { id: "premium", name: "مميز", description: "راحة أكتر في كل مشوار", seats: 4 },
    ],
    notice: "نسخة تجريبية للاختبار فقط. الأجرة والعمولة ومحفظة الكابتن متطلبات غير مفعّلة ماليًا. لا يستطيع الكابتن قبول الرحلات قبل اعتماد الإدارة. الخرائط للتجربة، والتتبع بإذن الكابتن أثناء فتح التطبيق. غير مخصصة لنقل ركاب تجاري.",
  }));
});
router.get("/profile", requirePabloAuth, async (_req, res): Promise<void> => {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, res.locals.userId));
  res.json(GetProfileResponse.parse({
    ...profile,
    driverTermsAccepted: Boolean(profile.driverTermsAcceptedAt),
  }));
});
router.patch("/profile", requirePabloAuth, async (req, res): Promise<void> => {
  const normalized = Object.fromEntries(Object.entries(req.body ?? {}).map(([k,v]) => [k, typeof v === "string" ? v.trim() : v]));
  const parsed = UpdateProfileBody.safeParse(normalized);
  if (!parsed.success) throw new AppError(400, "راجع الاسم ورقم الموبايل المصري والبيانات المطلوبة.");
  const data = parsed.data;
  const { driverTermsAccepted, ...profileData } = data;
  if (!provinces.includes(data.province)) throw new AppError(400, "اختار محافظة من القائمة.");
  if (data.role === "driver" && (!data.vehicle || !data.plate)) throw new AppError(400, "اكتب نوع العربية ورقم اللوحة الأول.");
  if (data.role === "driver" && !driverTermsAccepted) {
    throw new AppError(400, "اقرأ إقرار الكابتن ووافق عليه قبل تسجيل حساب الكابتن.");
  }
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(profiles).where(eq(profiles.id, res.locals.userId)).for("update");
    const [active] = await tx.select({ id: rides.id }).from(rides).where(activeFor(existing.id)).limit(1);
    if (active) throw new AppError(409, "كمّل أو الغي الرحلة الحالية قبل تعديل بيانات الحساب.");
    const needsReview = data.role === "driver" && (
      existing.role !== "driver" || existing.name !== data.name || existing.phone !== data.phone
      || existing.province !== data.province || existing.vehicle !== data.vehicle || existing.plate !== data.plate
    );
    const [updated] = await tx.update(profiles).set({
      ...profileData,
      onboarded: true,
      driverTermsAcceptedAt: data.role === "driver" && driverTermsAccepted
        ? new Date() : existing.driverTermsAcceptedAt,
      driverTermsVersion: data.role === "driver" && driverTermsAccepted
        ? "pablo-captain-terms-v1" : existing.driverTermsVersion,
      ...(needsReview ? {
        driverReviewStatus: "pending",
        driverReviewNote: "",
        driverReviewedAt: null,
        driverReviewedBy: null,
        identityVerified: false,
        drivingLicenseVerified: false,
        vehicleVerified: false,
        workPermitVerified: false,
        socialInsuranceVerified: false,
        backgroundCheckCompleted: false,
        vehicleRequirementsVerified: false,
        operatorLicenseVerified: false,
        randomTestProcessConfirmed: false,
      } : {}),
    }).where(eq(profiles.id, existing.id)).returning();
    return updated;
  });
  res.json(UpdateProfileResponse.parse({
    ...result,
    driverTermsAccepted: Boolean(result.driverTermsAcceptedAt),
  }));
});
router.get("/summary", requirePabloAuth, async (_req, res): Promise<void> => {
  const records = await db.select({ status: rides.status }).from(rides).where(belongsTo(res.locals.userId));
  res.json(GetSummaryResponse.parse({
    total: records.length,
    completed: records.filter(r => r.status === "completed").length,
    cancelled: records.filter(r => r.status === "cancelled").length,
    active: records.filter(r => activeStates.includes(r.status)).length,
  }));
});
export default router;
