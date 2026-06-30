import { uploadFile, deleteFile } from "./storage";
import { AppError } from "../app/errors";

const BUCKET = "product-images";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/svg+xml",
]);

export interface UploadImageOptions {
  /** Max allowed file size in bytes. Defaults to 5 MB. */
  maxBytes?: number;
  /** Allowed MIME types. Defaults to JPEG/PNG/WebP/GIF/AVIF/SVG. */
  allowedMime?: Set<string>;
}

/**
 * Validates and uploads an image file to Supabase Storage.
 * Returns the public URL of the uploaded file.
 *
 * @param storagePath - Path within the bucket, e.g. "categories/uuid/cover.jpg"
 * @param file        - Multer file object (buffer must be populated)
 */
export async function uploadEntityImage(
  storagePath: string,
  file: Express.Multer.File,
  options: UploadImageOptions = {}
): Promise<string> {
  const { maxBytes = 5 * 1024 * 1024, allowedMime = ALLOWED_MIME } = options;

  if (!allowedMime.has(file.mimetype)) {
    throw new AppError(400, "Unsupported image format. Use JPG, PNG, WebP, GIF, AVIF, or SVG.", "VALIDATION_ERROR");
  }
  if (file.size > maxBytes) {
    throw new AppError(400, `Image exceeds the ${Math.round(maxBytes / 1024 / 1024)} MB size limit.`, "VALIDATION_ERROR");
  }

  return uploadFile(BUCKET, storagePath, file.buffer, file.mimetype);
}

/**
 * Builds a consistent storage path for an entity's image.
 * e.g. buildImagePath("categories", id, "cover", "jpg") → "categories/{id}/cover.jpg"
 */
export function buildImagePath(
  entity: string,
  id: string,
  filename: string,
  file: Express.Multer.File
): string {
  const ext = file.originalname.split(".").pop()?.toLowerCase() ?? "jpg";
  return `${entity}/${id}/${filename}.${ext}`;
}

/**
 * Extracts the storage path from a Supabase public URL.
 * Input:  ".../storage/v1/object/public/{bucket}/{path}"
 * Output: "{path}" or null if not a Supabase storage URL
 */
export function extractStoragePath(url: string): string | null {
  const match = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)/);
  return match?.[1] ?? null;
}

/**
 * Deletes an image at the given public URL if it's a Supabase storage URL.
 * Silently ignores failures (best-effort cleanup).
 */
export async function deleteImageByUrl(url: string): Promise<void> {
  const path = extractStoragePath(url);
  if (path) await deleteFile(BUCKET, path).catch(() => {});
}
