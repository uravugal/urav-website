import { connectDB } from "@/lib/db";
import { Service } from "@/models/Service";
import { ok, fail, handle, serialize, requireAdmin } from "@/lib/api";
import { withServiceImage, SERVICE_SURFACE } from "@/lib/serviceMedia";
import { uploadServiceImage, readServiceImageFile } from "@/lib/serviceUploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const includeAll = url.searchParams.get("all") === "1";
    await connectDB();
    const filter = includeAll ? {} : { active: true };
    const services = await Service.find(filter).sort({ createdAt: -1 }).lean();
    // `displayImageUrl` is always set — the placeholder when nothing was
    // uploaded — so callers never have to handle an empty image themselves.
    return ok(
      services.map((c) => withServiceImage(serialize(c, SERVICE_SURFACE)))
    );
  });
}

/**
 * POST — create a service. Admin only.
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
        details: text("details"),
        active: fd.get("active") !== "false",
      };
      image = readServiceImageFile(fd);
    } else {
      const body = await req.json();
      fields = {
        title: String(body.title ?? "").trim(),
        description: body.description || "",
        details: body.details || "",
        active: body.active !== false,
      };
    }

    if (!fields.title) return fail("Service title is required.");

    // Upload before touching the database — a failed upload leaves no row.
    const uploaded = image ? await uploadServiceImage(image) : null;

    await connectDB();
    const service = await Service.create({
      ...fields,
      imageUrl: uploaded?.url ?? "",
      imageKey: uploaded?.key ?? "",
    });

    return ok(withServiceImage(serialize(service, SERVICE_SURFACE)), 201);
  });
}
