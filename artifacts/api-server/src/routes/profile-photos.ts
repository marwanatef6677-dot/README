import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import {
  db,
  profiles,
  rides,
} from "@workspace/db";
import {
  CompleteProfilePhotoUploadBody,
  CompleteProfilePhotoUploadResponse,
  RequestProfilePhotoUploadBody,
  RequestProfilePhotoUploadResponse,
} from "@workspace/api-zod";
import { requirePabloAuth } from "../middlewares/auth";
import { requirePabloAdmin } from "../middlewares/admin";
import { AppError } from "../lib/pablo";
import {
  createProfilePhotoUpload,
  deletePrivateProfilePhoto,
  getPrivateProfilePhoto,
  MAX_PROFILE_PHOTO_BYTES,
  PROFILE_PHOTO_TYPES,
  validateProfilePhoto,
  type ProfilePhotoPurpose,
} from "../lib/profilePhotoStorage";

const router: IRouter = Router();
const purposes = new Set<ProfilePhotoPurpose>(["avatar", "captain_vehicle"]);

async function streamPhoto(
  file: NonNullable<Awaited<ReturnType<typeof getPrivateProfilePhoto>>>,
  req: Request,
  res: Response,
) {
  const [metadata] = await file.getMetadata();
  const contentType = String(metadata.contentType ?? "application/octet-stream");
  if (!(PROFILE_PHOTO_TYPES as readonly string[]).includes(contentType)) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (metadata.size) res.setHeader("Content-Length", String(metadata.size));
  const stream = file.createReadStream();
  stream.on("error", (error) => {
    req.log.error({ err: error }, "Failed to stream private profile photo");
    if (!res.headersSent) res.status(500).end();
    else res.destroy(error);
  });
  stream.pipe(res);
}

async function sendProfilePhoto(path: string, req: Request, res: Response) {
  if (!path) {
    res.status(404).json({ error: "الصورة غير موجودة." });
    return;
  }
  const file = await getPrivateProfilePhoto(path);
  if (!file) {
    res.status(404).json({ error: "الصورة غير موجودة." });
    return;
  }
  await streamPhoto(file, req, res);
}

router.post("/storage/profile-photos/request-upload", requirePabloAuth, async (req, res): Promise<void> => {
  const parsed = RequestProfilePhotoUploadBody.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, "بيانات الصورة غير صحيحة.");
  const { purpose, size, contentType } = parsed.data;
  if (!purposes.has(purpose) || size > MAX_PROFILE_PHOTO_BYTES || !(PROFILE_PHOTO_TYPES as readonly string[]).includes(contentType)) {
    throw new AppError(400, "ارفع صورة JPG أو PNG أو WebP بحجم ٥ ميجابايت أو أقل.");
  }
  try {
    const result = await createProfilePhotoUpload(res.locals.userId, purpose);
    res.json(RequestProfilePhotoUploadResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Failed to create private profile photo upload URL");
    throw new AppError(503, "تعذر تجهيز رفع الصورة حاليًا. حاول تاني بعد قليل.");
  }
});

router.post("/storage/profile-photos/complete", requirePabloAuth, async (req, res): Promise<void> => {
  const parsed = CompleteProfilePhotoUploadBody.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, "بيانات الصورة غير صحيحة.");
  const { purpose, objectPath } = parsed.data;
  const ownerId: string = res.locals.userId;
  if (!purposes.has(purpose) || !objectPath.startsWith(`/objects/uploads/${ownerId}/${purpose}/`)) {
    throw new AppError(403, "الصورة دي مش مخصصة لحسابك.");
  }
  const imageId = objectPath.slice(`/objects/uploads/${ownerId}/${purpose}/`.length);
  if (!/^[0-9a-f-]{36}$/i.test(imageId)) throw new AppError(400, "مسار الصورة غير صحيح.");
  const file = await getPrivateProfilePhoto(objectPath);
  if (!file) throw new AppError(400, "الصورة لسه ما اترفعتش. حاول ترفعها تاني.");
  try {
    await validateProfilePhoto(file);
  } catch (error) {
    try {
      await deletePrivateProfilePhoto(objectPath);
    } catch (cleanupError) {
      req.log.warn({ err: cleanupError }, "Could not remove invalid profile photo upload");
    }
    throw new AppError(400, error instanceof Error ? error.message : "ملف الصورة غير صالح.");
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, ownerId));
  if (!profile) throw new AppError(404, "الحساب غير موجود.");
  const oldPath = purpose === "avatar" ? profile.avatarPhotoPath : profile.captainVehiclePhotoPath;
  const patch = purpose === "avatar"
    ? { avatarPhotoPath: objectPath }
    : {
        captainVehiclePhotoPath: objectPath,
        ...(profile.role === "driver" ? {
          driverReviewStatus: "pending",
          driverReviewNote: "",
          driverReviewedAt: null,
          driverReviewedBy: null,
          captainPhotoVerified: false,
          identityVerified: false,
          drivingLicenseVerified: false,
          vehicleVerified: false,
          workPermitVerified: false,
          socialInsuranceVerified: false,
          backgroundCheckCompleted: false,
          vehicleRequirementsVerified: false,
          operatorLicenseVerified: false,
          randomTestProcessConfirmed: false,
        } : {}),
      };
  const [updated] = await db.update(profiles).set(patch).where(eq(profiles.id, ownerId)).returning();
  if (oldPath && oldPath !== objectPath) {
    try {
      await deletePrivateProfilePhoto(oldPath);
    } catch (error) {
      req.log.warn({ err: error }, "Could not remove replaced private profile photo");
    }
  }
  res.json(CompleteProfilePhotoUploadResponse.parse({
    hasAvatarPhoto: Boolean(updated.avatarPhotoPath),
    hasCaptainVehiclePhoto: Boolean(updated.captainVehiclePhotoPath),
  }));
});

router.get("/storage/profile-photos/me/avatar", requirePabloAuth, async (req, res): Promise<void> => {
  const [profile] = await db.select({ path: profiles.avatarPhotoPath }).from(profiles).where(eq(profiles.id, res.locals.userId));
  await sendProfilePhoto(profile?.path ?? "", req, res);
});

router.get("/storage/profile-photos/me/vehicle", requirePabloAuth, async (req, res): Promise<void> => {
  const [profile] = await db.select({ path: profiles.captainVehiclePhotoPath }).from(profiles).where(eq(profiles.id, res.locals.userId));
  await sendProfilePhoto(profile?.path ?? "", req, res);
});

router.get("/storage/admin/drivers/:id/vehicle-photo", requirePabloAuth, requirePabloAdmin, async (req, res): Promise<void> => {
  const driverId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  if (!driverId) throw new AppError(400, "رقم الكابتن غير صحيح.");
  const [profile] = await db.select({ path: profiles.captainVehiclePhotoPath })
    .from(profiles)
    .where(and(eq(profiles.id, driverId), eq(profiles.role, "driver")));
  await sendProfilePhoto(profile?.path ?? "", req, res);
});

router.get("/storage/rides/:id/driver-photo", requirePabloAuth, async (req: Request, res: Response): Promise<void> => {
  const rideId = Number(req.params.id);
  if (!Number.isSafeInteger(rideId) || rideId <= 0) throw new AppError(400, "رقم الرحلة غير صحيح.");
  const userId: string = res.locals.userId;
  const [ride] = await db.select().from(rides).where(eq(rides.id, rideId));
  if (!ride || (ride.customerId !== userId && ride.driverId !== userId) || !ride.driverId) {
    throw new AppError(404, "الصورة غير متاحة للرحلة دي.");
  }
  const [driver] = await db.select({ path: profiles.captainVehiclePhotoPath })
    .from(profiles)
    .where(eq(profiles.id, ride.driverId));
  await sendProfilePhoto(driver?.path ?? "", req, res);
});

export default router;
