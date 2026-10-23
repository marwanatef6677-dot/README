import { pgTable, text, boolean, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const profiles = pgTable("pablo_profiles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  role: text("role").notNull().default("customer"),
  province: text("province").notNull().default("القاهرة"),
  vehicle: text("vehicle").notNull().default(""),
  vehicleType: text("vehicle_type").notNull().default("car"),
  plate: text("plate").notNull().default(""),
  avatarPhotoPath: text("avatar_photo_path").notNull().default(""),
  captainVehiclePhotoPath: text("captain_vehicle_photo_path").notNull().default(""),
  onboarded: boolean("onboarded").notNull().default(false),
  customerAge18Attested: boolean("customer_age_18_attested").notNull().default(false),
  customerTermsSignature: text("customer_terms_signature").notNull().default(""),
  customerTermsAcceptedAt: timestamp("customer_terms_accepted_at", { withTimezone: true }),
  customerTermsVersion: text("customer_terms_version"),
  walletBalancePiasters: integer("wallet_balance_piasters").notNull().default(0),
  driverReviewStatus: text("driver_review_status").notNull().default("pending"),
  driverTermsAcceptedAt: timestamp("driver_terms_accepted_at", { withTimezone: true }),
  driverTermsVersion: text("driver_terms_version"),
  driverReviewNote: text("driver_review_note").notNull().default(""),
  identityVerified: boolean("identity_verified").notNull().default(false),
  drivingLicenseVerified: boolean("driving_license_verified").notNull().default(false),
  vehicleVerified: boolean("vehicle_verified").notNull().default(false),
  captainPhotoVerified: boolean("captain_photo_verified").notNull().default(false),
  workPermitVerified: boolean("work_permit_verified").notNull().default(false),
  socialInsuranceVerified: boolean("social_insurance_verified").notNull().default(false),
  backgroundCheckCompleted: boolean("background_check_completed").notNull().default(false),
  vehicleRequirementsVerified: boolean("vehicle_requirements_verified").notNull().default(false),
  operatorLicenseVerified: boolean("operator_license_verified").notNull().default(false),
  randomTestProcessConfirmed: boolean("random_test_process_confirmed").notNull().default(false),
  driverReviewedAt: timestamp("driver_reviewed_at", { withTimezone: true }),
  driverReviewedBy: text("driver_reviewed_by"),
});
export const insertProfileSchema = createInsertSchema(profiles);
export type ProfileRecord = typeof profiles.$inferSelect;
