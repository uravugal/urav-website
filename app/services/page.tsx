import type { Metadata } from "next";
import {
  Video,
  Briefcase,
  GraduationCap,
  Users,
  LineChart,
  Building2,
  Search,
  ClipboardList,
  Rocket,
  ArrowRight,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Services — URAV",
  description:
    "Explore URAV services — webinars, career mentoring, placements, skill certifications and corporate consulting.",
};

const services = [
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

const process = [
  {
    icon: Search,
    step: "01",
    title: "Discover",
    body: "Explore webinars and roles matched to your goals.",
  },
  {
    icon: ClipboardList,
    step: "02",
    title: "Learn",
    body: "Attend sessions and earn certifications that count.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Grow",
    body: "Apply, get mentored and land your next opportunity.",
  },
];

export default function ServicesPage() {
  return (
    <PageShell
      eyebrow="Our Services"
      title="Everything you need to grow"
      subtitle="Placeholder intro — replace later. From your first webinar to your next role, URAV supports every step of your journey."
    >
      {/* Service cards */}
      <section className="container-page py-12">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(({ icon: Icon, title, body }) => (
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
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {body}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                Learn more <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Process */}
      <section className="bg-white">
        <div className="container-page py-14">
          <h2 className="h2 text-dark">How it works</h2>
          <p className="mt-2 max-w-xl text-slate-600">
            Placeholder section — a simple three-step path from learning to
            landing a role.
          </p>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {process.map(({ icon: Icon, step, title, body }) => (
              <div key={step} className="relative rounded-2xl bg-light p-6">
                <span className="font-heading text-4xl font-bold text-primary/15">
                  {step}
                </span>
                <span className="mt-2 grid h-11 w-11 place-items-center rounded-xl bg-primary-light text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-heading text-lg font-semibold text-dark">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-16">
        <div className="flex flex-col items-center gap-4 rounded-2xl bg-primary px-8 py-12 text-center">
          <h2 className="font-heading text-2xl font-bold text-white">
            Not sure where to start?
          </h2>
          <p className="max-w-md text-primary-light/90">
            Placeholder copy — talk to our team and we&apos;ll help you find the
            right path.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Button
              variant="outline"
              href="/contact"
              className="border-white/30 bg-white text-primary hover:bg-white/90"
            >
              Contact us
            </Button>
            <Button
              variant="ghost"
              href="/webinars"
              className="text-white hover:bg-white/10"
            >
              Browse webinars
            </Button>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
