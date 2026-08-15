import { HttpError } from "@/lib/api";
import {
  uploadToS3,
  validateImage,
  isS3Configured,
  deleteFromS3,
  keyFromUrl,
  HERO_BUCKET,
} from "@/lib/s3";

/**
 * Folder (S3 key prefix) all hero slide images live under.
 *
 * HERO_BUCKET / URAV_AWS_S3_HERO_BUCKET is for the homepage hero slider only —
 * webinar covers use URAV_AWS_S3_WEBINAR_BUCKET (see lib/webinarUploads.ts).
 */
export const HERO_FOLDER = "hero";

export interface HeroImagePair {
  url: string;
  key: string;
}

/**
 * Upload one hero image to the hero bucket.
 * Throws an HttpError with a user-readable message on a bad file.
 */
export async function uploadHeroImage(file: File): Promise<HeroImagePair> {
  const invalid = validateImage({
    type: file.type,
    size: file.size,
    name: file.name,
  });
  if (invalid) throw new HttpError(400, invalid);

  if (!isS3Configured(HERO_BUCKET)) {
    throw new HttpError(
      503,
      "Image uploads are not configured on the server yet. Set URAV_AWS_S3_HERO_BUCKET (or URAV_AWS_S3_BUCKET) and the AWS credentials."
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadToS3(
    buffer,
    file.name,
    file.type || "image/jpeg",
    HERO_FOLDER,
    HERO_BUCKET
  );
}

/**
 * Remove a hero image from the bucket. Never throws — a failed cleanup must
 * not fail the request that replaced it. Local `/public` paths (the built-in
 * defaults) are ignored.
 */
export async function deleteHeroImage(
  key?: string | null,
  url?: string | null
): Promise<boolean> {
  const resolved = key || keyFromUrl(url, HERO_BUCKET);
  return deleteFromS3(resolved, HERO_BUCKET);
}

/**
 * Pull the two optional image files off a multipart request body.
 * Field names: `desktopImage` and `mobileImage`.
 */
export function readHeroImageFiles(fd: FormData): {
  desktop: File | null;
  mobile: File | null;
} {
  const pick = (name: string) => {
    const value = fd.get(name);
    return value instanceof File && value.size > 0 ? value : null;
  };
  return { desktop: pick("desktopImage"), mobile: pick("mobileImage") };
}
