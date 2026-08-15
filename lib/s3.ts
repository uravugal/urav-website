import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import { cdnBase, keyFromStoredUrl } from "./cdn";

const region = process.env.URAV_AWS_REGION;
const bucket = process.env.URAV_AWS_S3_BUCKET;
const accessKeyId = process.env.URAV_AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.URAV_AWS_SECRET_ACCESS_KEY;

/**
 * Public marketing images live in their own buckets (they are public, while
 * resumes usually are not), one per surface:
 *
 *   URAV_AWS_S3_HERO_BUCKET     — homepage hero slider images ONLY
 *   URAV_AWS_S3_WEBINAR_BUCKET  — webinar cover images
 *
 * If either is unset we fall back to the main bucket and keep the images
 * apart with their own key prefix (`hero/`, `webinars/`).
 */
const heroBucket = process.env.URAV_AWS_S3_HERO_BUCKET || bucket;
const webinarBucket = process.env.URAV_AWS_S3_WEBINAR_BUCKET || bucket;

export const RESUME_BUCKET = bucket;
export const HERO_BUCKET = heroBucket;
export const WEBINAR_BUCKET = webinarBucket;

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!region || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS S3 is not configured. Set URAV_AWS_REGION, URAV_AWS_ACCESS_KEY_ID and URAV_AWS_SECRET_ACCESS_KEY in .env.local (see .env.example)."
    );
  }
  if (!_client) {
    _client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _client;
}

/** True when the given bucket (default: the resume bucket) is usable. */
export function isS3Configured(bucketName = bucket): boolean {
  return Boolean(region && bucketName && accessKeyId && secretAccessKey);
}

/**
 * Public base URL for a bucket — the CloudFront distribution when one is
 * configured (WEBINAR_URL / HERO_URL / RESUME_URL, see lib/cdn.ts).
 *
 * This only decides what gets *written* into MongoDB on a fresh upload. What
 * gets *served* is rebuilt from the key at serialize time, so an existing
 * row is never left pointing at the raw S3 domain.
 */
function publicBase(bucketName: string): string {
  // Checked most-specific first: when a bucket env var is left unset it
  // collapses onto the main bucket, and the wrong CDN base would win.
  if (bucketName === webinarBucket) {
    const base = cdnBase("webinar");
    if (base) return base;
  }
  if (bucketName === heroBucket) {
    const base = cdnBase("hero");
    if (base) return base;
  }
  if (bucketName === bucket) {
    const base = cdnBase("resume");
    if (base) return base;
  }
  return `https://${bucketName}.s3.${region}.amazonaws.com`;
}

export interface UploadResult {
  url: string;
  key: string;
}

/**
 * Upload a file buffer to S3 under the given folder and return its public URL.
 * The URL is what we persist in MongoDB.
 */
export async function uploadToS3(
  buffer: Buffer,
  originalName: string,
  contentType: string,
  folder = "resumes",
  bucketName: string | undefined = bucket
): Promise<UploadResult> {
  if (!bucketName) {
    throw new Error("URAV_AWS_S3_BUCKET is not set.");
  }

  const client = getClient();
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `${folder}/${randomUUID()}-${safeName}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      // Marketing images (hero slides, webinar covers) are static assets —
      // let the CDN hold on to them. Resumes are not cached.
      CacheControl:
        folder === "resumes"
          ? undefined
          : "public, max-age=31536000, immutable",
    })
  );

  return { url: `${publicBase(bucketName)}/${key}`, key };
}

/** Validate an uploaded file is a PDF within the size limit. */
export function validatePdf(
  file: { type: string; size: number; name: string },
  maxBytes = 5 * 1024 * 1024
): string | null {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) return "Only PDF files are allowed.";
  if (file.size > maxBytes)
    return `File is too large. Maximum size is ${Math.round(
      maxBytes / (1024 * 1024)
    )}MB.`;
  return null;
}

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
];

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"];

/** Validate an uploaded file is a web-safe image within the size limit. */
export function validateImage(
  file: { type: string; size: number; name: string },
  maxBytes = 8 * 1024 * 1024
): string | null {
  const name = file.name.toLowerCase();
  const looksLikeImage =
    IMAGE_MIME_TYPES.includes(file.type) ||
    IMAGE_EXTENSIONS.some((ext) => name.endsWith(ext));
  if (!looksLikeImage)
    return "Only JPG, PNG, WebP, AVIF or GIF images are allowed.";
  if (file.size > maxBytes)
    return `Image is too large. Maximum size is ${Math.round(
      maxBytes / (1024 * 1024)
    )}MB.`;
  return null;
}

/* ------------------------------------------------------------------ */
/* Deleting                                                            */
/* ------------------------------------------------------------------ */

/**
 * Recover the object key from a stored public URL.
 *
 * Records created before we started saving `resumeKey` only have the URL,
 * so this lets us still clean the old file out of the bucket. Returns null
 * if the URL doesn't look like it belongs to our bucket.
 */
export function keyFromUrl(
  url?: string | null,
  bucketName: string | undefined = bucket
): string | null {
  if (!url) return null;
  // Slides seeded with the built-in defaults point at /public, not at S3.
  if (url.startsWith("/")) return null;

  // Shared with the read path, so a URL saved before CloudFront and one saved
  // after it both resolve to the same key — deletes keep working either way.
  const key = keyFromStoredUrl(url);
  if (!key) return null;

  // Path-style URL: https://s3.<region>.amazonaws.com/<bucket>/<key>
  if (bucketName && key.startsWith(`${bucketName}/`)) {
    return key.slice(bucketName.length + 1);
  }
  return key;
}

/**
 * Remove an object from the bucket. Never throws — a failed cleanup must
 * not fail the request that replaced the file, so problems are logged and
 * `false` is returned instead.
 */
export async function deleteFromS3(
  key?: string | null,
  bucketName: string | undefined = bucket
): Promise<boolean> {
  if (!key || !bucketName || !isS3Configured(bucketName)) return false;
  try {
    await getClient().send(
      new DeleteObjectCommand({ Bucket: bucketName, Key: key })
    );
    return true;
  } catch (err) {
    console.error("[s3] Could not delete", key, err);
    return false;
  }
}

/**
 * Delete whichever of the two we can resolve — preferring the stored key
 * and falling back to parsing the old URL.
 */
export async function deleteResume(
  resumeKey?: string | null,
  resumeUrl?: string | null
): Promise<boolean> {
  const key = resumeKey || keyFromUrl(resumeUrl);
  return deleteFromS3(key);
}
