import { sql } from "drizzle-orm";
import { pgTable, text, serial, timestamp, integer, doublePrecision, boolean, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { profiles } from "./profiles";
import { weeklyWheelSpins } from "./weekly-wheel";

export const rides = pgTable("pablo_rides", {
  id: serial("id").primaryKey(),
  customerId: text("customer_id").notNull().references(() => profiles.id),
  driverId: text("driver_id").references(() => profiles.id),
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  driverName: text("driver_name"),
  driverPhone: text("driver_phone"),
  vehicle: text("vehicle"),
  plate: text("plate"),
  pickup: text("pickup").notNull(),
  destination: text("destination").notNull(),
  province: text("province").notNull(),
  rideType: text("ride_type").notNull(),
  serviceType: text("service_type").notNull().default("passenger"),
  deliveryDescription: text("delivery_description").notNull().default(""),
  recipientName: text("recipient_name").notNull().default(""),
  recipientPhone: text("recipient_phone").notNull().default(""),
  status: text("status").notNull().default("pending"),
  notes: text("notes").notNull().default(""),
  pickupLat: doublePrecision("pickup_lat"),
  pickupLng: doublePrecision("pickup_lng"),
  destinationLat: doublePrecision("destination_lat"),
  destinationLng: doublePrecision("destination_lng"),
  routeDistanceMeters: integer("route_distance_meters"),
  routeDurationSeconds: integer("route_duration_seconds"),
  estimatedFarePiasters: integer("estimated_fare_piasters"),
  farePiasters: integer("fare_piasters"),
  promoSpinId: integer("promo_spin_id").references(() => weeklyWheelSpins.id),
  customerDiscountPercent: integer("customer_discount_percent").notNull().default(0),
  customerDiscountPiasters: integer("customer_discount_piasters").notNull().default(0),
  commissionPiasters: integer("commission_piasters"),
  commissionState: text("commission_state"),
  promoCommissionWaived: boolean("promo_commission_waived").notNull().default(false),
  checkInStatus: text("check_in_status"),
  rating: integer("rating"),
  captainRating: integer("captain_rating"),
  drivingRating: integer("driving_rating"),
  cleanlinessRating: integer("cleanliness_rating"),
  comfortRating: integer("comfort_rating"),
  airConditioningRating: integer("air_conditioning_rating"),
  feedbackNote: text("feedback_note").notNull().default(""),
  pabloRating: integer("pablo_rating"),
  pabloFeedbackNote: text("pablo_feedback_note").notNull().default(""),
  feedbackSubmittedAt: timestamp("feedback_submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("pablo_rides_customer_idx").on(t.customerId),
  index("pablo_rides_driver_idx").on(t.driverId),
  index("pablo_rides_queue_idx").on(t.status, t.province),
  uniqueIndex("pablo_rides_active_promo_spin_idx").on(t.promoSpinId)
    .where(sql`${t.promoSpinId} is not null and ${t.status} <> 'cancelled'`),
]);
export const insertRideSchema = createInsertSchema(rides).omit({ id: true, createdAt: true, updatedAt: true });
export type RideRecord = typeof rides.$inferSelect;
