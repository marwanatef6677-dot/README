import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, rideLocations, rides } from "@workspace/db";
import {
  GetRideLocationParams, GetRideLocationResponse,
  UpdateRideLocationBody, UpdateRideLocationParams, UpdateRideLocationResponse,
  StopRideTrackingParams,
} from "@workspace/api-zod";
import { requirePabloAuth } from "../middlewares/auth";
import { AppError, belongsTo } from "../lib/pablo";

const router: IRouter = Router();
const shareable = ["accepted", "arrived", "in_progress"];

router.get("/rides/:id/location", requirePabloAuth, async (req, res): Promise<void> => {
  const params = GetRideLocationParams.safeParse(req.params);
  if (!params.success) throw new AppError(400, "رقم الرحلة غير صحيح.");
  // One joined snapshot means a terminal trip can never return a live position.
  const [record] = await db.select({ ride: rides, location: rideLocations }).from(rides)
    .leftJoin(rideLocations, eq(rides.id, rideLocations.rideId))
    .where(and(eq(rides.id, params.data.id), belongsTo(res.locals.userId)));
  if (!record) throw new AppError(404, "الرحلة غير موجودة.");
  const location = shareable.includes(record.ride.status) ? record.location : null;
  // Keep a stale point briefly so the UI can explicitly mark it out of date.
  const freshEnough = location && Date.now() - location.updatedAt.getTime() < 120_000;
  res.json(GetRideLocationResponse.parse({
    location: freshEnough ? { ...location, updatedAt: location.updatedAt.toISOString() } : null,
  }));
});
router.put("/rides/:id/location", requirePabloAuth, async (req, res): Promise<void> => {
  const params = UpdateRideLocationParams.safeParse(req.params);
  const parsed = UpdateRideLocationBody.safeParse(req.body);
  if (!params.success || !parsed.success) throw new AppError(400, "بيانات الموقع غير صحيحة.");
  const location = await db.transaction(async (tx) => {
    // Same ride lock as terminal transitions: no location can survive trip completion.
    const [ride] = await tx.select().from(rides).where(eq(rides.id, params.data.id)).for("update");
    if (!ride || ride.driverId !== res.locals.userId) throw new AppError(404, "الرحلة غير موجودة.");
    if (!shareable.includes(ride.status)) throw new AppError(409, "مشاركة الموقع متاحة أثناء الرحلة فقط.");
    const data = { ...parsed.data, updatedAt: new Date() };
    const [saved] = await tx.insert(rideLocations).values({ rideId: ride.id, ...data })
      .onConflictDoUpdate({ target: rideLocations.rideId, set: data }).returning();
    return saved;
  });
  res.json(UpdateRideLocationResponse.parse({ location: { ...location, updatedAt: location.updatedAt.toISOString() } }));
});
router.delete("/rides/:id/location", requirePabloAuth, async (req, res): Promise<void> => {
  const params = StopRideTrackingParams.safeParse(req.params);
  if (!params.success) throw new AppError(400, "رقم الرحلة غير صحيح.");
  await db.transaction(async (tx) => {
    const [ride] = await tx.select().from(rides).where(eq(rides.id, params.data.id)).for("update");
    if (!ride || ride.driverId !== res.locals.userId) throw new AppError(404, "الرحلة غير موجودة.");
    await tx.delete(rideLocations).where(eq(rideLocations.rideId, ride.id));
  });
  res.sendStatus(204);
});
export default router;
