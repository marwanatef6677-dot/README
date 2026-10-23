import { Router, type IRouter } from "express";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db, profiles, rides, rideLocations, walletLedger } from "@workspace/db";
import { CreateRideBody, CreateRideResponse, ListRidesResponse, ListAvailableRidesResponse, GetRideParams, GetRideResponse, ActOnRideParams, ActOnRideBody, ActOnRideResponse } from "@workspace/api-zod";
import { requirePabloAuth } from "../middlewares/auth";
import { activeFor, belongsTo, provinces, rideJson, AppError } from "../lib/pablo";
import { calculateFarePiasters, getRoutePreview } from "../lib/routing";

const router: IRouter = Router();
router.use("/rides", requirePabloAuth);

router.get("/rides", async (_req, res): Promise<void> => {
  const userId: string = res.locals.userId;
  const records = await db.select().from(rides).where(belongsTo(userId)).orderBy(desc(rides.createdAt));
  res.json(ListRidesResponse.parse(records.map(r => rideJson(r, false, r.driverId === userId))));
});
router.get("/rides/available", async (_req, res): Promise<void> => {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, res.locals.userId));
  if (profile.role !== "driver" || !profile.onboarded) throw new AppError(403, "كمّل بيانات حساب الكابتن الأول.");
  const [active] = await db.select({ id: rides.id }).from(rides).where(activeFor(profile.id)).limit(1);
  const records = active ? [] : await db.select().from(rides).where(and(eq(rides.status, "pending"), eq(rides.province, profile.province), ne(rides.customerId, profile.id))).orderBy(desc(rides.createdAt)).limit(100);
  res.json(ListAvailableRidesResponse.parse(records.map(r => rideJson(r, true))));
});
router.post("/rides", async (req, res): Promise<void> => {
  const normalized = Object.fromEntries(Object.entries(req.body ?? {}).map(([k,v]) => [k, typeof v === "string" ? v.trim() : v]));
  const parsed = CreateRideBody.safeParse(normalized);
  if (!parsed.success) throw new AppError(400, "راجع مكان الركوب والوجهة والبيانات المطلوبة.");
  const data = parsed.data;
  if (!provinces.includes(data.province)) throw new AppError(400, "اختار محافظة من القائمة.");
  if (data.pickup === data.destination) throw new AppError(400, "مكان الركوب والوجهة لازم يكونوا مختلفين.");
  if (Math.abs(data.pickupLat - data.destinationLat) + Math.abs(data.pickupLng - data.destinationLng) < 0.0001) throw new AppError(400, "اختار نقطتين مختلفتين للركوب والوصول.");
  const route = await getRoutePreview(data);
  const routeDistanceMeters = Math.round(route.distanceMeters);
  const routeDurationSeconds = Math.round(route.durationSeconds);
  const farePiasters = calculateFarePiasters(routeDistanceMeters, routeDurationSeconds);
  const record = await db.transaction(async (tx) => {
    const [profile] = await tx.select().from(profiles).where(eq(profiles.id, res.locals.userId)).for("update");
    if (!profile.onboarded || profile.role !== "customer") throw new AppError(403, "كمّل بياناتك واختار وضع العميل عشان تطلب رحلة.");
    const [active] = await tx.select({ id: rides.id }).from(rides).where(activeFor(profile.id)).limit(1);
    if (active) throw new AppError(409, "عندك رحلة حالية. كمّلها أو الغيها قبل طلب رحلة جديدة.");
    const [ride] = await tx.insert(rides).values({
      ...data,
      customerId: profile.id,
      customerName: profile.name,
      customerPhone: profile.phone,
      routeDistanceMeters,
      routeDurationSeconds,
      farePiasters,
    }).returning();
    return ride;
  });
  res.status(201).json(CreateRideResponse.parse(rideJson(record)));
});
router.get("/rides/:id", async (req, res): Promise<void> => {
  const parsed = GetRideParams.safeParse(req.params);
  if (!parsed.success) throw new AppError(400, "رقم الرحلة غير صحيح.");
  const [ride] = await db.select().from(rides).where(and(eq(rides.id, parsed.data.id), belongsTo(res.locals.userId)));
  if (!ride) throw new AppError(404, "الرحلة غير موجودة.");
  res.json(GetRideResponse.parse(rideJson(ride, false, ride.driverId === res.locals.userId)));
});
router.post("/rides/:id/action", async (req, res): Promise<void> => {
  const params = ActOnRideParams.safeParse(req.params);
  const parsed = ActOnRideBody.safeParse(req.body);
  if (!params.success || !parsed.success) throw new AppError(400, "طلب غير صحيح.");
  const { action, rating } = parsed.data;
  const userId: string = res.locals.userId;
  const result = await db.transaction(async (tx) => {
    // Serialize new assignments per driver, then serialize every state transition per ride.
    const [profile] = await tx.select().from(profiles).where(eq(profiles.id, userId)).for("update");
    const [ride] = await tx.select().from(rides).where(eq(rides.id, params.data.id)).for("update");
    if (!ride) throw new AppError(404, "الرحلة غير موجودة.");
    const customer = ride.customerId === userId;
    const driver = ride.driverId === userId;
    const changes: Partial<typeof rides.$inferInsert> = { updatedAt: new Date() };
    if (action === "accept") {
      if (!profile.onboarded || profile.role !== "driver" || profile.driverReviewStatus !== "approved"
        || !profile.driverTermsAcceptedAt || customer || profile.province !== ride.province) {
        throw new AppError(403, "قبول الرحلات متاح للكابتن بعد مراجعة واعتماد أوراقه وموافقته على الشروط.");
      }
      if (ride.status !== "pending") throw new AppError(409, "الطلب اتقبل أو اتلغى بالفعل.");
      const [active] = await tx.select({ id: rides.id }).from(rides).where(activeFor(userId)).limit(1);
      if (active) throw new AppError(409, "كمّل رحلتك الحالية الأول.");
      if (ride.farePiasters == null) throw new AppError(409, "أجرة الرحلة التقديرية غير متاحة.");
      const [completed] = await tx.select({ count: sql<number>`count(*)::int` }).from(rides)
        .where(and(eq(rides.driverId, userId), eq(rides.status, "completed")));
      const commissionPiasters = Math.round(ride.farePiasters * 0.2);
      if (profile.walletBalancePiasters < commissionPiasters) {
        throw new AppError(402, "رصيد المحفظة مش كافي لحجز عمولة قبول الرحلة. اشحن رصيدك الأول.");
      }
      const balance = profile.walletBalancePiasters - commissionPiasters;
      await tx.update(profiles).set({ walletBalancePiasters: balance }).where(eq(profiles.id, userId));
      await tx.insert(walletLedger).values({
        profileId: userId,
        rideId: ride.id,
        idempotencyKey: `ride:${ride.id}:commission`,
        kind: "commission",
        amountPiasters: -commissionPiasters,
        balanceAfterPiasters: balance,
        note: "حجز عمولة بابلو عند قبول الطلب",
      }).onConflictDoNothing();
      Object.assign(changes, {
        status: "accepted", driverId: userId, driverName: profile.name,
        driverPhone: profile.phone, vehicle: profile.vehicle, plate: profile.plate,
        commissionPiasters, commissionState: "reserved", promoCommissionWaived: completed.count < 2,
      });
    } else {
      if (!customer && !driver) throw new AppError(404, "الرحلة غير موجودة.");
      if (action === "cancel") {
        if (!["pending", "accepted", "arrived"].includes(ride.status)) throw new AppError(409, "مينفعش تلغي الرحلة في المرحلة دي.");
        changes.status = "cancelled";
        if (ride.driverId && ride.commissionState === "reserved" && ride.commissionPiasters) {
          if (customer) {
            const [captain] = await tx.select().from(profiles).where(eq(profiles.id, ride.driverId)).for("update");
            const balance = captain.walletBalancePiasters + ride.commissionPiasters;
            await tx.update(profiles).set({ walletBalancePiasters: balance }).where(eq(profiles.id, captain.id));
            await tx.insert(walletLedger).values({
              profileId: captain.id,
              rideId: ride.id,
              idempotencyKey: `ride:${ride.id}:customer-cancel-refund`,
              kind: "customer_cancel_refund",
              amountPiasters: ride.commissionPiasters,
              balanceAfterPiasters: balance,
              note: "استرداد عمولة بعد إلغاء الراكب",
            }).onConflictDoNothing();
            changes.commissionState = "refunded";
          } else {
            // Captain cancellations retain the already-debited commission.
            changes.commissionState = "retained";
          }
        }
      } else if (action === "rate") {
        if (!customer || ride.status !== "completed" || ride.rating !== null || rating === undefined) throw new AppError(409, "التقييم متاح للعميل مرة واحدة بعد انتهاء الرحلة.");
        changes.rating = rating;
      } else {
        if (!driver) throw new AppError(403, "الإجراء ده متاح للكابتن المعيّن فقط.");
        const transitions = { arrive: ["accepted", "arrived"], start: ["arrived", "in_progress"], complete: ["in_progress", "completed"] } as const;
        const transition = transitions[action];
        if (!transition || ride.status !== transition[0]) throw new AppError(409, "حالة الرحلة اتغيرت. حدّث الصفحة وحاول تاني.");
        changes.status = transition[1];
        if (action === "complete" && ride.commissionState === "reserved" && ride.commissionPiasters && ride.promoCommissionWaived) {
          const [captain] = await tx.select().from(profiles).where(eq(profiles.id, userId)).for("update");
          const balance = captain.walletBalancePiasters + ride.commissionPiasters;
          await tx.update(profiles).set({ walletBalancePiasters: balance }).where(eq(profiles.id, captain.id));
          await tx.insert(walletLedger).values({
            profileId: captain.id,
            rideId: ride.id,
            idempotencyKey: `ride:${ride.id}:promo-refund`,
            kind: "promo_refund",
            amountPiasters: ride.commissionPiasters,
            balanceAfterPiasters: balance,
            note: "إعفاء العمولة عن إحدى أول رحلتين مكتملتين",
          }).onConflictDoNothing();
          changes.commissionState = "waived";
        } else if (action === "complete" && ride.commissionState === "reserved") {
          changes.commissionState = "retained";
        }
      }
    }
    const [updated] = await tx.update(rides).set(changes).where(eq(rides.id, ride.id)).returning();
    if (changes.status === "completed" || changes.status === "cancelled") {
      await tx.delete(rideLocations).where(eq(rideLocations.rideId, ride.id));
    }
    return updated;
  });
  res.json(ActOnRideResponse.parse(rideJson(result, false, result.driverId === userId)));
});
export default router;
