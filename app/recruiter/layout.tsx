"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  UserCog,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/components/AuthProvider";
import { SkeletonPage } from "@/components/ui/Skeleton";
import { isAdminRole } from "@/lib/types";
import { NavProgressBar } from "@/components/NavProgress";

const nav = [
  { href: "/recruiter", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/recruiter/jobs", label: "My Jobs", icon: Briefcase },
  { href: "/recruiter/applicants", label: "Applicants", icon: Users },
  { href: "/recruiter/profile", label: "My Profile", icon: UserCog },
];

export default function RecruiterLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login?redirect=/recruiter");
    else if (isAdminRole(user.role)) router.replace("/admin");
    else if (user.role !== "recruiter") router.replace("/dashboard");
  }, [user, loading, router]);

  if (loading || !user || user.role !== "recruiter") {
    return (
      <div className="min-h-screen bg-light">
        <div className="mx-auto max-w-6xl p-5 sm:p-8">
          <SkeletonPage />
        </div>
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <div className="min-h-screen bg-light lg:flex">
      <NavProgressBar className="fixed inset-x-0 top-0 z-50" />
      <aside className="border-b border-slate-200 bg-white lg:min-h-screen lg:w-64 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between p-5">
          <Link href="/" className="flex items-center gap-2">
            <Logo size={32} />
            <span className="font-heading text-lg font-bold text-dark">URAV Recruiter</span>
          </Link>
        </div>

        {user.companyName && (
          <p className="-mt-2 truncate px-5 pb-3 text-xs text-slate-400">{user.companyName}</p>
        )}

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:pb-0">
          {nav.map(({ href, label, icon: Icon, exact }) => {
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

      <div className="flex-1">
        <div className="mx-auto max-w-6xl p-5 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
