import { randomUUID } from "node:crypto";
import { Storage, type File } from "@google-cloud/storage";

const SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
export const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
export const PROFILE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type ProfilePhotoPurpose = "avatar" | "captain_vehicle";
export type DriverDocumentType = "driver_license_front" | "driver_license_back" | "vehicle_license_front" | "vehicle_license_back";
export type PrivateImagePurpose = ProfilePhotoPurpose | DriverDocumentType;

const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

function privateDirectory() {
  const directory = process.env.PRIVATE_OBJECT_DIR?.replace(/\/+$/, "");
  if (!directory) throw new Error("PRIVATE_OBJECT_DIR is not configured.");
  return directory;
}

function parseStoragePath(path: string) {
  const parts = path.replace(/^\/+/, "").split("/");
  if (parts.length < 3 || !parts[0] || !parts.slice(1).join("/")) {
    throw new Error("Invalid private object path.");
  }
  return { bucketName: parts[0], objectName: parts.slice(1).join("/") };
}

export async function createProfilePhotoUpload(
  ownerId: string,
  purpose: PrivateImagePurpose,
) {
  if (!/^[A-Za-z0-9_-]+$/.test(ownerId)) throw new Error("Invalid account id.");
  const entityPath = `uploads/${ownerId}/${purpose}/${randomUUID()}`;
  const { bucketName, objectName } = parseStoragePath(`${privateDirectory()}/${entityPath}`);
  const response = await fetch(`${SIDECAR_ENDPOINT}/object-storage/signed-object-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      bucket_name: bucketName,
      object_name: objectName,
      method: "PUT",
      expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Upload URL signing failed (${response.status}).`);
  const signed = (await response.json()) as { signed_url?: string };
  if (!signed.signed_url) throw new Error("Upload URL was not returned.");
  return { uploadURL: signed.signed_url, objectPath: `/objects/${entityPath}` };
}

export async function getPrivateProfilePhoto(objectPath: string): Promise<File | null> {
  if (!objectPath.startsWith("/objects/uploads/")) return null;
  const entityPath = objectPath.slice("/objects/".length);
  if (entityPath.split("/").some((part) => !part || part === "." || part === "..")) return null;
  const { bucketName, objectName } = parseStoragePath(`${privateDirectory()}/${entityPath}`);
  const file = storage.bucket(bucketName).file(objectName);
  const [exists] = await file.exists();
  return exists ? file : null;
}

export async function validateProfilePhoto(file: File) {
  const [metadata] = await file.getMetadata();
  const size = Number(metadata.size ?? 0);
  const contentType = String(metadata.contentType ?? "").split(";")[0].toLowerCase();
  if (!Number.isSafeInteger(size) || size < 1 || size > MAX_PROFILE_PHOTO_BYTES) {
    throw new Error("حجم الصورة لازم يكون ٥ ميجابايت أو أقل.");
  }
  if (!(PROFILE_PHOTO_TYPES as readonly string[]).includes(contentType)) {
    throw new Error("ارفع صورة بصيغة JPG أو PNG أو WebP.");
  }

  const [bytes] = await file.download();
  const isJpeg = bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng = bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isWebp = bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (
    (contentType === "image/jpeg" && !isJpeg) ||
    (contentType === "image/png" && !isPng) ||
    (contentType === "image/webp" && !isWebp)
  ) {
    throw new Error("محتوى الملف مش مطابق لنوع الصورة.");
  }
  return { size, contentType };
}

export async function deletePrivateProfilePhoto(objectPath: string) {
  const file = await getPrivateProfilePhoto(objectPath);
  if (file) await file.delete({ ignoreNotFound: true });
}
