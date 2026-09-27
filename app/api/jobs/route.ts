import { connectDB } from "@/lib/db";
import { Job } from "@/models/Job";
import { User } from "@/models/User";
import {
  ok,
  fail,
  handle,
  serialize,
  requireJobPoster,
  requireUser,
  isAdminRole,
  pageParams,
  paginated,
  searchFilter,
} from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET
 *  - default          → active jobs (public website listing)
 *  - ?all=1           → every job, admin only
 *  - ?mine=1          → the signed-in recruiter's own jobs
 *  - ?recruiter=<id>  → one recruiter's jobs, admin only
 *
 * Add ?page=1&limit=10 (and optionally &q=) to get a paginated envelope
 * `{ items, total, page, limit, pages }` instead of a plain array. Without
 * ?page the response shape is unchanged, so the public website components
 * keep working as they are.
 */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const includeAll = url.searchParams.get("all") === "1";
    const mine = url.searchParams.get("mine") === "1";
    const recruiterId = url.searchParams.get("recruiter");

    await connectDB();
    void User; // register the model referenced by populate()

    let filter: Record<string, any> = { active: true };

    if (mine) {
      const session = requireUser();
      filter = { postedBy: session.id };
    } else if (recruiterId) {
      const session = requireUser();
      if (!isAdminRole(session.role) && session.id !== recruiterId)
        return fail("You can only view your own job postings.", 403);
      filter = { postedBy: recruiterId };
    } else if (includeAll) {
      const session = requireUser();
      if (!isAdminRole(session.role))
        return fail("Admin access is required for this action.", 403);
      filter = {};
    }

    const { page, limit, skip, paged, q } = pageParams(req);
    const search = searchFilter(q, ["title", "company", "location"]);
    if (search) Object.assign(filter, search);

    if (!paged) {
      const jobs = await Job.find(filter)
        .sort({ createdAt: -1 })
        .populate("postedBy", "firstName lastName email companyName")
        .lean();
      return ok(jobs.map((d) => serialize(d)));
    }

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("postedBy", "firstName lastName email companyName")
        .lean(),
      Job.countDocuments(filter),
    ]);

    return ok(paginated(jobs.map((d) => serialize(d)), total, { page, limit }));
  });
}

// Create a job — admins, and recruiters that an admin has approved.
export async function POST(req: Request) {
  return handle(async () => {
    const session = await requireJobPoster();
    const body = await req.json();
    if (!body.title?.trim()) return fail("Job title is required.");
    if (!body.location?.trim()) return fail("Location is required.");

    await connectDB();

    // A recruiter's postings are always attributed to their own company,
    // so they can't post under someone else's name.
    let company = String(body.company ?? "").trim();
    if (session.role === "recruiter") {
      const me: any = await User.findById(session.id).select("companyName").lean();
      company = me?.companyName?.trim() || company;
    }
    if (!company) return fail("Company is required.");

    const job = await Job.create({
      title: body.title.trim(),
      company,
      location: body.location.trim(),
      type: body.type || "Full Time",
      experience: body.experience || "",
      salary: body.salary || "",
      description: body.description || "",
      skills: Array.isArray(body.skills)
        ? body.skills
        : String(body.skills || "")
            .split(",")
            .map((s: string) => s.trim())
            .filter(Boolean),
      active: body.active !== false,
      postedBy: session.id,
      postedByRole: session.role === "recruiter" ? "recruiter" : "admin",
    });
    return ok(serialize(job), 201);
  });
}
