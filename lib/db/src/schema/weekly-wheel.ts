import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { profiles } from "./profiles";

export const weeklyWheelSpins = pgTable("pablo_weekly_wheel_spins", {
  id: serial("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id),
  outcome: text("outcome").notNull(),
  discountPercent: integer("discount_percent"),
  promoCode: text("promo_code"),
  spunAt: timestamp("spun_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  redeemedAt: timestamp("redeemed_at", { withTimezone: true }),
  redeemedRideId: integer("redeemed_ride_id"),
}, (t) => [
  uniqueIndex("pablo_weekly_wheel_promo_code_idx").on(t.promoCode),
  index("pablo_weekly_wheel_profile_spin_idx").on(t.profileId, t.spunAt),
]);

export const insertWeeklyWheelSpinSchema = createInsertSchema(weeklyWheelSpins).omit({
  id: true,
  spunAt: true,
  redeemedAt: true,
  redeemedRideId: true,
});
export type InsertWeeklyWheelSpin = z.infer<typeof insertWeeklyWheelSpinSchema>;
export type WeeklyWheelSpinRecord = typeof weeklyWheelSpins.$inferSelect;
