import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
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
 * GET — every registered student with their registration details.
 *
 * Query params:
 *   ?page=1&limit=10   paginate (returns { items, total, page, limit, pages })
 *   ?q=…               search name / email / phone / institution
 *   ?type=School Student | College Student
 *
 * Searching and filtering happen in MongoDB rather than in the browser, so
 * the dashboard only ever downloads one page of records.
 */
export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin();
    await connectDB();

    const { page, limit, skip, paged, q } = pageParams(req);
    const type = new URL(req.url).searchParams.get("type");

    const filter: Record<string, any> = { role: "student" };

    if (type === "School Student") {
      filter.studentType = "School Student";
    } else if (type === "College Student") {
      // Records created before studentType existed default to college.
      filter.studentType = { $ne: "School Student" };
    }

    const search = searchFilter(q, [
      "firstName",
      "lastName",
      "email",
      "phone",
      "college",
      "schoolName",
    ]);
    if (search) Object.assign(filter, search);

    if (!paged) {
      const students = await User.find(filter)
        .sort({ createdAt: -1 })
        .select("-password")
        .lean();
      return ok(students.map((d) => serialize(d)));
    }

    // Counts for the tab labels are computed independently of the active
    // tab, so the numbers stay stable as you switch between them.
    const countBase: Record<string, any> = { role: "student" };
    if (search) Object.assign(countBase, search);

    const [students, total, all, school] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-password")
        .lean(),
      User.countDocuments(filter),
      User.countDocuments(countBase),
      User.countDocuments({ ...countBase, studentType: "School Student" }),
    ]);

    return ok({
      ...paginated(students.map((d) => serialize(d)), total, { page, limit }),
      counts: { all, school, college: all - school },
    });
  });
}
