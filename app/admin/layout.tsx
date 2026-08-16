"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Video,
  Users,
  GraduationCap,
  Building2,
  ShieldCheck,
  MessageSquare,
  Mail,
  Images,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { isAdminRole } from "@/lib/types";

/**
 * `superOnly` entries are hidden from ordinary admins. The API routes
 * behind them enforce the same rule server-side, so hiding the link is a
 * convenience rather than the actual protection.
 */
const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/students", label: "Students", icon: GraduationCap },
  { href: "/admin/recruiters", label: "Recruiters", icon: Building2 },
  { href: "/admin/jobs", label: "Jobs", icon: Briefcase },
  { href: "/admin/webinars", label: "Webinars", icon: Video },
  { href: "/admin/applications", label: "Applications", icon: Users },
  {
    href: "/admin/consultations",
    label: "Consultations",
    icon: MessageSquare,
  },
  { href: "/admin/contact", label: "Contact", icon: Mail },
  {
    href: "/admin/hero",
    label: "Home slider",
    icon: Images,
    superOnly: true,
  },
  {
    href: "/admin/admins",
    label: "Admins",
    icon: ShieldCheck,
    superOnly: true,
  },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?redirect=/admin");
    else if (!isAdminRole(user.role)) router.replace("/");
  }, [user, loading, router]);

  if (loading || !user || !isAdminRole(user.role)) {
    return (
      <div className="min-h-screen bg-light">
        <div className="mx-auto max-w-6xl p-5 sm:p-8">
          <SkeletonPage />
        </div>
      </div>
    );
  }

  const isSuper = user.role === "superadmin";
  const visibleNav = nav.filter((n) => !n.superOnly || isSuper);

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-light lg:flex">
      {/* Sidebar */}
      <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between p-5">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} />
            <span className="font-heading text-lg font-bold text-dark">URAV Admin</span>
          </Link>
        </div>

        {isSuper && (
          <p className="-mt-2 px-5 pb-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-light px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <ShieldCheck className="h-3 w-3" /> Superadmin
            </span>
          </p>
        )}

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
          {visibleNav.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`inline-flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-white"
                    : "text-slate-600 hover:bg-light hover:text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden border-t border-slate-100 p-3 lg:mt-auto lg:block">
          <Link
            href="/"
            className="mb-1 inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-light"
          >
            <ExternalLink className="h-4 w-4" /> View site
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-light hover:text-danger"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1">
        <div className="mx-auto max-w-6xl p-5 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
