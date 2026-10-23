import { pgTable, text, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const profiles = pgTable("pablo_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  role: text("role").notNull().default("customer"),
  province: text("province").notNull().default("القاهرة"),
  vehicle: text("vehicle").notNull().default(""),
  plate: text("plate").notNull().default(""),
  onboarded: boolean("onboarded").notNull().default(false),
  walletBalancePiasters: integer("wallet_balance_piasters").notNull().default(0),
});
export const insertProfileSchema = createInsertSchema(profiles);
export type ProfileRecord = typeof profiles.$inferSelect;
