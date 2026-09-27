import { NextResponse } from "next/server";
import { getSessionUser, type SessionUser } from "./auth";
import { cdnUrl, type MediaSurface } from "./cdn";

/**
 * Stored-URL fields that get rebuilt from their object key + the CloudFront
 * base (HERO_URL / WEBINAR_URL / RESUME_URL) on the way out of the API.
 *
 * Doing it here rather than in each route means every caller — hero slides,
 * webinars, student lists, applications, populated consultation users — is
 * covered by one rule, including rows written before CloudFront was set up.
 */
const CDN_FIELDS: Record<string, { surface: MediaSurface; keyField: string }> =
  {
    desktopImageUrl: { surface: "hero", keyField: "desktopImageKey" },
    mobileImageUrl: { surface: "hero", keyField: "mobileImageKey" },
    imageUrl: { surface: "webinar", keyField: "imageKey" },
    resumeUrl: { surface: "resume", keyField: "resumeKey" },
  };

export function ok<T>(data: T, init?: number) {
  return NextResponse.json({ ok: true, data }, { status: init ?? 200 });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

/**
 * Convert a Mongoose doc/lean object to a plain JSON-safe object with string
 * ids.
 *
 * `surfaceOverrides` lets a caller correct the CDN surface for a field name
 * that isn't unique across collections — e.g. both webinars and courses
 * store their thumbnail in `imageUrl`/`imageKey`, and `CDN_FIELDS` can only
 * guess one default (`"webinar"`) for that name. Pass
 * `{ imageUrl: "course" }` when serializing a course so it resolves against
 * `COURSE_URL` instead.
 */
export function serialize<T extends Record<string, any>>(
  doc: T,
  surfaceOverrides?: Partial<Record<string, MediaSurface>>
): any {
  if (doc == null) return doc;
  const obj: any = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === "object" && typeof val.toHexString === "function") {
      obj[key] = val.toString();
    } else if (val instanceof Date) {
      obj[key] = val.toISOString();
    } else if (Array.isArray(val)) {
      obj[key] = val.map((v) =>
        v && typeof v === "object" && !(v instanceof Date)
          ? serialize(v, surfaceOverrides)
          : v
      );
    } else if (
      val &&
      typeof val === "object" &&
      !(val instanceof Date) &&
      val.constructor?.name === "Object"
    ) {
      obj[key] = serialize(val, surfaceOverrides);
    }
  }

  // Point every stored file URL at CloudFront. The key in the same document
  // wins; when there isn't one (older resumes, application snapshots) the key
  // is read back out of the stored S3 URL.
  for (const [field, { surface: defaultSurface, keyField }] of Object.entries(
    CDN_FIELDS
  )) {
    const value = obj[field];
    if (typeof value !== "string" || !value) continue;
    const surface = surfaceOverrides?.[field] ?? defaultSurface;
    const key = typeof obj[keyField] === "string" ? obj[keyField] : null;
    obj[field] = cdnUrl(surface, key, value);
  }

  return obj;
}

/** Throwable guard used by route handlers. */
export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function requireUser(): SessionUser {
  const user = getSessionUser();
  if (!user) throw new HttpError(401, "You must be logged in to do that.");
  return user;
}

/** True for both admin tiers — use this instead of `role === "admin"`. */
export function isAdminRole(role?: string): boolean {
  return role === "admin" || role === "superadmin";
}

/**
 * Read the caller's *current* role from the database rather than trusting the
 * JWT. A role change (e.g. promoting someone to "superadmin" directly in
 * MongoDB) then takes effect immediately, without the user logging out and
 * back in again.
 */
export async function currentRole(userId: string): Promise<string | null> {
  const { connectDB } = await import("./db");
  const { User } = await import("@/models/User");
  await connectDB();
  const me: any = await User.findById(userId).select("role").lean();
  return me?.role ?? null;
}

/** Admin **or** superadmin. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = requireUser();
  const role = (await currentRole(user.id)) ?? user.role;
  if (!isAdminRole(role))
    throw new HttpError(403, "Admin access is required for this action.");
  return { ...user, role: role as SessionUser["role"] };
}

/** Superadmin only — managing admins and editing student records. */
export async function requireSuperAdmin(): Promise<SessionUser> {
  const user = requireUser();
  const role = (await currentRole(user.id)) ?? user.role;
  if (role !== "superadmin")
    throw new HttpError(
      403,
      "Only a superadmin can do that."
    );
  return { ...user, role: role as SessionUser["role"] };
}

/* ------------------------------------------------------------------ */
/* Pagination                                                          */
/* ------------------------------------------------------------------ */

export interface PageParams {
  /** 1-based page number. */
  page: number;
  limit: number;
  skip: number;
  /** True when the caller actually asked for a page. */
  paged: boolean;
  /** Free-text search term, trimmed + lowercased. */
  q: string;
}

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

/**
 * Parse ?page=&limit=&q= off a request URL.
 *
 * `paged` is false when no ?page= was supplied, which lets a route keep
 * returning a plain array for older callers (the public website components)
 * while the dashboards opt in to the paginated envelope.
 */
export function pageParams(req: Request): PageParams {
  const url = new URL(req.url);
  const rawPage = url.searchParams.get("page");
  const rawLimit = url.searchParams.get("limit");

  const page = Math.max(1, Number(rawPage) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(rawLimit) || DEFAULT_PAGE_SIZE)
  );

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    paged: rawPage !== null,
    q: (url.searchParams.get("q") ?? "").trim(),
  };
}

/** Escape a user-typed search term before putting it in a RegExp. */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Build a case-insensitive "contains" match across several fields. */
export function searchFilter(q: string, fields: string[]) {
  if (!q) return null;
  const rx = new RegExp(escapeRegex(q), "i");
  return { $or: fields.map((f) => ({ [f]: rx })) };
}

/** Wrap a page of results in the envelope the dashboards expect. */
export function paginated<T>(
  items: T[],
  total: number,
  { page, limit }: { page: number; limit: number }
) {
  return {
    items,
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
  };
}

export const PENDING_APPROVAL_MESSAGE =
  "Your recruiter account is waiting for admin approval. Once an admin approves your access you can post jobs.";

export const REJECTED_MESSAGE =
  "Your recruiter account was not approved. Please contact the URAV team for help.";

/**
 * Allows admins straight through; recruiters only once an admin has
 * approved them. The approval flag is read from the database (not the
 * JWT) so an approval takes effect immediately, without the recruiter
 * having to log out and back in.
 */
export async function requireJobPoster(): Promise<SessionUser> {
  const user = requireUser();
  if (isAdminRole(user.role)) return user;
  if (user.role !== "recruiter")
    throw new HttpError(403, "Only recruiters and admins can do that.");

  const { connectDB } = await import("./db");
  const { User } = await import("@/models/User");
  await connectDB();
  const me: any = await User.findById(user.id).select("approvalStatus").lean();
  if (!me) throw new HttpError(404, "Your account could not be found.");
  if (me.approvalStatus === "rejected") throw new HttpError(403, REJECTED_MESSAGE);
  if (me.approvalStatus !== "approved")
    throw new HttpError(403, PENDING_APPROVAL_MESSAGE);
  return user;
}

/** Wrap a handler so thrown HttpErrors become clean JSON responses. */
export function handle(
  fn: () => Promise<NextResponse>
): Promise<NextResponse> {
  return fn().catch((err) => {
    if (err instanceof HttpError) return fail(err.message, err.status);
    console.error("[API error]", err);
    const msg =
      err instanceof Error ? err.message : "Something went wrong. Please try again.";
    return fail(msg, 500);
  });
}
