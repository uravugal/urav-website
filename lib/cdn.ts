/**
 * CloudFront URL resolution.
 *
 * MongoDB stores two things per uploaded file: the S3 object **key** and the
 * public **URL** that was correct at the time of the upload. The key is the
 * stable identity — the URL is not. Putting a bucket behind CloudFront (or
 * changing the distribution later) invalidates the URL on every existing row.
 *
 * So the URL is rebuilt on the way out of the API as `<CDN base>/<key>`, and
 * the stored one is only a fallback. Rows written before CloudFront existed
 * start serving through the CDN with no data migration: their key is already
 * there, and where it isn't (older resumes, application snapshots) the key is
 * recovered from the old S3 URL's path.
 *
 * Env — the CloudFront domain per surface:
 *
 *   HERO_URL     — homepage hero slider images
 *   WEBINAR_URL  — webinar cover images
 *   RESUME_URL   — student CVs
 *
 * The older `URAV_AWS_S3_*_PUBLIC_BASE_URL` names still work as fallbacks. With
 * none of them set, nothing is rewritten and the stored S3 URL is served
 * exactly as before.
 *
 * Keep this file free of server-only imports (mongoose, aws-sdk, node
 * builtins) — it is pure string work.
 */

export type MediaSurface = "hero" | "webinar" | "resume";

/** Raw env value for a surface, newest name first. */
function rawBase(surface: MediaSurface): string | undefined {
  switch (surface) {
    case "hero":
      return (
        process.env.HERO_URL || process.env.URAV_AWS_S3_HERO_PUBLIC_BASE_URL
      );
    case "webinar":
      return (
        process.env.WEBINAR_URL ||
        process.env.URAV_AWS_S3_WEBINAR_PUBLIC_BASE_URL
      );
    case "resume":
      return process.env.RESUME_URL || process.env.URAV_AWS_S3_PUBLIC_BASE_URL;
  }
}

/**
 * Normalised CDN base for a surface, e.g. `https://d111111abcdef8.cloudfront.net`.
 * Returns null when the env var is unset — callers then keep the stored URL.
 *
 * A bare domain (`d111111abcdef8.cloudfront.net`) is accepted and gets
 * `https://` put in front of it, and any trailing slash is trimmed, so the
 * value pasted out of the AWS console works either way.
 */
export function cdnBase(surface: MediaSurface): string | null {
  const raw = rawBase(surface)?.trim();
  if (!raw) return null;
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withScheme.replace(/\/+$/, "");
}

/** Bucket names, used to strip the bucket out of path-style S3 URLs. */
function bucketNames(): string[] {
  return [
    process.env.URAV_AWS_S3_HERO_BUCKET,
    process.env.URAV_AWS_S3_WEBINAR_BUCKET,
    process.env.URAV_AWS_S3_BUCKET,
  ].filter((name): name is string => Boolean(name));
}

/**
 * Recover the object key from a stored public URL.
 *
 * Handles both S3 URL styles and an existing CloudFront URL:
 *   https://<bucket>.s3.<region>.amazonaws.com/<key>
 *   https://s3.<region>.amazonaws.com/<bucket>/<key>
 *   https://<distribution>.cloudfront.net/<key>
 *
 * Returns null for local `/public` paths (the built-in default slides and the
 * webinar placeholder) and for anything unparseable.
 */
export function keyFromStoredUrl(url?: string | null): string | null {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  // Built-in assets served by Next out of /public — never CDN-rewritten.
  if (trimmed.startsWith("/")) return null;
  try {
    const parsed = new URL(trimmed);
    let path = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
    if (!path) return null;
    for (const bucket of bucketNames()) {
      if (path.startsWith(`${bucket}/`)) {
        path = path.slice(bucket.length + 1);
        break;
      }
    }
    return path || null;
  } catch {
    return null;
  }
}

/** Percent-encode a key without escaping its `/` separators. */
function encodeKey(key: string): string {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

/**
 * The URL to serve for a stored file.
 *
 * Prefers `<CDN base>/<key>`; falls back to the key parsed out of the stored
 * URL; falls back again to the stored URL untouched (no CDN configured, a
 * local `/public` asset, or a URL we can't read a key out of).
 */
export function cdnUrl(
  surface: MediaSurface,
  key?: string | null,
  storedUrl?: string | null
): string {
  const stored = storedUrl?.trim() ?? "";
  const base = cdnBase(surface);
  if (!base) return stored;
  // Local default images stay local.
  if (stored.startsWith("/")) return stored;

  const resolved = key?.trim() || keyFromStoredUrl(stored);
  if (!resolved) return stored;

  return `${base}/${encodeKey(resolved)}`;
}
