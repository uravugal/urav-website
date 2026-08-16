import { connectDB } from "@/lib/db";
import { ContactMessage } from "@/models/ContactMessage";
import { ok, fail, handle, serialize } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import {
  DAILY_MESSAGE_LIMIT,
  buildQuota,
  istDayKey,
  nextIstMidnight,
} from "@/lib/contactLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Who "three a day" applies to.
 *
 * The email address is the identity for a visitor, because that is all we
 * have. For a signed-in sender the account id counts as well, so changing the
 * email in the form doesn't hand out a fresh allowance. Both are matched
 * against `dayKey`, which is an indexed field, so this stays a cheap count.
 *
 * Deliberately *not* keyed on IP: a college computer lab or a phone on mobile
 * data shares one address between many people, and blocking the fourth
 * student of the day would be worse than the spam it prevents. The IP is
 * still recorded on each message so genuine abuse can be spotted.
 */
function identityFilter(email: string, userId?: string, day = istDayKey()) {
  const or: Record<string, any>[] = [{ email }];
  if (userId) or.push({ user: userId });
  return { dayKey: day, $or: or };
}

/** Best guess at the sender's address behind Amplify / CloudFront. */
function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "";
}

/**
 * GET — how many messages this sender has left today.
 *
 * The form calls this on load (for a signed-in user) and after the email
 * field is filled in (for a visitor), so the allowance is on screen *before*
 * someone writes a long message they can't send.
 *
 *   ?email=…   whose allowance to report; defaults to the signed-in address
 */
export async function GET(req: Request) {
  return handle(async () => {
    const session = getSessionUser();
    const asked = (new URL(req.url).searchParams.get("email") ?? "")
      .trim()
      .toLowerCase();
    const email = asked || session?.email?.toLowerCase() || "";

    // Nothing to count yet — report a full allowance so the form can show
    // "3 messages a day" before anyone has typed an address.
    if (!email || !EMAIL_RE.test(email)) {
      return ok({ ...buildQuota(0), known: false });
    }

    await connectDB();
    const used = await ContactMessage.countDocuments(
      identityFilter(email, session?.id)
    );

    return ok({ ...buildQuota(used), known: true });
  });
}

/**
 * POST — send a message.
 *
 * Open to visitors as well as signed-in users; the contact page is public.
 * Capped at DAILY_MESSAGE_LIMIT per sender per IST calendar day — the fourth
 * attempt is refused with a 429 and the time the allowance refills, which is
 * what the form shows in its notice.
 */
export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    const session = getSessionUser();

    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const message = String(body.message ?? "").trim();

    if (!name) return fail("Please tell us your name.");
    if (!EMAIL_RE.test(email))
      return fail("Please enter a valid email address.");
    if (message.length < 10)
      return fail("Please write a little more so we know how to help (at least 10 characters).");
    if (message.length > 4000)
      return fail("That message is too long — please keep it under 4000 characters.");

    const subject = String(body.subject ?? "").trim().slice(0, 200);
    const phone = String(body.phone ?? "").trim().slice(0, 40);

    await connectDB();

    const now = new Date();
    const day = istDayKey(now);
    const used = await ContactMessage.countDocuments(
      identityFilter(email, session?.id, day)
    );

    if (used >= DAILY_MESSAGE_LIMIT) {
      const resetsAt = nextIstMidnight(now);
      return fail(
        `You've already sent ${DAILY_MESSAGE_LIMIT} messages today. You can send another after midnight IST (${resetsAt.toLocaleString(
          "en-IN",
          { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }
        )}) — or reply to our email if it's urgent.`,
        429
      );
    }

    const created = await ContactMessage.create({
      user: session?.id,
      name,
      email,
      phone,
      subject,
      message,
      dayKey: day,
      ip: clientIp(req),
    });

    return ok(
      {
        message: serialize(created.toObject()),
        quota: buildQuota(used + 1, now),
      },
      201
    );
  });
}
