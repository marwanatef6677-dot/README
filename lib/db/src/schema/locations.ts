import { pgTable, integer, doublePrecision, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { rides } from "./rides";

// Only the latest shared point is retained, never a history of movement.
export const rideLocations = pgTable("pablo_ride_locations", {
  rideId: integer("ride_id").primaryKey().references(() => rides.id, { onDelete: "cascade" }),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  accuracy: doublePrecision("accuracy").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertRideLocationSchema = createInsertSchema(rideLocations);
export type RideLocationRecord = typeof rideLocations.$inferSelect;
