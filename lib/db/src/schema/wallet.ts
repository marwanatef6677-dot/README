import { pgTable, serial, text, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { profiles } from "./profiles";

export const walletTopups = pgTable("pablo_wallet_topups", {
  id: serial("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id),
  merchantRefNum: text("merchant_ref_num").notNull().unique(),
  amountPiasters: integer("amount_piasters").notNull(),
  paymentMethod: text("payment_method").notNull(),
  providerRef: text("provider_ref"),
  qrData: text("qr_data"),
  providerStatus: text("provider_status").notNull().default("NEW"),
  status: text("status").notNull().default("pending"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  lastStatusCheckAt: timestamp("last_status_check_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
}, (t) => [
  index("pablo_wallet_topups_profile_idx").on(t.profileId, t.createdAt),
]);

export const walletLedger = pgTable("pablo_wallet_ledger", {
  id: serial("id").primaryKey(),
  profileId: text("profile_id").notNull().references(() => profiles.id),
  rideId: integer("ride_id"),
  topupId: integer("topup_id"),
  idempotencyKey: text("idempotency_key").notNull(),
  kind: text("kind").notNull(),
  amountPiasters: integer("amount_piasters").notNull(),
  balanceAfterPiasters: integer("balance_after_piasters").notNull(),
  note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  uniqueIndex("pablo_wallet_ledger_idempotency_idx").on(t.idempotencyKey),
  index("pablo_wallet_ledger_profile_idx").on(t.profileId, t.createdAt),
]);
