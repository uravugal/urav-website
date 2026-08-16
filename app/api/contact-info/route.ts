import { connectDB } from "@/lib/db";
import { ContactInfo, CONTACT_INFO_KEY } from "@/models/ContactInfo";
import { ok, fail, handle, serialize, requireSuperAdmin } from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Everything a superadmin may edit. Anything else in the body is ignored. */
const EDITABLE = [
  "intro",
  "email",
  "altEmail",
  "phone",
  "altPhone",
  "whatsapp",
  "address",
  "hours",
] as const;

const LIMITS: Partial<Record<(typeof EDITABLE)[number], number>> = {
  intro: 400,
  address: 500,
  hours: 200,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const POPULATE = {
  path: "updatedBy",
  select: "firstName lastName email",
};

/**
 * GET — the contact details for /contact.
 *
 * Public: the page is public, so the details are too. `null` is a valid
 * answer and means "nothing saved yet" — the page then falls back to
 * DEFAULT_CONTACT_INFO rather than rendering an empty column.
 */
export async function GET() {
  return handle(async () => {
    await connectDB();
    const info = await ContactInfo.findOne({ key: CONTACT_INFO_KEY })
      .populate(POPULATE)
      .lean();

    return ok(info ? serialize(info) : null);
  });
}

/**
 * PUT — save the details. Superadmin only.
 *
 * Upserts on the fixed key, so the first save creates the single document and
 * every later one edits it. Fields left out of the body are cleared, which is
 * what makes "remove the second phone number" work from the form.
 */
export async function PUT(req: Request) {
  return handle(async () => {
    const admin = await requireSuperAdmin();

    const body = await req.json().catch(() => ({}));
    const update: Record<string, any> = {};

    for (const field of EDITABLE) {
      const value = String(body[field] ?? "").trim();
      const max = LIMITS[field];
      if (max && value.length > max)
        return fail(
          `That ${field === "intro" ? "intro" : field} is too long — please keep it under ${max} characters.`
        );
      update[field] = value;
    }

    // Emails are stored lowercase and used in `mailto:` links, so a typo here
    // quietly breaks the only way to reach the team.
    for (const field of ["email", "altEmail"] as const) {
      if (update[field] && !EMAIL_RE.test(update[field]))
        return fail("Please enter a valid email address.");
      update[field] = update[field].toLowerCase();
    }

    update.updatedBy = admin.id;

    await connectDB();
    const info = await ContactInfo.findOneAndUpdate(
      { key: CONTACT_INFO_KEY },
      { $set: update, $setOnInsert: { key: CONTACT_INFO_KEY } },
      { new: true, upsert: true, runValidators: true }
    )
      .populate(POPULATE)
      .lean();

    return ok(serialize(info));
  });
}
