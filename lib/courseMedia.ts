/**
 * Course thumbnail-image helpers.
 *
 * Client-safe on purpose — imported by components as well as by the API
 * routes, so keep it free of mongoose / aws-sdk / node builtins.
 */

/**
 * Shown whenever a course has no uploaded thumbnail.
 *
 * Swap `public/placeholders/course.svg` for any other 16:9 image to change
 * it — no code change needed.
 */
export const COURSE_FALLBACK_IMAGE = "/placeholders/course.svg";

/** The image to render for a course — the uploaded one, or the fallback. */
export function courseImage(course?: {
  imageUrl?: string | null;
  displayImageUrl?: string | null;
} | null): string {
  return (
    course?.displayImageUrl?.trim() ||
    course?.imageUrl?.trim() ||
    COURSE_FALLBACK_IMAGE
  );
}

/**
 * Add `displayImageUrl` to a serialized course before sending it out of an
 * API route. `imageUrl` stays exactly as stored (so the dashboard can tell
 * "no image uploaded" from "image uploaded"), while every consumer of the
 * API gets a URL it can render straight away.
 */
export function withCourseImage<T extends Record<string, any>>(doc: T): T {
  if (!doc) return doc;
  return { ...doc, displayImageUrl: courseImage(doc) };
}

/**
 * The `serialize()` surface override for courses.
 *
 * Courses and webinars both store their thumbnail in `imageUrl`/`imageKey`,
 * and `lib/api.ts`'s CDN_FIELDS table can only default that field name to
 * one surface (`"webinar"`). Pass this as `serialize(doc, COURSE_SURFACE)`
 * anywhere a course is serialized so its image resolves against
 * `COURSE_URL` instead of `WEBINAR_URL`.
 */
export const COURSE_SURFACE = { imageUrl: "course" } as const;
