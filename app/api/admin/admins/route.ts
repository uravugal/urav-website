import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { hashPassword } from "@/lib/auth";
import { emailExists } from "@/lib/users";
import {
  ok,
  fail,
  handle,
  serialize,
  requireSuperAdmin,
  pageParams,
  paginated,
  searchFilter,
} from "@/lib/api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Admin accounts are never self-registered — only a superadmin can mint
 * them, from the Admins screen in the dashboard. Both endpoints here are
 * behind requireSuperAdmin(), which re-reads the caller's role from the
 * database rather than trusting the JWT.
 */

/** GET — list every admin / superadmin account. Supports ?page= & ?q=. */
export async function GET(req: Request) {
  return handle(async () => {
    await requireSuperAdmin();
    await connectDB();

    const { page, limit, skip, paged, q } = pageParams(req);

    const filter: Record<string, any> = {
      role: { $in: ["admin", "superadmin"] },
    };
    const search = searchFilter(q, ["firstName", "lastName", "email"]);
    if (search) Object.assign(filter, search);

    if (!paged) {
      const admins = await User.find(filter)
        .sort({ createdAt: -1 })
        .select("-password")
        .lean();
      return ok(admins.map((d) => serialize(d)));
    }

    const [admins, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-password")
        .lean(),
      User.countDocuments(filter),
    ]);

    return ok(paginated(admins.map((d) => serialize(d)), total, { page, limit }));
  });
}

/** POST — create a new admin account. */
export async function POST(req: Request) {
  return handle(async () => {
    await requireSuperAdmin();

    const body = await req.json();

    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(body.password ?? "");
    const phone = String(body.phone ?? "").trim();

    if (!firstName) return fail("First name is required.");
    if (!lastName) return fail("Last name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return fail("Please enter a valid email address.");
    if (password.length < 8)
      return fail("Password must be at least 8 characters.");

    /**
     * Deliberately fixed to "admin". A superadmin creates admins — the
     * superadmin tier itself is set directly in the database, so nobody can
     * mint a second superadmin through the UI.
     */
    const role = "admin";

    await connectDB();

    const existing = await emailExists(email);
    if (existing)
      return fail("An account with that email already exists.", 409);

    const admin = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password: await hashPassword(password),
      role,
      approvalStatus: "approved",
    });

    const created: any = await User.findById(admin._id)
      .select("-password")
      .lean();

    return ok(serialize(created), 201);
  });
}
