import { connectDB } from "@/lib/db";
import { Course } from "@/models/Course";
import { ok, fail, handle, serialize, requireAdmin } from "@/lib/api";
import { withCourseImage, COURSE_SURFACE } from "@/lib/courseMedia";
import { uploadCourseImage, readCourseImageFile } from "@/lib/courseUploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const includeAll = url.searchParams.get("all") === "1";
    await connectDB();
    const filter = includeAll ? {} : { active: true };
    const courses = await Course.find(filter).sort({ createdAt: -1 }).lean();
    // `displayImageUrl` is always set — the placeholder when nothing was
    // uploaded — so callers never have to handle an empty image themselves.
    return ok(
      courses.map((c) => withCourseImage(serialize(c, COURSE_SURFACE)))
    );
  });
}

/**
 * POST — create a course. Admin only.
 *
 * Accepts multipart/form-data (when a thumbnail is attached, field name
 * `image`) or plain JSON (no image). The image is optional in both cases.
 */
export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin();

    const contentType = req.headers.get("content-type") ?? "";
    const isMultipart = contentType.includes("multipart/form-data");

    let fields: Record<string, any>;
    let image: File | null = null;

    if (isMultipart) {
      const fd = await req.formData();
      const text = (name: string) => String(fd.get(name) ?? "").trim();
      fields = {
        title: text("title"),
        description: text("description"),
        active: fd.get("active") !== "false",
      };
      image = readCourseImageFile(fd);
    } else {
      const body = await req.json();
      fields = {
        title: String(body.title ?? "").trim(),
        description: body.description || "",
        active: body.active !== false,
      };
    }

    if (!fields.title) return fail("Course title is required.");

    // Upload before touching the database — a failed upload leaves no row.
    const uploaded = image ? await uploadCourseImage(image) : null;

    await connectDB();
    const course = await Course.create({
      ...fields,
      imageUrl: uploaded?.url ?? "",
      imageKey: uploaded?.key ?? "",
    });

    return ok(withCourseImage(serialize(course, COURSE_SURFACE)), 201);
  });
}
