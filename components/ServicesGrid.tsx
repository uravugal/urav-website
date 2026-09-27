"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Video,
  Briefcase,
  GraduationCap,
  Users,
  LineChart,
  Building2,
  ArrowRight,
} from "lucide-react";
import { api } from "@/lib/client";
import { serviceImage, SERVICE_FALLBACK_IMAGE } from "@/lib/serviceMedia";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";
import type { ServiceItem } from "@/lib/types";

/**
 * Shown until the admin adds services from the dashboard, so the page is
 * never empty.
 */
const defaultServices = [
  {
    icon: Video,
    title: "Live Webinars",
    body: "Interactive, expert-led sessions across in-demand skills and industries.",
  },
  {
    icon: GraduationCap,
    title: "Skill Certifications",
    body: "Earn recognised certificates that strengthen your profile with recruiters.",
  },
  {
    icon: Briefcase,
    title: "Job Placements",
    body: "A curated jobs board plus one-click applications to top partner companies.",
  },
  {
    icon: Users,
    title: "1:1 Mentoring",
    body: "Personal guidance from industry mentors on career moves and interviews.",
  },
  {
    icon: LineChart,
    title: "Career Consulting",
    body: "Resume reviews, portfolio audits and a clear roadmap for your next role.",
  },
  {
    icon: Building2,
    title: "For Organizations",
    body: "Hiring support, talent pipelines and upskilling programs for teams.",
  },
];

export function ServicesGrid() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ServiceItem[]>("/api/services")
      .then(setServices)
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <SkeletonCard key={i}>
            <Skeleton className="h-4 w-2/3" />
            <SkeletonText className="mt-4" lines={3} />
          </SkeletonCard>
        ))}
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {defaultServices.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="group rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary-light text-primary transition-colors group-hover:bg-primary group-hover:text-white">
              <Icon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 font-heading text-lg font-semibold text-dark">
              {title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((s) => (
        <Link
          key={s._id}
          href={`/services/${s._id}`}
          className="group flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="h-40 w-full overflow-hidden bg-light">
            <img
              src={serviceImage(s)}
              alt={s.title}
              className="h-full w-full object-cover"
              onError={(e) => {
                e.currentTarget.src = SERVICE_FALLBACK_IMAGE;
              }}
            />
          </div>
          <div className="flex flex-1 flex-col p-6">
            <h3 className="font-heading text-lg font-semibold text-dark">
              {s.title}
            </h3>
            {s.description && (
              <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-600">
                {s.description}
              </p>
            )}
            <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
              Learn more <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
