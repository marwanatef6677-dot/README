import { Router, type IRouter } from "express";
import { and, desc, eq, gt, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { clerkClient } from "@clerk/express";
import {
  db, profiles, rides, walletLedger, walletTopups,
} from "@workspace/db";
import {
  CreateWalletTopupBody, CreateWalletTopupResponse, GetWalletResponse,
  GetWalletTopupParams, GetWalletTopupResponse,
} from "@workspace/api-zod";
import { requirePabloAuth } from "../middlewares/auth";
import { AppError } from "../lib/pablo";
import {
  createFawryCharge, fawryAmountToPiasters, FawryUncertainError,
  getFawryConfig, getFawryPaymentStatus, verifyFawryNotification,
  type FawryPaymentMethod, type FawryStatus,
} from "../lib/fawry";

const router: IRouter = Router();
const TOPUP_EXPIRY_MS = 30 * 60 * 1000;
const MIN_TOPUP_PIASTERS = 1_000;
const MAX_TOPUP_PIASTERS = 1_000_000;
const FREE_COMPLETED_TRIPS = 2;

function topupJson(row: typeof walletTopups.$inferSelect) {
  return {
    id: row.id,
    amountPiasters: row.amountPiasters,
    paymentMethod: row.paymentMethod as FawryPaymentMethod,
    status: row.status as "pending" | "paid" | "expired" | "failed",
    providerReference: row.providerRef,
    qrData: row.qrData,
    expiresAt: row.expiresAt?.toISOString() ?? null,
  };
}

async function applyFawryStatus(event: FawryStatus, secureKey: string): Promise<void> {
  if (!verifyFawryNotification(event, secureKey)) throw new AppError(400, "إشعار فوري غير صالح.");
  const merchantRef = event.merchantRefNumber ?? event.merchantRefNum;
  if (!merchantRef) throw new AppError(400, "رقم طلب فوري غير موجود.");

  await db.transaction(async (tx) => {
    const [topup] = await tx.select().from(walletTopups)
      .where(eq(walletTopups.merchantRefNum, merchantRef)).for("update");
    if (!topup) throw new AppError(404, "طلب الشحن غير موجود.");

    const normalizedStatus = event.orderStatus?.toUpperCase() ?? "";
    if (topup.status === "paid") return;
    if (topup.status !== "pending") return;

    if (normalizedStatus === "PAID") {
      const amount = fawryAmountToPiasters(event.orderAmount);
      if (amount !== topup.amountPiasters) throw new AppError(400, "المبلغ المؤكد من فوري لا يطابق طلب الشحن.");
      const [profile] = await tx.select().from(profiles)
        .where(eq(profiles.id, topup.profileId)).for("update");
      if (!profile) throw new AppError(404, "حساب الكابتن غير موجود.");
      const balance = profile.walletBalancePiasters + topup.amountPiasters;
      await tx.update(profiles).set({ walletBalancePiasters: balance }).where(eq(profiles.id, profile.id));
      await tx.insert(walletLedger).values({
        profileId: profile.id,
        topupId: topup.id,
        idempotencyKey: `fawry-topup:${topup.id}`,
        kind: "topup",
        amountPiasters: topup.amountPiasters,
        balanceAfterPiasters: balance,
        note: "شحن رصيد عبر فوري",
      }).onConflictDoNothing();
      await tx.update(walletTopups).set({
        status: "paid",
        providerStatus: normalizedStatus,
        providerRef: event.fawryRefNumber ?? topup.providerRef,
        paidAt: new Date(),
      }).where(eq(walletTopups.id, topup.id));
      return;
    }

    const terminalStatus = ["EXPIRED", "CANCELED", "FAILED", "REFUNDED"].includes(normalizedStatus);
    await tx.update(walletTopups).set({
      status: terminalStatus ? (normalizedStatus === "EXPIRED" ? "expired" : "failed") : "pending",
      providerStatus: normalizedStatus || topup.providerStatus,
      providerRef: event.fawryRefNumber ?? topup.providerRef,
    }).where(eq(walletTopups.id, topup.id));
  });
}

router.get("/wallet", requirePabloAuth, async (_req, res): Promise<void> => {
  const userId: string = res.locals.userId;
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  if (profile.role !== "driver") throw new AppError(403, "المحفظة متاحة لحساب الكابتن.");
  const completed = await db.select({ id: rides.id }).from(rides)
    .where(and(eq(rides.driverId, userId), eq(rides.status, "completed")));
  const entries = await db.select().from(walletLedger)
    .where(eq(walletLedger.profileId, userId))
    .orderBy(desc(walletLedger.createdAt)).limit(30);
  res.json(GetWalletResponse.parse({
    balancePiasters: profile.walletBalancePiasters,
    completedTrips: completed.length,
    freeTripsRemaining: Math.max(0, FREE_COMPLETED_TRIPS - completed.length),
    ledger: entries.map((entry) => ({
      kind: entry.kind,
      amountPiasters: entry.amountPiasters,
      balanceAfterPiasters: entry.balanceAfterPiasters,
      note: entry.note,
      createdAt: entry.createdAt.toISOString(),
    })),
  }));
});

router.post("/wallet/topups", requirePabloAuth, async (req, res): Promise<void> => {
  const parsed = CreateWalletTopupBody.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, "اكتب مبلغ شحن بين 10 و10,000 جنيه واختار طريقة الدفع.");
  const { amountPiasters, paymentMethod } = parsed.data;
  if (amountPiasters < MIN_TOPUP_PIASTERS || amountPiasters > MAX_TOPUP_PIASTERS) {
    throw new AppError(400, "مبلغ الشحن لازم يكون بين 10 و10,000 جنيه.");
  }
  const userId: string = res.locals.userId;
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  if (profile.role !== "driver" || !profile.onboarded) throw new AppError(403, "شحن المحفظة متاح للكابتن بعد استكمال الحساب.");
  getFawryConfig();

  const existing = await db.select().from(walletTopups).where(and(
    eq(walletTopups.profileId, userId),
    eq(walletTopups.status, "pending"),
    eq(walletTopups.amountPiasters, amountPiasters),
    eq(walletTopups.paymentMethod, paymentMethod),
    gt(walletTopups.expiresAt, new Date()),
  )).orderBy(desc(walletTopups.createdAt)).limit(1);
  if (existing[0]) {
    res.status(200).json(CreateWalletTopupResponse.parse(topupJson(existing[0])));
    return;
  }

  let email: string;
  try {
    const user = await clerkClient.users.getUser(userId);
    const primary = user.emailAddresses.find((item) => item.id === user.primaryEmailAddressId);
    email = primary?.emailAddress ?? "";
  } catch {
    throw new AppError(503, "تعذر التحقق من بريد حسابك. جرّب تاني بعد شوية.");
  }
  if (!email) throw new AppError(400, "أضف بريدًا إلكترونيًا موثقًا إلى حسابك قبل شحن الرصيد.");

  const merchantRefNum = String(randomInt(1_000_000_000_000, 9_999_999_999_999));
  const expiresAt = new Date(Date.now() + TOPUP_EXPIRY_MS);
  const [topup] = await db.insert(walletTopups).values({
    profileId: userId,
    merchantRefNum,
    amountPiasters,
    paymentMethod,
    expiresAt,
  }).returning();

  try {
    const result = await createFawryCharge({
      merchantRefNum,
      amountPiasters,
      paymentMethod,
      customerName: profile.name,
      customerMobile: profile.phone,
      customerEmail: email,
    });
    const qr = result.walletQr
      ? (result.walletQr.startsWith("data:image/") ? result.walletQr : `data:image/png;base64,${result.walletQr}`)
      : null;
    const [updated] = await db.update(walletTopups).set({
      providerRef: result.referenceNumber ?? result.fawryRefNumber ?? null,
      providerStatus: result.orderStatus ?? "NEW",
      qrData: qr,
    }).where(eq(walletTopups.id, topup.id)).returning();
    res.status(201).json(CreateWalletTopupResponse.parse(topupJson(updated)));
  } catch (error) {
    if (error instanceof FawryUncertainError) {
      req.log.warn({ topupId: topup.id }, "Fawry top-up creation status is uncertain");
      res.status(202).json(CreateWalletTopupResponse.parse(topupJson(topup)));
      return;
    }
    await db.update(walletTopups).set({ status: "failed", providerStatus: "FAILED" })
      .where(and(eq(walletTopups.id, topup.id), eq(walletTopups.status, "pending")));
    throw error;
  }
});

router.get("/wallet/topups/:id", requirePabloAuth, async (req, res): Promise<void> => {
  const parsed = GetWalletTopupParams.safeParse(req.params);
  if (!parsed.success) throw new AppError(400, "رقم طلب الشحن غير صحيح.");
  const userId: string = res.locals.userId;
  const [topup] = await db.select().from(walletTopups).where(and(
    eq(walletTopups.id, parsed.data.id), eq(walletTopups.profileId, userId),
  ));
  if (!topup) throw new AppError(404, "طلب الشحن غير موجود.");

  if (topup.status === "pending" && (!topup.lastStatusCheckAt
    || Date.now() - topup.lastStatusCheckAt.getTime() > 15_000)) {
    const [claimed] = await db.update(walletTopups).set({ lastStatusCheckAt: new Date() })
      .where(and(
        eq(walletTopups.id, topup.id),
        eq(walletTopups.status, "pending"),
      )).returning();
    if (claimed) {
      try {
        const result = await getFawryPaymentStatus(topup.merchantRefNum);
        const key = getFawryConfig().secureKey;
        if (verifyFawryNotification(result, key)) await applyFawryStatus(result, key);
        else req.log.warn({ topupId: topup.id }, "Fawry status signature did not validate");
      } catch (error) {
        req.log.warn({ topupId: topup.id, err: error }, "Unable to refresh Fawry payment status");
      }
    }
  }
  const [fresh] = await db.select().from(walletTopups).where(eq(walletTopups.id, topup.id));
  res.json(GetWalletTopupResponse.parse(topupJson(fresh)));
});

router.post("/fawry/notify", async (req, res): Promise<void> => {
  const event = req.body as FawryStatus;
  let secureKey: string;
  try { secureKey = getFawryConfig().secureKey; }
  catch (error) {
    if (error instanceof AppError) { res.sendStatus(error.status); return; }
    throw error;
  }
  await applyFawryStatus(event, secureKey);
  res.sendStatus(200);
});

export default router;
