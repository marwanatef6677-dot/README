import { randomBytes, randomInt } from "node:crypto";
import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { db, profiles, weeklyWheelSpins } from "@workspace/db";
import { GetWeeklyWheelResponse, SpinWeeklyWheelResponse } from "@workspace/api-zod";
import { requirePabloAuth } from "../middlewares/auth";
import { AppError, hasCurrentCustomerTerms } from "../lib/pablo";

const router: IRouter = Router();
router.use(requirePabloAuth);

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DRAW_SIZE = 100_000;

function drawDiscountPercent(): number | null {
  const ticket = randomInt(DRAW_SIZE);
  if (ticket < 52_800) return null; // 52.8%: better luck next time
  if (ticket < 72_800) return 3; // 20%
  if (ticket < 82_800) return 4; // 10%
  if (ticket < 92_800) return 5 + randomInt(5); // 5-9%, 2% each
  if (ticket < 97_800) return 10 + randomInt(10); // 10-19%, 0.5% each
  return 20 + randomInt(11); // 20-30%, 0.2% each
}

async function requireCustomer(userId: string) {
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, userId));
  if (!profile || !profile.onboarded || profile.role !== "customer" || !hasCurrentCustomerTerms(profile)) {
    throw new AppError(403, "عجلة الخصم متاحة لحساب العميل بعد إكمال البيانات والموافقة على الشروط.");
  }
  return profile;
}

router.get("/rewards/weekly-wheel", async (_req, res): Promise<void> => {
  const profile = await requireCustomer(res.locals.userId);
  const now = new Date();
  const [last] = await db.select().from(weeklyWheelSpins)
    .where(eq(weeklyWheelSpins.profileId, profile.id))
    .orderBy(desc(weeklyWheelSpins.spunAt))
    .limit(1);
  const nextAvailableAt = last ? new Date(last.spunAt.getTime() + WEEK_MS) : null;
  const canSpin = nextAvailableAt === null || nextAvailableAt.getTime() <= now.getTime();
  const [active] = await db.select().from(weeklyWheelSpins).where(and(
    eq(weeklyWheelSpins.profileId, profile.id),
    eq(weeklyWheelSpins.outcome, "win"),
    isNull(weeklyWheelSpins.redeemedAt),
    gt(weeklyWheelSpins.expiresAt, now),
  )).orderBy(desc(weeklyWheelSpins.spunAt)).limit(1);

  res.json(GetWeeklyWheelResponse.parse({
    canSpin,
    nextSpinAt: canSpin ? null : nextAvailableAt?.toISOString() ?? null,
    lastSpin: last ? {
      outcome: last.outcome,
      discountPercent: last.discountPercent,
      promoCode: last.redeemedAt || !last.expiresAt || last.expiresAt <= now ? null : last.promoCode,
      spunAt: last.spunAt.toISOString(),
      expiresAt: last.expiresAt?.toISOString() ?? null,
      redeemed: last.redeemedAt !== null,
    } : null,
    activePromo: active && active.promoCode && active.discountPercent != null && active.expiresAt ? {
      promoCode: active.promoCode,
      discountPercent: active.discountPercent,
      expiresAt: active.expiresAt.toISOString(),
    } : null,
  }));
});

router.post("/rewards/weekly-wheel/spin", async (_req, res): Promise<void> => {
  const result = await db.transaction(async (tx) => {
    const [profile] = await tx.select().from(profiles)
      .where(eq(profiles.id, res.locals.userId))
      .for("update");
    if (!profile || !profile.onboarded || profile.role !== "customer" || !hasCurrentCustomerTerms(profile)) {
      throw new AppError(403, "عجلة الخصم متاحة لحساب العميل بعد إكمال البيانات والموافقة على الشروط.");
    }

    const [last] = await tx.select().from(weeklyWheelSpins)
      .where(eq(weeklyWheelSpins.profileId, profile.id))
      .orderBy(desc(weeklyWheelSpins.spunAt))
      .limit(1);
    const now = new Date();
    const nextSpinAt = last ? new Date(last.spunAt.getTime() + WEEK_MS) : new Date(now.getTime() + WEEK_MS);
    if (last && nextSpinAt.getTime() > now.getTime()) {
      throw new AppError(409, "لفيت العجلة الأسبوع ده. ارجع بعد موعد اللفة الجاية الظاهر في الصفحة.");
    }

    const discountPercent = drawDiscountPercent();
    const promoCode = discountPercent === null
      ? null
      : `PABLO-${randomBytes(12).toString("hex").toUpperCase()}`;
    const expiresAt = discountPercent === null ? null : new Date(now.getTime() + WEEK_MS);
    const [spin] = await tx.insert(weeklyWheelSpins).values({
      profileId: profile.id,
      outcome: discountPercent === null ? "no_win" : "win",
      discountPercent,
      promoCode,
      spunAt: now,
      expiresAt,
    }).returning();

    return {
      outcome: spin.outcome,
      discountPercent: spin.discountPercent,
      promoCode: spin.promoCode,
      spunAt: spin.spunAt.toISOString(),
      expiresAt: spin.expiresAt?.toISOString() ?? null,
      nextSpinAt: nextSpinAt.toISOString(),
    };
  });
  res.status(201).json(SpinWeeklyWheelResponse.parse(result));
});

export default router;
