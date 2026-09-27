import { HttpError } from "@/lib/api";
import {
  uploadToS3,
  validateImage,
  isS3Configured,
  deleteFromS3,
  keyFromUrl,
  SERVICE_BUCKET,
} from "@/lib/s3";

/**
 * Service thumbnails live in their own public bucket
 * (URAV_AWS_S3_SERVICE_BUCKET), under their own prefix — separate from the
 * hero slider, webinar and course buckets.
 */
export const SERVICE_FOLDER = "services";

export interface ServiceImageUpload {
  url: string;
  key: string;
}

/** Upload one service thumbnail. Throws HttpError on a bad file. */
export async function uploadServiceImage(
  file: File
): Promise<ServiceImageUpload> {
  const invalid = validateImage({
    type: file.type,
    size: file.size,
    name: file.name,
  });
  if (invalid) throw new HttpError(400, invalid);

  if (!isS3Configured(SERVICE_BUCKET)) {
    throw new HttpError(
      503,
      "Service image uploads are not configured on the server yet. Set URAV_AWS_S3_SERVICE_BUCKET (or URAV_AWS_S3_BUCKET) and the AWS credentials."
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadToS3(
    buffer,
    file.name,
    file.type || "image/jpeg",
    SERVICE_FOLDER,
    SERVICE_BUCKET
  );
}

/** Remove a thumbnail from the bucket. Never throws. */
export async function deleteServiceImage(
  key?: string | null,
  url?: string | null
): Promise<boolean> {
  const resolved = key || keyFromUrl(url, SERVICE_BUCKET);
  return deleteFromS3(resolved, SERVICE_BUCKET);
}

/** Pull the optional `image` file off a multipart request body. */
export function readServiceImageFile(fd: FormData): File | null {
  const value = fd.get("image");
  return value instanceof File && value.size > 0 ? value : null;
}
