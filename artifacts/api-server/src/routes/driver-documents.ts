import { Router, type IRouter, type Request, type Response } from "express";
import { eq } from "drizzle-orm";
import { db, profiles } from "@workspace/db";
import {
  CompleteDriverDocumentUploadBody,
  CompleteDriverDocumentUploadResponse,
  RequestDriverDocumentUploadBody,
  RequestDriverDocumentUploadResponse,
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
  type DriverDocumentType,
} from "../lib/profilePhotoStorage";

const router: IRouter = Router();
const documentTypes = new Set<DriverDocumentType>([
  "driver_license_front",
  "driver_license_back",
  "vehicle_license_front",
  "vehicle_license_back",
]);
type DocumentPathField =
  | "driverLicenseFrontPhotoPath"
  | "driverLicenseBackPhotoPath"
  | "vehicleLicenseFrontPhotoPath"
  | "vehicleLicenseBackPhotoPath";
const pathField: Record<DriverDocumentType, DocumentPathField> = {
  driver_license_front: "driverLicenseFrontPhotoPath",
  driver_license_back: "driverLicenseBackPhotoPath",
  vehicle_license_front: "vehicleLicenseFrontPhotoPath",
  vehicle_license_back: "vehicleLicenseBackPhotoPath",
};

async function streamPrivateDocument(
  file: NonNullable<Awaited<ReturnType<typeof getPrivateProfilePhoto>>>,
  req: Request,
  res: Response,
) {
  const [metadata] = await file.getMetadata();
  const contentType = String(metadata.contentType ?? "application/octet-stream").split(";")[0].toLowerCase();
  if (!(PROFILE_PHOTO_TYPES as readonly string[]).includes(contentType)) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", contentType);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", "inline");
  if (metadata.size) res.setHeader("Content-Length", String(metadata.size));
  const stream = file.createReadStream();
  stream.on("error", (error) => {
    req.log.error({ err: error }, "Failed to stream private captain document");
    if (!res.headersSent) res.status(500).end();
    else res.destroy(error);
  });
  stream.pipe(res);
}

router.post("/storage/driver-documents/request-upload", requirePabloAuth, async (req, res): Promise<void> => {
  const parsed = RequestDriverDocumentUploadBody.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, "بيانات المستند غير صحيحة.");
  const { documentType, size, contentType } = parsed.data;
  if (!documentTypes.has(documentType) || size > MAX_PROFILE_PHOTO_BYTES
    || !(PROFILE_PHOTO_TYPES as readonly string[]).includes(contentType)) {
    throw new AppError(400, "ارفع صورة JPG أو PNG أو WebP بحجم ٥ ميجابايت أو أقل.");
  }
  try {
    const result = await createProfilePhotoUpload(res.locals.userId, documentType);
    res.json(RequestDriverDocumentUploadResponse.parse(result));
  } catch (error) {
    req.log.error({ err: error }, "Failed to create private captain document upload URL");
    throw new AppError(503, "تعذر تجهيز رفع المستند حاليًا. حاول تاني بعد قليل.");
  }
});

router.post("/storage/driver-documents/complete", requirePabloAuth, async (req, res): Promise<void> => {
  const parsed = CompleteDriverDocumentUploadBody.safeParse(req.body);
  if (!parsed.success) throw new AppError(400, "بيانات المستند غير صحيحة.");
  const { documentType, objectPath } = parsed.data;
  const ownerId: string = res.locals.userId;
  const prefix = `/objects/uploads/${ownerId}/${documentType}/`;
  if (!documentTypes.has(documentType) || !objectPath.startsWith(prefix)) {
    throw new AppError(403, "المستند ده مش مخصص لحسابك.");
  }
  const objectId = objectPath.slice(prefix.length);
  if (!/^[0-9a-f-]{36}$/i.test(objectId)) throw new AppError(400, "مسار المستند غير صحيح.");
  const file = await getPrivateProfilePhoto(objectPath);
  if (!file) throw new AppError(400, "المستند لسه ما اترفعش. حاول ترفعه تاني.");
  try {
    await validateProfilePhoto(file);
  } catch (error) {
    try {
      await deletePrivateProfilePhoto(objectPath);
    } catch (cleanupError) {
      req.log.warn({ err: cleanupError }, "Could not remove invalid captain document upload");
    }
    throw new AppError(400, error instanceof Error ? error.message : "ملف المستند غير صالح.");
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, ownerId));
  if (!profile) throw new AppError(404, "الحساب غير موجود.");
  const previousPath = profile[pathField[documentType]];
  const [updated] = await db.update(profiles).set({
    [pathField[documentType]]: objectPath,
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
  }).where(eq(profiles.id, ownerId)).returning();
  if (previousPath && previousPath !== objectPath) {
    try {
      await deletePrivateProfilePhoto(previousPath);
    } catch (error) {
      req.log.warn({ err: error }, "Could not remove replaced private captain document");
    }
  }
  res.json(CompleteDriverDocumentUploadResponse.parse({ documentType, uploaded: Boolean(updated) }));
});

router.get("/storage/admin/drivers/:id/documents/:documentType", requirePabloAuth, requirePabloAdmin, async (req, res): Promise<void> => {
  const driverId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const documentType = Array.isArray(req.params.documentType) ? req.params.documentType[0] : req.params.documentType;
  if (!driverId || !documentType || !documentTypes.has(documentType as DriverDocumentType)) {
    throw new AppError(400, "بيانات المستند غير صحيحة.");
  }
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, driverId));
  if (!profile || profile.role !== "driver") {
    res.status(404).json({ error: "المستند غير موجود." });
    return;
  }
  const filePath = profile[pathField[documentType as DriverDocumentType]];
  const file = filePath ? await getPrivateProfilePhoto(filePath) : null;
  if (!file) {
    res.status(404).json({ error: "المستند غير موجود." });
    return;
  }
  await streamPrivateDocument(file, req, res);
});

export default router;
