import { Router, type IRouter } from "express";
import { desc, isNotNull, sql } from "drizzle-orm";
import { db, rides } from "@workspace/db";
import { GetPabloFeedbackSummaryResponse } from "@workspace/api-zod";
import { requirePabloAuth } from "../middlewares/auth";
import { requirePabloAdmin } from "../middlewares/admin";

const router: IRouter = Router();

router.get("/admin/pablo-feedback", requirePabloAuth, requirePabloAdmin, async (_req, res): Promise<void> => {
  const [aggregate] = await db.select({
    totalRatings: sql<number>`count(*)::int`,
    averageRating: sql<number | null>`round(avg(${rides.pabloRating})::numeric, 1)::float8`,
  }).from(rides).where(isNotNull(rides.pabloRating));

  const entries = await db.select({
    rideId: rides.id,
    customerName: rides.customerName,
    rating: rides.pabloRating,
    comment: rides.pabloFeedbackNote,
    submittedAt: rides.feedbackSubmittedAt,
  }).from(rides)
    .where(isNotNull(rides.pabloRating))
    .orderBy(desc(rides.feedbackSubmittedAt))
    .limit(30);

  res.json(GetPabloFeedbackSummaryResponse.parse({
    totalRatings: aggregate.totalRatings,
    averageRating: aggregate.averageRating == null ? null : Number(aggregate.averageRating),
    recent: entries.map((entry) => ({
      rideId: entry.rideId,
      customerName: entry.customerName,
      rating: entry.rating,
      comment: entry.comment,
      submittedAt: entry.submittedAt?.toISOString() ?? null,
    })),
  }));
});

export default router;
