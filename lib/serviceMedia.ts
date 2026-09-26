/**
 * Service thumbnail-image helpers.
 *
 * Client-safe on purpose — imported by components as well as by the API
 * routes, so keep it free of mongoose / aws-sdk / node builtins.
 */

/**
 * Shown whenever a service has no uploaded thumbnail.
 *
 * Swap `public/placeholders/service.svg` for any other 16:9 image to change
 * it — no code change needed.
 */
export const SERVICE_FALLBACK_IMAGE = "/placeholders/service.svg";

/** The image to render for a service — the uploaded one, or the fallback. */
export function serviceImage(service?: {
  imageUrl?: string | null;
  displayImageUrl?: string | null;
} | null): string {
  return (
    service?.displayImageUrl?.trim() ||
    service?.imageUrl?.trim() ||
    SERVICE_FALLBACK_IMAGE
  );
}

/**
 * Add `displayImageUrl` to a serialized service before sending it out of an
 * API route. `imageUrl` stays exactly as stored (so the dashboard can tell
 * "no image uploaded" from "image uploaded"), while every consumer of the
 * API gets a URL it can render straight away.
 */
export function withServiceImage<T extends Record<string, any>>(doc: T): T {
  if (!doc) return doc;
  return { ...doc, displayImageUrl: serviceImage(doc) };
}

/**
 * The `serialize()` surface override for services.
 *
 * Services, courses and webinars all store their thumbnail in `imageUrl`/`imageKey`,
 * and `lib/api.ts`'s CDN_FIELDS table can only default that field name to
 * one surface (`"webinar"`). Pass this as `serialize(doc, SERVICE_SURFACE)`
 * anywhere a service is serialized so its image resolves against
 * `SERVICE_URL` instead of `WEBINAR_URL`.
 */
export const SERVICE_SURFACE = { imageUrl: "service" } as const;
