import { connectDB } from "@/lib/db";
import { Service } from "@/models/Service";
import { ok, fail, handle, serialize, requireAdmin } from "@/lib/api";
import { withServiceImage, SERVICE_SURFACE } from "@/lib/serviceMedia";
import {
  uploadServiceImage,
  deleteServiceImage,
  readServiceImageFile,
} from "@/lib/serviceUploads";
import { isValidObjectId } from "mongoose";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  return handle(async () => {
    if (!isValidObjectId(params.id)) return fail("Service not found.", 404);
    await connectDB();
    const service = await Service.findById(params.id).lean();
    if (!service) return fail("Service not found.", 404);
    return ok(withServiceImage(serialize(service, SERVICE_SURFACE)));
  });
}

/**
 * PUT — update a service. Admin only.
 *
 * JSON for field-only edits (e.g. toggling `active`), or multipart/form-data
 * when the thumbnail is being added or replaced. `removeImage=true` drops
 * the current image and goes back to the placeholder. The old S3 object is
 * deleted only after the new URL is committed.
 */
export async function PUT(req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    if (!isValidObjectId(params.id)) return fail("Service not found.", 404);

    await connectDB();
    const existing: any = await Service.findById(params.id).lean();
    if (!existing) return fail("Service not found.", 404);

    const contentType = req.headers.get("content-type") ?? "";
    const update: Record<string, any> = {};
    /** Old object to clean up once the new URL is committed. */
    let orphan: { key?: string; url?: string } | null = null;

    if (contentType.includes("multipart/form-data")) {
      const fd = await req.formData();
      const text = (name: string) => String(fd.get(name) ?? "").trim();
      const has = (name: string) => fd.has(name);

      if (has("title")) {
        if (!text("title")) return fail("Service title is required.");
        update.title = text("title");
      }
      if (has("description")) update.description = text("description");
      if (has("details")) update.details = text("details");
      if (has("active")) update.active = fd.get("active") !== "false";

      const image = readServiceImageFile(fd);
      if (image) {
        const uploaded = await uploadServiceImage(image);
        update.imageUrl = uploaded.url;
        update.imageKey = uploaded.key;
        orphan = { key: existing.imageKey, url: existing.imageUrl };
      } else if (fd.get("removeImage") === "true") {
        update.imageUrl = "";
        update.imageKey = "";
        orphan = { key: existing.imageKey, url: existing.imageUrl };
      }
    } else {
      const body = await req.json();
      const allowed = ["title", "description", "details", "active"];
      for (const field of allowed) {
        if (body[field] !== undefined) update[field] = body[field];
      }
    }

    const service = await Service.findByIdAndUpdate(params.id, update, {
      new: true,
      runValidators: true,
    }).lean();
    if (!service) return fail("Service not found.", 404);

    if (orphan) await deleteServiceImage(orphan.key, orphan.url);

    return ok(withServiceImage(serialize(service, SERVICE_SURFACE)));
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  return handle(async () => {
    await requireAdmin();
    if (!isValidObjectId(params.id)) return fail("Service not found.", 404);
    await connectDB();
    const service: any = await Service.findByIdAndDelete(params.id);
    if (!service) return fail("Service not found.", 404);
    await deleteServiceImage(service.imageKey, service.imageUrl);
    return ok({ deleted: true });
  });
}
