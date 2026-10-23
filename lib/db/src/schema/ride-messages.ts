import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profiles } from "./profiles";
import { rides } from "./rides";

export const rideMessages = pgTable("pablo_ride_messages", {
  id: serial("id").primaryKey(),
  rideId: integer("ride_id").notNull().references(() => rides.id, { onDelete: "cascade" }),
  senderId: text("sender_id").notNull().references(() => profiles.id),
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("pablo_ride_messages_ride_created_idx").on(table.rideId, table.createdAt),
]);

export const insertRideMessageSchema = createInsertSchema(rideMessages).omit({ id: true, createdAt: true });
export type InsertRideMessage = z.infer<typeof insertRideMessageSchema>;
export type RideMessage = typeof rideMessages.$inferSelect;
