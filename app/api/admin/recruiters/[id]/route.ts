import { connectDB } from "@/lib/db";
import { User, APPROVAL_STATUSES } from "@/models/User";
import { Job } from "@/models/Job";
import { Application } from "@/models/Application";
import { ok, fail, handle, serialize, requireAdmin } from "@/lib/api";
import { isValidObjectId } from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/** Admin: one recruiter + all of their jobs and applicants (full history). */
export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    if (!isValidObjectId(params.id)) return fail("Recruiter not found.", 404);
    await connectDB();

    const recruiter: any = await User.findOne({
      _id: params.id,
      role: "recruiter",
    })
      .select("-password")
      .lean();
    if (!recruiter) return fail("Recruiter not found.", 404);

    const jobs: any[] = await Job.find({ postedBy: params.id })
      .sort({ createdAt: -1 })
      .lean();

    const applications: any[] = await Application.find({
      kind: "job",
      job: { $in: jobs.map((j) => j._id) },
    })
      .sort({ createdAt: -1 })
      .populate("job")
      .populate(
        "user",
        "firstName lastName email phone college degree department studentType schoolName classGrade graduationYear cgpa linkedin github resumeUrl"
      )
      .lean();

    return ok({
      recruiter: serialize(recruiter),
      jobs: jobs.map((d) => serialize(d)),
      applications: applications.map((d) => serialize(d)),
    });
  });
}

/** Admin: approve / reject / revoke a recruiter's access. */
export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    if (!isValidObjectId(params.id)) return fail("Recruiter not found.", 404);

    const { approvalStatus, rejectionReason } = await req.json();
    if (!APPROVAL_STATUSES.includes(approvalStatus))
      return fail("That approval status is not valid.");

    await connectDB();

    const update: Record<string, any> = {
      approvalStatus,
      rejectionReason: approvalStatus === "rejected" ? rejectionReason ?? "" : "",
      approvedAt: approvalStatus === "approved" ? new Date() : undefined,
    };

    const recruiter: any = await User.findOneAndUpdate(
      { _id: params.id, role: "recruiter" },
      { $set: update },
      { new: true }
    )
      .select("-password")
      .lean();
    if (!recruiter) return fail("Recruiter not found.", 404);

    // Revoking access also hides their live postings from the website.
    if (approvalStatus !== "approved") {
      await Job.updateMany({ postedBy: params.id }, { $set: { active: false } });
    }

    return ok(serialize(recruiter));
  });
}
