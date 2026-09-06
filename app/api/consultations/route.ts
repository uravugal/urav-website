import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import {
  Consultation,
  CONSULTATION_TOPICS,
  CONSULTATION_MODES,
} from "@/models/Consultation";
import { ok, fail, handle, serialize, requireUser } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Fields the student never sees on their own request. */
const STUDENT_PROJECTION = "-internalNote -handledBy";

/**
 * POST — submit a consultation request.
 *
 * Open to visitors as well as signed-in students: the form lives on a public
 * page so someone can ask a question before they register. When the sender
 * *is* logged in we attach their user id, which is what lets them see the
 * team's reply later on and lets an admin jump to their student record.
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
      return fail("Please describe what you'd like help with (at least 10 characters).");
    if (message.length > 4000)
      return fail("That message is too long — please keep it under 4000 characters.");

    const topic = CONSULTATION_TOPICS.includes(body.topic)
      ? body.topic
      : "Career Guidance";
    const preferredMode = CONSULTATION_MODES.includes(body.preferredMode)
      ? body.preferredMode
      : "Email";
    const studentType = ["School Student", "College Student", "Other"].includes(
      body.studentType
    )
      ? body.studentType
      : "College Student";

    await connectDB();

    // Only students get linked. An admin or recruiter testing the form
    // shouldn't end up with a request filed against their account.
    let userId: string | undefined;
    if (session) {
      const me: any = await User.findById(session.id).select("role").lean();
      if (me?.role === "student") userId = session.id;
    }

    // Cheap flood guard: the same address can't file two requests inside a
    // minute, which stops a double-click (or a bored visitor) filling the
    // admin list with duplicates.
    const recent = await Consultation.findOne({
      email,
      createdAt: { $gt: new Date(Date.now() - 60_000) },
    })
      .select("_id")
      .lean();
    if (recent)
      return fail(
        "We've already received a request from you. Please give us a moment before sending another.",
        429
      );

    const created = await Consultation.create({
      user: userId,
      name,
      email,
      phone: String(body.phone ?? "").trim(),
      studentType,
      institution: String(body.institution ?? "").trim(),
      topic,
      preferredMode,
      preferredTime: String(body.preferredTime ?? "").trim(),
      message,
    });

    return ok(serialize(created.toObject()), 201);
  });
}

/** GET — the signed-in student's own requests, newest first. */
export async function GET() {
  return handle(async () => {
    const user = requireUser();
    await connectDB();

    const items = await Consultation.find({ user: user.id })
      .sort({ createdAt: -1 })
      .select(STUDENT_PROJECTION)
      .lean();

    return ok(items.map((d) => serialize(d)));
  });
}
