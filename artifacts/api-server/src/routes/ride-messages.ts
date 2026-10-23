import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, rideMessages, rides } from "@workspace/db";
import {
  ListRideMessagesParams,
  ListRideMessagesResponse,
  SendRideMessageBody,
  SendRideMessageParams,
  SendRideMessageResponse,
} from "@workspace/api-zod";
import { requirePabloAuth } from "../middlewares/auth";
import { AppError } from "../lib/pablo";

const router: IRouter = Router();
const activeChatStates = ["accepted", "arrived", "in_progress"];

async function getParticipantRide(rideId: number, userId: string) {
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId));
  if (!ride || (ride.customerId !== userId && ride.driverId !== userId)) {
    throw new AppError(404, "الرحلة غير موجودة.");
  }
  if (!ride.driverId) throw new AppError(409, "الدردشة هتظهر بعد ما كابتن يقبل الطلب.");
  return ride;
}

router.get("/rides/:id/messages", requirePabloAuth, async (req, res): Promise<void> => {
  const params = ListRideMessagesParams.safeParse(req.params);
  if (!params.success) throw new AppError(400, "رقم الرحلة غير صحيح.");
  await getParticipantRide(params.data.id, res.locals.userId);
  const records = await db.select().from(rideMessages)
    .where(eq(rideMessages.rideId, params.data.id))
    .orderBy(desc(rideMessages.createdAt), desc(rideMessages.id))
    .limit(100);
  res.json(ListRideMessagesResponse.parse(records.reverse().map((message) => ({
    ...message,
    createdAt: message.createdAt.toISOString(),
  }))));
});

router.post("/rides/:id/messages", requirePabloAuth, async (req, res): Promise<void> => {
  const params = SendRideMessageParams.safeParse(req.params);
  const body = SendRideMessageBody.safeParse({
    ...(req.body ?? {}),
    message: typeof req.body?.message === "string" ? req.body.message.trim() : req.body?.message,
  });
  if (!params.success || !body.success) throw new AppError(400, "اكتب رسالة صحيحة.");
  const ride = await getParticipantRide(params.data.id, res.locals.userId);
  if (!activeChatStates.includes(ride.status)) throw new AppError(409, "الدردشة متاحة أثناء الرحلة النشطة فقط.");

  const senderId: string = res.locals.userId;
  const [saved] = await db.insert(rideMessages).values({
    rideId: ride.id,
    senderId,
    senderName: senderId === ride.customerId ? ride.customerName : ride.driverName ?? "الكابتن",
    message: body.data.message,
  }).returning();

  res.status(201).json(SendRideMessageResponse.parse({
    ...saved,
    createdAt: saved.createdAt.toISOString(),
  }));
});

export default router;
