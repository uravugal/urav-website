import { connectDB } from "@/lib/db";
import { HeroSlide } from "@/models/HeroSlide";
import { ok, fail, handle, serialize, requireSuperAdmin } from "@/lib/api";
import { uploadHeroImage, readHeroImageFiles } from "@/lib/heroImages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — slides for the homepage slider.
 *
 * `?all=1` returns inactive ones too (used by the dashboard). The public
 * call returns only active slides. An empty array is a valid answer: the
 * Hero component then renders the built-in default slides.
 */
export async function GET(req: Request) {
  return handle(async () => {
    const url = new URL(req.url);
    const includeAll = url.searchParams.get("all") === "1";

    await connectDB();
    const filter = includeAll ? {} : { active: true };
    const slides = await HeroSlide.find(filter)
      .sort({ order: 1, createdAt: 1 })
      .lean();

    return ok(slides.map((d) => serialize(d)));
  });
}

/**
 * POST — create a slide. Superadmin only, multipart/form-data.
 *
 * Fields: title, description, textTone, order, active
 * Files:  desktopImage (required), mobileImage (optional)
 */
export async function POST(req: Request) {
  return handle(async () => {
    await requireSuperAdmin();

    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return fail("Send the slide as multipart/form-data.");
    }

    const fd = await req.formData();
    const text = (name: string) => String(fd.get(name) ?? "").trim();

    const title = text("title");
    if (!title) return fail("Slide title is required.");

    const { desktop, mobile } = readHeroImageFiles(fd);
    if (!desktop) return fail("A desktop image is required.");

    // Upload before touching the database — a failed upload leaves no row.
    const desktopUpload = await uploadHeroImage(desktop);
    const mobileUpload = mobile ? await uploadHeroImage(mobile) : null;

    await connectDB();

    // New slides go to the end of the list unless a position was given.
    const rawOrder = text("order");
    const order = rawOrder ? Number(rawOrder) : await HeroSlide.countDocuments();

    const slide = await HeroSlide.create({
      title,
      description: text("description"),
      textTone: text("textTone") === "dark" ? "dark" : "light",
      desktopImageUrl: desktopUpload.url,
      desktopImageKey: desktopUpload.key,
      mobileImageUrl: mobileUpload?.url ?? "",
      mobileImageKey: mobileUpload?.key ?? "",
      order: Number.isFinite(order) ? order : 0,
      active: fd.get("active") !== "false",
    });

    return ok(serialize(slide), 201);
  });
}
