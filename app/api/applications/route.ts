import { connectDB } from "@/lib/db";
import { Application } from "@/models/Application";
import { Job } from "@/models/Job";
import { Webinar } from "@/models/Webinar";
import { User } from "@/models/User";
import {
  ok,
  fail,
  handle,
  serialize,
  requireUser,
  isAdminRole,
  pageParams,
  paginated,
  searchFilter,
} from "@/lib/api";
import { isValidObjectId } from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET
 *  - admin      → every application (?recruiter=<id> narrows to one recruiter)
 *  - recruiter  → only applications made to jobs they posted
 *  - student    → only their own
 *
 * ?page= & ?limit= return a paginated envelope; ?status= narrows by status.
 */
export async function GET(req: Request) {
  return handle(async () => {
    const session = requireUser();
    await connectDB();

    const url = new URL(req.url);
    const kind = url.searchParams.get("kind"); // optional "job" | "webinar"
    const recruiterId = url.searchParams.get("recruiter");

    const filter: Record<string, any> = {};

    if (session.role === "recruiter") {
      // Restrict to this recruiter's own postings.
      const myJobs = await Job.find({ postedBy: session.id }).select("_id").lean();
      filter.kind = "job";
      filter.job = { $in: myJobs.map((j: any) => j._id) };
    } else if (!isAdminRole(session.role)) {
      filter.user = session.id;
    } else if (recruiterId) {
      const theirJobs = await Job.find({ postedBy: recruiterId })
        .select("_id")
        .lean();
      filter.kind = "job";
      filter.job = { $in: theirJobs.map((j: any) => j._id) };
    }

    if (kind === "job" || kind === "webinar") filter.kind = kind;

    const status = url.searchParams.get("status");
    if (status) filter.status = status;

    /**
     * Free-text search spans the applicant and the thing they applied to,
     * both of which live in other collections. Mongo can't regex across a
     * populate(), so we resolve the matching user / job / webinar ids first
     * and then constrain the application query by them.
     */
    const q = (url.searchParams.get("q") ?? "").trim();
    if (q) {
      const [users, jobs, webinars] = await Promise.all([
        User.find(searchFilter(q, ["firstName", "lastName", "email"]) as any)
          .select("_id")
          .lean(),
        Job.find(searchFilter(q, ["title", "company"]) as any)
          .select("_id")
          .lean(),
        Webinar.find(searchFilter(q, ["title", "speaker"]) as any)
          .select("_id")
          .lean(),
      ]);

      const or: Record<string, any>[] = [
        { user: { $in: users.map((u: any) => u._id) } },
        { job: { $in: jobs.map((j: any) => j._id) } },
        { webinar: { $in: webinars.map((w: any) => w._id) } },
      ];

      // Combine with whatever scoping is already in place (a recruiter's
      // own jobs, for instance) rather than replacing it.
      filter.$and = [...(filter.$and ?? []), { $or: or }];
    }

    // Register models referenced by populate (Job/Webinar/User import ensures this).
    void Job;
    void Webinar;
    void User;

    const USER_FIELDS =
      "firstName lastName email phone college degree department currentYear graduationYear cgpa studentType schoolName classGrade linkedin github resumeUrl";

    const { page, limit, skip, paged } = pageParams(req);

    if (!paged) {
      const apps = await Application.find(filter)
        .sort({ createdAt: -1 })
        .populate("job")
        .populate("webinar")
        .populate("user", USER_FIELDS)
        .lean();
      return ok(apps.map((d) => serialize(d)));
    }

    const [apps, total, jobCount, webinarCount] = await Promise.all([
      Application.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("job")
        .populate("webinar")
        .populate("user", USER_FIELDS)
        .lean(),
      Application.countDocuments(filter),
      Application.countDocuments({ ...filter, kind: "job" }),
      Application.countDocuments({ ...filter, kind: "webinar" }),
    ]);

    return ok({
      ...paginated(apps.map((d) => serialize(d)), total, { page, limit }),
      counts: { job: jobCount, webinar: webinarCount },
    });
  });
}

// POST: apply to a job or register for a webinar (login required).
export async function POST(req: Request) {
  return handle(async () => {
    const session = requireUser();
    const { jobId, webinarId, note } = await req.json();

    if (!jobId && !webinarId)
      return fail("Nothing to apply to — provide a job or webinar.");
    if (jobId && webinarId)
      return fail("Apply to one thing at a time.");

    await connectDB();

    const applicant = await User.findById(session.id).lean();
    if (!applicant) return fail("Your account could not be found.", 404);

    let kind: "job" | "webinar";
    let target: any;

    if (jobId) {
      if (!isValidObjectId(jobId)) return fail("Job not found.", 404);
      target = await Job.findById(jobId).lean();
      if (!target || target.active === false)
        return fail("This job is no longer accepting applications.", 404);
      kind = "job";
    } else {
      if (!isValidObjectId(webinarId)) return fail("Webinar not found.", 404);
      target = await Webinar.findById(webinarId).lean();
      if (!target || target.active === false)
        return fail("This webinar is no longer open for registration.", 404);
      kind = "webinar";
    }

    // Prevent duplicates up front for a friendly message
    // (the unique index is the ultimate guard).
    const existing = await Application.findOne({
      user: session.id,
      ...(kind === "job" ? { job: jobId } : { webinar: webinarId }),
    }).lean();
    if (existing) {
      return fail(
        kind === "job"
          ? "You've already applied to this job."
          : "You're already registered for this webinar.",
        409
      );
    }

    try {
      const application = await Application.create({
        user: session.id,
        kind,
        job: kind === "job" ? jobId : undefined,
        webinar: kind === "webinar" ? webinarId : undefined,
        status: kind === "job" ? "Applied" : "Registered",
        resumeUrl: (applicant as any).resumeUrl,
        note: note || "",
      });
      return ok(serialize(application), 201);
    } catch (err: any) {
      if (err?.code === 11000)
        return fail("You've already applied to this.", 409);
      throw err;
    }
  });
}
