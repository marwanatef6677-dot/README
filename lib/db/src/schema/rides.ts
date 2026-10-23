import { pgTable, text, serial, timestamp, integer, doublePrecision, boolean, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { profiles } from "./profiles";

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
  status: text("status").notNull().default("pending"),
  notes: text("notes").notNull().default(""),
  pickupLat: doublePrecision("pickup_lat"),
  pickupLng: doublePrecision("pickup_lng"),
  destinationLat: doublePrecision("destination_lat"),
  destinationLng: doublePrecision("destination_lng"),
  routeDistanceMeters: integer("route_distance_meters"),
  routeDurationSeconds: integer("route_duration_seconds"),
  farePiasters: integer("fare_piasters"),
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
  feedbackSubmittedAt: timestamp("feedback_submitted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("pablo_rides_customer_idx").on(t.customerId),
  index("pablo_rides_driver_idx").on(t.driverId),
  index("pablo_rides_queue_idx").on(t.status, t.province),
]);
export const insertRideSchema = createInsertSchema(rides).omit({ id: true, createdAt: true, updatedAt: true });
export type RideRecord = typeof rides.$inferSelect;
