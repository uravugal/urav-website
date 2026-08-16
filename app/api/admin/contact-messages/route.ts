import { connectDB } from "@/lib/db";
import {
  ContactMessage,
  CONTACT_MESSAGE_STATUSES,
} from "@/models/ContactMessage";
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
 * GET — messages sent from the contact form, for the dashboard.
 *
 * Query params:
 *   ?page=1&limit=10   paginate (returns { items, total, page, limit, pages })
 *   ?q=…               search name / email / phone / subject / message
 *   ?status=New|Read|Replied|Closed
 *
 * Searching and filtering run in MongoDB, as with the other admin lists, so
 * the browser only ever holds one page.
 */
export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    await connectDB();

    const { page, limit, skip, paged, q } = pageParams(req);
    const status = new URL(req.url).searchParams.get("status");

    const filter: Record<string, any> = {};
    if (status && (CONTACT_MESSAGE_STATUSES as readonly string[]).includes(status)) {
      filter.status = status;
    }

    const search = searchFilter(q, [
      "name",
      "email",
      "phone",
      "subject",
      "message",
    ]);
    if (search) Object.assign(filter, search);

    const populate = [
      { path: "user", select: "firstName lastName email phone role" },
      { path: "handledBy", select: "firstName lastName email" },
    ];

    if (!paged) {
      const items = await ContactMessage.find(filter)
        .sort({ createdAt: -1 })
        .populate(populate)
        .lean();
      return ok(items.map(serialize));
    }

    // Tab counts ignore the status filter (but respect the search) so the
    // numbers hold still while you click between tabs.
    const countBase: Record<string, any> = {};
    if (search) Object.assign(countBase, search);

    const [items, total, all, fresh, read, replied, closed] = await Promise.all([
      ContactMessage.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(populate)
        .lean(),
      ContactMessage.countDocuments(filter),
      ContactMessage.countDocuments(countBase),
      ContactMessage.countDocuments({ ...countBase, status: "New" }),
      ContactMessage.countDocuments({ ...countBase, status: "Read" }),
      ContactMessage.countDocuments({ ...countBase, status: "Replied" }),
      ContactMessage.countDocuments({ ...countBase, status: "Closed" }),
    ]);

    return ok({
      ...paginated(items.map(serialize), total, { page, limit }),
      counts: { all, New: fresh, Read: read, Replied: replied, Closed: closed },
    });
  });
}
