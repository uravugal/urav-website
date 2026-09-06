import { connectDB } from "@/lib/db";
import { Consultation, CONSULTATION_STATUSES } from "@/models/Consultation";
import {
  ok,
  handle,
  serialize,
  requireAdmin,
  pageParams,
  paginated,
  searchFilter,
} from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — consultation requests for the admin / superadmin screen.
 *
 * Query params:
 *   ?page=1&limit=10   paginate (returns { items, total, page, limit, pages })
 *   ?q=…               search name / email / phone / institution / message
 *   ?status=New|In Progress|Responded|Closed
 *
 * As with the other admin lists, searching and filtering run in MongoDB so the
 * browser only ever holds one page.
 */
export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    await connectDB();

    const { page, limit, skip, paged, q } = pageParams(req);
    const status = new URL(req.url).searchParams.get("status");

    const filter: Record<string, any> = {};
    if (status && (CONSULTATION_STATUSES as readonly string[]).includes(status)) {
      filter.status = status;
    }

    const search = searchFilter(q, [
      "name",
      "email",
      "phone",
      "institution",
      "message",
      "topic",
    ]);
    if (search) Object.assign(filter, search);

    const populate = [
      { path: "user", select: "firstName lastName email phone resumeUrl studentType" },
      { path: "handledBy", select: "firstName lastName email" },
    ];

    if (!paged) {
      const items = await Consultation.find(filter)
        .sort({ createdAt: -1 })
        .populate(populate)
        .lean();
      return ok(items.map((d) => serialize(d)));
    }

    // Tab counts ignore the active status filter (but respect the search) so
    // the numbers stay put while you click between tabs.
    const countBase: Record<string, any> = {};
    if (search) Object.assign(countBase, search);

    const [items, total, all, fresh, progress, responded, closed] =
      await Promise.all([
        Consultation.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate(populate)
          .lean(),
        Consultation.countDocuments(filter),
        Consultation.countDocuments(countBase),
        Consultation.countDocuments({ ...countBase, status: "New" }),
        Consultation.countDocuments({ ...countBase, status: "In Progress" }),
        Consultation.countDocuments({ ...countBase, status: "Responded" }),
        Consultation.countDocuments({ ...countBase, status: "Closed" }),
      ]);

    return ok({
      ...paginated(items.map((d) => serialize(d)), total, { page, limit }),
      counts: {
        all,
        New: fresh,
        "In Progress": progress,
        Responded: responded,
        Closed: closed,
      },
    });
  });
}
