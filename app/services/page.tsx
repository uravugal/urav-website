import type { Metadata } from "next";
import { Search, ClipboardList, Rocket } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/Button";
import { ServicesGrid } from "@/components/ServicesGrid";

export const metadata: Metadata = {
  title: "Services — URAV",
  description:
    "Explore URAV services — webinars, career mentoring, placements, skill certifications and corporate consulting.",
};

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
      subtitle="From your first webinar to your next role, URAV supports every step of your journey."
    >
      {/* Service cards */}
      <section className="container-page py-12">
        <ServicesGrid />
      </section>

      {/* Process */}
      <section className="bg-white">
        <div className="container-page py-14">
          <h2 className="h2 text-dark">How it works</h2>
          <p className="mt-2 max-w-xl text-slate-600">
            A simple three-step path from learning to landing a role.
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
            Talk to our team and we&apos;ll help you find the right path.
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
