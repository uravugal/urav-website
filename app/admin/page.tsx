"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Video,
  Users,
  FileText,
  GraduationCap,
  Building2,
  Clock,
  ArrowRight,
  ShieldCheck,
  MessageSquare,
  Mail,
} from "lucide-react";
import { api } from "@/lib/client";
import { useAuth } from "@/components/AuthProvider";
import { SkeletonStats, Skeleton } from "@/components/ui/Skeleton";

interface Stats {
  students: number;
  jobs: number;
  webinars: number;
  recruiters: number;
  pendingRecruiters: number;
  recruiterJobs: number;
  admins: number;
  consultations: number;
  newConsultations: number;
  contactMessages: number;
  newContactMessages: number;
  jobApplications: number;
  webinarApplications: number;
  totalApplications: number;
}

export default function AdminOverview() {
  const { user } = useAuth();
  const isSuper = user?.role === "superadmin";
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<Stats>("/api/admin/stats")
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    { label: "Students", value: stats?.students, icon: GraduationCap, href: "/admin/students" },
    { label: "Recruiters", value: stats?.recruiters, icon: Building2, href: "/admin/recruiters" },
    { label: "Jobs Posted", value: stats?.jobs, icon: Briefcase, href: "/admin/jobs" },
    { label: "Webinars", value: stats?.webinars, icon: Video, href: "/admin/webinars" },
    {
      label: "Consultations",
      value: stats?.consultations,
      icon: MessageSquare,
      href: "/admin/consultations",
    },
    {
      label: "Contact Messages",
      value: stats?.contactMessages,
      icon: Mail,
      href: "/admin/contact",
    },
    {
      label: "Total Applications",
      value: stats?.totalApplications,
      icon: FileText,
      href: "/admin/applications",
    },
    // Only a superadmin can reach the Admins screen, so only they see the tile.
    ...(isSuper
      ? [
          {
            label: "Admin Accounts",
            value: stats?.admins,
            icon: ShieldCheck,
            href: "/admin/admins",
          },
        ]
      : []),
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-dark">Overview</h1>
      <p className="mt-1 text-sm text-slate-500">
        A snapshot of activity across the platform.
      </p>

      {!loading && (stats?.pendingRecruiters ?? 0) > 0 && (
        <Link
          href="/admin/recruiters"
          className="mt-5 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm hover:bg-warning/15"
        >
          <Clock className="h-4 w-4 shrink-0 text-warning" />
          <span className="text-slate-700">
            {stats?.pendingRecruiters} recruiter
            {stats?.pendingRecruiters === 1 ? "" : "s"} waiting for approval — review and grant
            access.
          </span>
          <ArrowRight className="ml-auto h-4 w-4 text-warning" />
        </Link>
      )}

      {!loading && (stats?.newConsultations ?? 0) > 0 && (
        <Link
          href="/admin/consultations"
          className="mt-3 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary-light/60 px-4 py-3 text-sm hover:bg-primary-light"
        >
          <MessageSquare className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-slate-700">
            {stats?.newConsultations} new consultation request
            {stats?.newConsultations === 1 ? "" : "s"} from students — read and
            reply.
          </span>
          <ArrowRight className="ml-auto h-4 w-4 text-primary" />
        </Link>
      )}

      {!loading && (stats?.newContactMessages ?? 0) > 0 && (
        <Link
          href="/admin/contact"
          className="mt-3 flex items-center gap-3 rounded-lg border border-primary/30 bg-primary-light/60 px-4 py-3 text-sm hover:bg-primary-light"
        >
          <Mail className="h-4 w-4 shrink-0 text-primary" />
          <span className="text-slate-700">
            {stats?.newContactMessages} unread message
            {stats?.newContactMessages === 1 ? "" : "s"} from the contact page.
          </span>
          <ArrowRight className="ml-auto h-4 w-4 text-primary" />
        </Link>
      )}

      {loading ? (
        <div className="mt-6">
          <SkeletonStats count={isSuper ? 8 : 7} />
        </div>
      ) : (
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-xl border border-slate-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-light text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <ArrowRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <p className="mt-4 font-heading text-3xl font-bold text-dark">
              {value ?? 0}
            </p>
            <p className="text-sm text-slate-500">{label}</p>
          </Link>
        ))}
      </div>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-light text-primary">
              <Briefcase className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading font-semibold text-dark">Job applications</p>
              <p className="text-sm text-slate-500">
                {loading ? (
                  <Skeleton className="inline-block h-3.5 w-24 align-middle" />
                ) : (
                  `${stats?.jobApplications ?? 0} received`
                )}
              </p>
            </div>
          </div>
          <Link
            href="/admin/jobs"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Manage jobs
          </Link>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-light text-primary">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading font-semibold text-dark">Recruiter postings</p>
              <p className="text-sm text-slate-500">
                {loading ? (
                  <Skeleton className="inline-block h-3.5 w-40 align-middle" />
                ) : (
                  `${stats?.recruiterJobs ?? 0} of ${
                    stats?.jobs ?? 0
                  } jobs posted by recruiters`
                )}
              </p>
            </div>
          </div>
          <Link
            href="/admin/recruiters"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Manage recruiters
          </Link>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-light text-primary">
              <MessageSquare className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading font-semibold text-dark">
                Student consultations
              </p>
              <p className="text-sm text-slate-500">
                {loading ? (
                  <Skeleton className="inline-block h-3.5 w-32 align-middle" />
                ) : (
                  `${stats?.newConsultations ?? 0} awaiting a first reply`
                )}
              </p>
            </div>
          </div>
          <Link
            href="/admin/consultations"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
          >
            View requests
          </Link>
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary-light text-primary">
              <Video className="h-5 w-5" />
            </span>
            <div>
              <p className="font-heading font-semibold text-dark">Webinar registrations</p>
              <p className="text-sm text-slate-500">
                {loading ? (
                  <Skeleton className="inline-block h-3.5 w-24 align-middle" />
                ) : (
                  `${stats?.webinarApplications ?? 0} registered`
                )}
              </p>
            </div>
          </div>
          <Link
            href="/admin/webinars"
            className="mt-4 inline-flex h-10 items-center rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Manage webinars
          </Link>
        </div>
      </div>
    </div>
  );
}
