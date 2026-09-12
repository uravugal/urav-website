import type { Metadata } from "next";
import {
  MapPin,
  Briefcase,
  Heart,
  Zap,
  Globe,
  GraduationCap,
  ArrowRight,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Careers — URAV",
  description: "Join the URAV team. Open roles and perks for now.",
};

const perks = [
  {
    icon: Globe,
    title: "Remote-friendly",
    body: "Work from anywhere with flexible hours.",
  },
  {
    icon: GraduationCap,
    title: "Learning budget",
    body: "Grow with courses, books and conferences.",
  },
  {
    icon: Heart,
    title: "Health cover",
    body: "Comprehensive insurance for you and family.",
  },
  {
    icon: Zap,
    title: "Real impact",
    body: "Ship work that reaches thousands of learners.",
  },
];

const roles = [
  {
    title: "Frontend Engineer",
    team: "Engineering",
    location: "Remote",
    type: "Full Time",
  },
  {
    title: "Content Strategist",
    team: "Marketing",
    location: "Bangalore",
    type: "Full Time",
  },
  {
    title: "Community Manager",
    team: "Operations",
    location: "Hybrid",
    type: "Full Time",
  },
  {
    title: "Partnerships Lead",
    team: "Business",
    location: "Remote",
    type: "Full Time",
  },
  {
    title: "Product Designer",
    team: "Design",
    location: "Remote",
    type: "Contract",
  },
];

export default function CareersPage() {
  return (
    <PageShell
      eyebrow="Careers"
      title="Build the future of learning with us"
      subtitle="We're a small team on a big mission. Come help us empower careers."
    >
      {/* Perks */}
      <section className="container-page py-12">
        <h2 className="h2 text-dark">Why URAV</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {perks.map(({ icon: Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-light text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-heading text-base font-semibold text-dark">
                {title}
              </h3>
              <p className="mt-1.5 text-sm text-slate-600">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Open roles */}
      <section className="bg-white">
        <div className="container-page py-14">
          <h2 className="h2 text-dark">Open positions</h2>
          <ul className="mt-8 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
            {roles.map((role) => (
              <li
                key={role.title}
                className="flex flex-col gap-4 p-6 transition-colors hover:bg-light sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="font-heading text-lg font-semibold text-dark">
                    {role.title}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Briefcase className="h-4 w-4" /> {role.team}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" /> {role.location}
                    </span>
                    <span className="rounded-full bg-primary-light px-2.5 py-0.5 text-xs font-medium text-primary">
                      {role.type}
                    </span>
                  </div>
                </div>
                <Button variant="outline" href="/contact" size="sm">
                  Apply <ArrowRight className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-primary px-8 py-12 text-center">
          <h2 className="font-heading text-2xl font-bold text-white">
            Don&apos;t see your role?
          </h2>
          <p className="max-w-md text-primary-light/90">
            Send us your resume and we&apos;ll keep you in mind.
          </p>
          <Button
            variant="outline"
            href="/contact"
            className="mt-2 border-white/30 bg-white text-primary hover:bg-white/90"
          >
            Get in touch
          </Button>
        </div>
      </section>
    </PageShell>
  );
}
