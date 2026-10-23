import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, profiles, rides } from "@workspace/db";
import { GetConfigResponse, GetProfileResponse, UpdateProfileBody, UpdateProfileResponse, GetSummaryResponse } from "@workspace/api-zod";
import { requirePabloAuth } from "../middlewares/auth";
import { provinces, activeFor, belongsTo, activeStates, AppError, CUSTOMER_TERMS_VERSION, hasCurrentCustomerTerms } from "../lib/pablo";

const router: IRouter = Router();
const RIDES_PER_LEVEL = 10;
const MAX_DRIVER_LEVEL = 10;

async function profileJson(profile: typeof profiles.$inferSelect) {
  const [stats] = await db.select({
    completedRides: sql<number>`count(*) filter (where ${rides.status} = 'completed')::int`,
    driverRating: sql<number | null>`round(avg(${rides.captainRating})::numeric, 1)::float8`,
  }).from(rides).where(eq(rides.driverId, profile.id));
  const completedRides = stats?.completedRides ?? 0;
  const driverLevel = Math.min(MAX_DRIVER_LEVEL, Math.floor(completedRides / RIDES_PER_LEVEL));
  const {
    avatarPhotoPath, captainVehiclePhotoPath, customerAge18Attested,
    customerTermsSignature, customerTermsAcceptedAt, customerTermsVersion,
    ...safeProfile
  } = profile;
  return {
    ...safeProfile,
    customerTermsAccepted: hasCurrentCustomerTerms({
      customerAge18Attested, customerTermsSignature, customerTermsAcceptedAt, customerTermsVersion,
    }),
    customerTermsAcceptedAt: customerTermsAcceptedAt?.toISOString() ?? null,
    hasAvatarPhoto: Boolean(avatarPhotoPath),
    hasCaptainVehiclePhoto: Boolean(captainVehiclePhotoPath),
    driverTermsAccepted: Boolean(profile.driverTermsAcceptedAt),
    driverCompletedRides: completedRides,
    driverRating: stats?.driverRating == null ? null : Number(stats.driverRating),
    driverLevel,
    ridesToNextLevel: driverLevel >= MAX_DRIVER_LEVEL ? 0 : RIDES_PER_LEVEL - completedRides % RIDES_PER_LEVEL,
  };
}

router.get("/config", (_req, res) => {
  res.json(GetConfigResponse.parse({
    provinces,
    rideTypes: [
      { id: "economy", name: "اقتصادي", description: "اختيارك للمشاوير اليومية", seats: 4 },
      { id: "family", name: "عائلي", description: "مساحة أكبر ليك ولعيلتك", seats: 6 },
      { id: "premium", name: "مميز", description: "راحة أكتر في كل مشوار", seats: 4 },
      { id: "motorcycle", name: "موتوسيكل", description: "مشاوير ركاب بالموتوسيكل", seats: 1 },
    ],
    fareDescriptions: {
      car: "السيارة: ٢٠ جنيه بداية + ١٠ لكل كم + ١ لكل دقيقة، بحد أدنى ٤٠ جنيهًا.",
      motorcycle: "مشوار راكب بالموتوسيكل: ١٥ جنيه بداية + ٨ لكل كم + ١ لكل دقيقة، بحد أدنى ٣٠ جنيهًا.",
      delivery: "توصيل المنتجات بالموتوسيكل: ٣٠ جنيه بداية + ٨ لكل كم.",
    },
    notice: "خدمات الموتوسيكل والتوصيل تجريبية للاختبار فقط. لا تبدأ التشغيل التجاري قبل اعتماد الإدارة ومراجعة التراخيص والتأمين والسياسات اللازمة. الخرائط والتتبع للتجربة، والقبول متاح للكابتن بعد اعتماد الإدارة.",
  }));
});
router.get("/profile", requirePabloAuth, async (_req, res): Promise<void> => {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, res.locals.userId));
  res.json(GetProfileResponse.parse(await profileJson(profile)));
});
router.patch("/profile", requirePabloAuth, async (req, res): Promise<void> => {
  const normalized = Object.fromEntries(Object.entries(req.body ?? {}).map(([k,v]) => [k, typeof v === "string" ? v.trim() : v]));
  const parsed = UpdateProfileBody.safeParse(normalized);
  if (!parsed.success) throw new AppError(400, "راجع الاسم ورقم الموبايل المصري والبيانات المطلوبة.");
  const data = parsed.data;
  const {
    driverTermsAccepted,
    customerAge18Attested,
    customerTermsAccepted,
    customerTermsSignature,
    ...profileData
  } = data;
  if (!provinces.includes(data.province)) throw new AppError(400, "اختار محافظة من القائمة.");
  if (data.role === "driver" && (!data.vehicle || !data.plate)) throw new AppError(400, "اكتب نوع العربية ورقم اللوحة الأول.");
  if (data.role === "driver" && !driverTermsAccepted) {
    throw new AppError(400, "اقرأ إقرار الكابتن ووافق عليه قبل تسجيل حساب الكابتن.");
  }
  const result = await db.transaction(async (tx) => {
    const [existing] = await tx.select().from(profiles).where(eq(profiles.id, res.locals.userId)).for("update");
    const alreadyAcceptedCurrentTerms = hasCurrentCustomerTerms(existing);
    let customerTermsUpdate: Partial<typeof profiles.$inferInsert> = {};
    if (data.role === "customer" && !alreadyAcceptedCurrentTerms) {
      if (customerAge18Attested !== true || customerTermsAccepted !== true) {
        throw new AppError(400, "أقر أن عمرك ١٨ سنة أو أكثر ووافق على شروط العميل قبل المتابعة.");
      }
      const signedName = (customerTermsSignature ?? "").trim();
      const normalizeName = (value: string) => value.normalize("NFKC").replace(/\s+/g, " ").trim();
      if (!signedName || normalizeName(signedName) !== normalizeName(data.name)) {
        throw new AppError(400, "اكتب اسمك الكامل كتوقيع مطابق للاسم المسجل.");
      }
      customerTermsUpdate = {
        customerAge18Attested: true,
        customerTermsSignature: signedName,
        customerTermsAcceptedAt: new Date(),
        customerTermsVersion: CUSTOMER_TERMS_VERSION,
      };
    }
    if (data.role === "driver" && !existing.captainVehiclePhotoPath) {
      throw new AppError(400, "ارفع صورة واضحة ليك مع العربية أو الموتوسيكل قبل تسجيل حساب الكابتن.");
    }
    const [active] = await tx.select({ id: rides.id }).from(rides).where(activeFor(existing.id)).limit(1);
    const profileUnchangedDuringConsent = data.name === existing.name
      && data.phone === existing.phone
      && data.role === existing.role
      && data.province === existing.province
      && data.vehicle === existing.vehicle
      && data.vehicleType === existing.vehicleType
      && data.plate === existing.plate;
    const termsOnlyAcceptance = Boolean(customerTermsUpdate.customerTermsAcceptedAt) && profileUnchangedDuringConsent;
    if (active && !termsOnlyAcceptance) throw new AppError(409, "كمّل أو الغي الرحلة الحالية قبل تعديل بيانات الحساب.");
    const needsReview = data.role === "driver" && (
      existing.role !== "driver" || existing.name !== data.name || existing.phone !== data.phone
      || existing.province !== data.province || existing.vehicle !== data.vehicle
      || existing.vehicleType !== data.vehicleType || existing.plate !== data.plate
    );
    const [updated] = await tx.update(profiles).set({
      ...profileData,
      ...customerTermsUpdate,
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
        captainPhotoVerified: false,
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
  res.json(UpdateProfileResponse.parse(await profileJson(result)));
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
