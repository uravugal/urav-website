import { HttpError } from "@/lib/api";
import {
  uploadToS3,
  validateImage,
  isS3Configured,
  deleteFromS3,
  keyFromUrl,
  COURSE_BUCKET,
} from "@/lib/s3";

/**
 * Course thumbnails live in their own public bucket
 * (URAV_AWS_S3_COURSE_BUCKET), under their own prefix — separate from the
 * hero slider and webinar buckets.
 */
export const COURSE_FOLDER = "courses";

export interface CourseImageUpload {
  url: string;
  key: string;
}

/** Upload one course thumbnail. Throws HttpError on a bad file. */
export async function uploadCourseImage(
  file: File
): Promise<CourseImageUpload> {
  const invalid = validateImage({
    type: file.type,
    size: file.size,
    name: file.name,
  });
  if (invalid) throw new HttpError(400, invalid);

  if (!isS3Configured(COURSE_BUCKET)) {
    throw new HttpError(
      503,
      "Course image uploads are not configured on the server yet. Set URAV_AWS_S3_COURSE_BUCKET (or URAV_AWS_S3_BUCKET) and the AWS credentials."
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  return uploadToS3(
    buffer,
    file.name,
    file.type || "image/jpeg",
    COURSE_FOLDER,
    COURSE_BUCKET
  );
}

/** Remove a thumbnail from the bucket. Never throws. */
export async function deleteCourseImage(
  key?: string | null,
  url?: string | null
): Promise<boolean> {
  const resolved = key || keyFromUrl(url, COURSE_BUCKET);
  return deleteFromS3(resolved, COURSE_BUCKET);
}

/** Pull the optional `image` file off a multipart request body. */
export function readCourseImageFile(fd: FormData): File | null {
  const value = fd.get("image");
  return value instanceof File && value.size > 0 ? value : null;
}
