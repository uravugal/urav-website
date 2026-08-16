/**
 * Daily limit for the contact form.
 *
 * A "day" is an **India Standard Time calendar day**, not a rolling 24 hours:
 * someone who sends three messages this evening can send again after midnight
 * IST, which is what "come back tomorrow" means to a visitor. Fixing the zone
 * also means the limit behaves the same for a visitor abroad and for the team
 * reading the messages.
 *
 * This file is imported by a client component — keep it free of mongoose,
 * aws-sdk and node builtins.
 */

export const DAILY_MESSAGE_LIMIT = 3;

/** Offset of Asia/Kolkata from UTC, in minutes. India has no DST. */
const IST_OFFSET_MINUTES = 5 * 60 + 30;
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

/**
 * The IST calendar day a moment falls in, as `YYYY-MM-DD`.
 *
 * Stored on every message so the daily count is a plain equality match on an
 * indexed field rather than a date range that has to be recomputed per query.
 */
export function istDayKey(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + IST_OFFSET_MINUTES * MINUTE);
  return shifted.toISOString().slice(0, 10);
}

/** Midnight IST at the start of the *next* day — when the allowance refills. */
export function nextIstMidnight(date: Date = new Date()): Date {
  const shifted = date.getTime() + IST_OFFSET_MINUTES * MINUTE;
  const startOfNextDay = Math.floor(shifted / DAY) * DAY + DAY;
  return new Date(startOfNextDay - IST_OFFSET_MINUTES * MINUTE);
}

export interface ContactQuota {
  limit: number;
  used: number;
  remaining: number;
  /** ISO timestamp of the next reset (midnight IST). */
  resetsAt: string;
  /** The day the count refers to, `YYYY-MM-DD` in IST. */
  day: string;
}

export function buildQuota(used: number, now: Date = new Date()): ContactQuota {
  const capped = Math.min(used, DAILY_MESSAGE_LIMIT);
  return {
    limit: DAILY_MESSAGE_LIMIT,
    used: capped,
    remaining: Math.max(0, DAILY_MESSAGE_LIMIT - capped),
    resetsAt: nextIstMidnight(now).toISOString(),
    day: istDayKey(now),
  };
}

/** "in about 4 hours" / "in 25 minutes" — used in the form's limit notice. */
export function timeUntil(iso?: string, now: Date = new Date()): string {
  if (!iso) return "tomorrow";
  const ms = new Date(iso).getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "shortly";

  const minutes = Math.ceil(ms / MINUTE);
  if (minutes < 60) return `in ${minutes} minute${minutes === 1 ? "" : "s"}`;

  const hours = Math.round(minutes / 60);
  return `in about ${hours} hour${hours === 1 ? "" : "s"}`;
}
