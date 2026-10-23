import { createInsertSchema } from "drizzle-zod";
import { index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";
import { rides } from "./rides";

export const supportTickets = pgTable(
  "pablo_support_tickets",
  {
    id: serial("id").primaryKey(),
    customerId: text("customer_id").notNull().references(() => profiles.id),
    rideId: integer("ride_id").references(() => rides.id, { onDelete: "set null" }),
    category: text("category").notNull(),
    subject: text("subject").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull().default("open"),
    ownerNote: text("owner_note").notNull().default(""),
  customerReply: text("customer_reply").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("pablo_support_tickets_customer_idx").on(table.customerId, table.createdAt),
    index("pablo_support_tickets_status_idx").on(table.status, table.createdAt),
  ],
);

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type SupportTicketRecord = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;
