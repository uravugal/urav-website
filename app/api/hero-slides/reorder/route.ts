import { connectDB } from "@/lib/db";
import { HeroSlide } from "@/models/HeroSlide";
import { ok, fail, handle, serialize, requireSuperAdmin } from "@/lib/api";
import { isValidObjectId } from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PUT — set the display order of every slide in one call.
 * Body: { ids: string[] } — position in the array becomes `order`.
 *
 * Sending the whole list (rather than swapping two rows) keeps the numbers
 * contiguous and means a half-applied reorder can't leave two slides
 * fighting over the same position.
 */
export async function PUT(req: Request) {
  return handle(async () => {
    await requireSuperAdmin();

    const body = await req.json();
    const ids: unknown = body?.ids;
    if (!Array.isArray(ids) || ids.length === 0) {
      return fail("Send the slide ids in their new order.");
    }
    if (!ids.every((id) => typeof id === "string" && isValidObjectId(id))) {
      return fail("One of those slide ids isn't valid.");
    }

    await connectDB();
    await HeroSlide.bulkWrite(
      (ids as string[]).map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { $set: { order: index } } },
      }))
    );

    const slides = await HeroSlide.find({})
      .sort({ order: 1, createdAt: 1 })
      .lean();
    return ok(slides.map((d) => serialize(d)));
  });
}
