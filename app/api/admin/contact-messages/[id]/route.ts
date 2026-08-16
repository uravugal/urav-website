import { isValidObjectId } from "mongoose";
import { connectDB } from "@/lib/db";
import {
  ContactMessage,
  CONTACT_MESSAGE_STATUSES,
} from "@/models/ContactMessage";
import {
  ok,
  fail,
  handle,
  serialize,
  requireAdmin,
  requireSuperAdmin,
} from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

const POPULATE = [
  { path: "user", select: "firstName lastName email phone role" },
  { path: "handledBy", select: "firstName lastName email" },
];

/** Any admin may open one message in full. */
export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    if (!isValidObjectId(params.id)) return fail("Message not found.", 404);

    await connectDB();
    const item = await ContactMessage.findById(params.id)
      .populate(POPULATE)
      .lean();
    if (!item) return fail("Message not found.", 404);

    return ok(serialize(item));
  });
}

/**
 * PATCH — move a message through the tabs, record the reply that was sent,
 * or leave a note for the team.
 *
 * Whoever last touched it is stored in `handledBy`, so on a shared inbox it's
 * clear who picked something up.
 */
export async function PATCH(req: Request, { params }: Ctx) {
  return handle(async () => {
    const admin = await requireAdmin();
    if (!isValidObjectId(params.id)) return fail("Message not found.", 404);

    const body = await req.json().catch(() => ({}));
    const update: Record<string, any> = {};

    if ("status" in body) {
      if (!(CONTACT_MESSAGE_STATUSES as readonly string[]).includes(body.status))
        return fail("That status isn't valid.");
      update.status = body.status;
    }

    if ("reply" in body) {
      const reply = String(body.reply ?? "").trim();
      if (reply.length > 4000)
        return fail("That reply is too long — please keep it under 4000 characters.");
      update.reply = reply;
      if (reply) update.repliedAt = new Date();
    }

    if ("internalNote" in body) {
      const note = String(body.internalNote ?? "").trim();
      if (note.length > 2000)
        return fail("That note is too long — please keep it under 2000 characters.");
      update.internalNote = note;
    }

    if (Object.keys(update).length === 0) return fail("Nothing to update.");

    update.handledBy = admin.id;

    await connectDB();
    const item = await ContactMessage.findByIdAndUpdate(
      params.id,
      { $set: update },
      { new: true, runValidators: true }
    )
      .populate(POPULATE)
      .lean();

    if (!item) return fail("Message not found.", 404);
    return ok(serialize(item));
  });
}

/**
 * DELETE — superadmin only.
 *
 * A deleted message is gone for good, and it may be the only record of an
 * enquiry, so ordinary admins close messages instead.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireSuperAdmin();
    if (!isValidObjectId(params.id)) return fail("Message not found.", 404);

    await connectDB();
    const result = await ContactMessage.deleteOne({ _id: params.id });
    if (result.deletedCount === 0) return fail("Message not found.", 404);

    return ok({ deleted: true });
  });
}
