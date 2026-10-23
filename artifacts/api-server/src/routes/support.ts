import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import {
  CreateSupportTicketBody,
  CreateSupportTicketResponse,
  ListAdminSupportTicketsResponse,
  ListSupportTicketsResponse,
  UpdateAdminSupportTicketBody,
  UpdateAdminSupportTicketParams,
  UpdateAdminSupportTicketResponse,
} from "@workspace/api-zod";
import { db, profiles, rides, supportTickets } from "@workspace/db";
import { requirePabloAdmin } from "../middlewares/admin";
import { requirePabloAuth } from "../middlewares/auth";
import { AppError } from "../lib/pablo";

const router: IRouter = Router();

function customerTicketJson(ticket: typeof supportTickets.$inferSelect) {
  return {
    id: ticket.id,
    category: ticket.category,
    subject: ticket.subject,
    description: ticket.description,
    rideId: ticket.rideId,
    status: ticket.status,
      customerReply: ticket.customerReply,
    createdAt: ticket.createdAt.toISOString(),
    updatedAt: ticket.updatedAt.toISOString(),
  };
}

function adminTicketJson(
  ticket: typeof supportTickets.$inferSelect,
  customer: { name: string; phone: string },
) {
  return {
    ...customerTicketJson(ticket),
    ownerNote: ticket.ownerNote,
    customerName: customer.name,
    customerPhone: customer.phone,
  };
}

router.use("/support", requirePabloAuth);

router.get("/support/tickets", async (_req, res): Promise<void> => {
  const userId: string = res.locals.userId;
  const [profile] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, userId));
  if (profile?.role !== "customer") throw new AppError(403, "بلاغات الدعم متاحة لحسابات العملاء فقط.");

  const tickets = await db.select().from(supportTickets)
    .where(eq(supportTickets.customerId, userId))
    .orderBy(desc(supportTickets.createdAt));
  res.json(ListSupportTicketsResponse.parse(tickets.map(customerTicketJson)));
});

router.post("/support/tickets", async (req, res): Promise<void> => {
  const parsed = CreateSupportTicketBody.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, "راجع نوع المشكلة وعنوان البلاغ وتفاصيله.");

  const userId: string = res.locals.userId;
  const [profile] = await db.select({ role: profiles.role }).from(profiles).where(eq(profiles.id, userId));
  if (profile?.role !== "customer") throw new AppError(403, "تسجيل بلاغ الدعم متاح لحسابات العملاء فقط.");

  if (parsed.data.rideId !== null) {
    const [ride] = await db.select({ id: rides.id }).from(rides)
      .where(and(eq(rides.id, parsed.data.rideId), eq(rides.customerId, userId)));
    if (!ride) throw new AppError(404, "الرحلة المحددة غير موجودة في حسابك.");
  }

  const [ticket] = await db.insert(supportTickets).values({
    customerId: userId,
    rideId: parsed.data.rideId,
    category: parsed.data.category,
    subject: parsed.data.subject.trim(),
    description: parsed.data.description.trim(),
  }).returning();

  res.status(201).json(CreateSupportTicketResponse.parse(customerTicketJson(ticket)));
});

router.use("/admin/support-tickets", requirePabloAuth, requirePabloAdmin);

router.get("/admin/support-tickets", async (_req, res): Promise<void> => {
  const rows = await db.select({
    ticket: supportTickets,
    customerName: profiles.name,
    customerPhone: profiles.phone,
  })
    .from(supportTickets)
    .innerJoin(profiles, eq(supportTickets.customerId, profiles.id))
    .orderBy(desc(supportTickets.createdAt));

  res.json(ListAdminSupportTicketsResponse.parse(rows.map(({ ticket, customerName, customerPhone }) =>
    adminTicketJson(ticket, { name: customerName, phone: customerPhone }),
  )));
});

router.patch("/admin/support-tickets/:id", async (req, res): Promise<void> => {
  const params = UpdateAdminSupportTicketParams.safeParse(req.params);
  const parsed = UpdateAdminSupportTicketBody.safeParse(req.body);
  if (!params.success || !parsed.success) throw new AppError(400, "بيانات تحديث البلاغ غير صحيحة.");

  const [ticket] = await db.update(supportTickets).set({
    status: parsed.data.status,
    ownerNote: parsed.data.ownerNote.trim(),
    customerReply: parsed.data.customerReply.trim(),
    updatedAt: new Date(),
  }).where(eq(supportTickets.id, params.data.id)).returning();
  if (!ticket) throw new AppError(404, "البلاغ غير موجود.");

  const [customer] = await db.select({ name: profiles.name, phone: profiles.phone })
    .from(profiles)
    .where(eq(profiles.id, ticket.customerId));
  if (!customer) throw new AppError(404, "حساب العميل المرتبط بالبلاغ غير موجود.");

  res.json(UpdateAdminSupportTicketResponse.parse(adminTicketJson(ticket, customer)));
});

export default router;
