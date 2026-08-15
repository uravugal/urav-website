import { HttpError } from "@/lib/api";
import {
  uploadToS3,
  validateImage,
  isS3Configured,
  deleteFromS3,
  keyFromUrl,
  WEBINAR_BUCKET,
} from "@/lib/s3";

/**
 * Webinar covers live in their own public bucket (URAV_AWS_S3_WEBINAR_BUCKET),
 * under their own prefix. The hero bucket is reserved for the homepage
 * slider — do not upload webinar images there.
 */
export const WEBINAR_FOLDER = "webinars";

export interface WebinarImageUpload {
  url: string;
  key: string;
}

/** Upload one webinar cover image. Throws HttpError on a bad file. */
export async function uploadWebinarImage(
  file: File
): Promise<WebinarImageUpload> {
  const invalid = validateImage({
    type: file.type,
    size: file.size,
    name: file.name,
  });
  if (invalid) throw new HttpError(400, invalid);

  if (!isS3Configured(WEBINAR_BUCKET)) {
    throw new HttpError(
      503,
      "Webinar image uploads are not configured on the server yet. Set URAV_AWS_S3_WEBINAR_BUCKET (or URAV_AWS_S3_BUCKET) and the AWS credentials."
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadToS3(
    buffer,
    file.name,
    file.type || "image/jpeg",
    WEBINAR_FOLDER,
    WEBINAR_BUCKET
  );
}

/** Remove a cover image from the bucket. Never throws. */
export async function deleteWebinarImage(
  key?: string | null,
  url?: string | null
): Promise<boolean> {
  const resolved = key || keyFromUrl(url, WEBINAR_BUCKET);
  return deleteFromS3(resolved, WEBINAR_BUCKET);
}

/** Pull the optional `image` file off a multipart request body. */
export function readWebinarImageFile(fd: FormData): File | null {
  const value = fd.get("image");
  return value instanceof File && value.size > 0 ? value : null;
}
