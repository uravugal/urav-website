import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Terms of Service — URAV",
  description: "The terms that govern your use of URAV. Terms for now.",
};

const sections = [
  {
    heading: "1. Acceptance of terms",
    body: "By accessing or using URAV, you agree to be bound by these terms. If you do not agree, please do not use the platform.",
  },
  {
    heading: "2. Accounts",
    body: "You are responsible for keeping your account credentials secure and for all activity that occurs under your account.",
  },
  {
    heading: "3. Acceptable use",
    body: "You agree not to misuse the platform, including attempting to disrupt it, access it without authorisation, or use it for unlawful purposes.",
  },
  {
    heading: "4. Content",
    body: "Content you submit remains yours, but you grant us a licence to host and display it as needed to operate the service.",
  },
  {
    heading: "5. Webinars and jobs",
    body: "Listings for webinars and jobs are provided for convenience. We do not guarantee availability, outcomes or the accuracy of third-party listings.",
  },
  {
    heading: "6. Intellectual property",
    body: "The URAV name, logo and platform are protected. You may not copy or reuse them without permission.",
  },
  {
    heading: "7. Limitation of liability",
    body: "The platform is provided on an as-is basis. To the extent permitted by law, we are not liable for indirect or incidental damages.",
  },
  {
    heading: "8. Changes and termination",
    body: "We may update these terms or suspend access at any time. Continued use after changes means you accept the updated terms.",
  },
  {
    heading: "9. Contact",
    body: "Questions about these terms can be sent through the Contact page.",
  },
];

export default function TermsPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Terms of Service"
      subtitle="The rules and guidelines for using our platform."
    >
      <section className="container-page py-12">
        <div className="mx-auto max-w-3xl rounded-2xl border border-slate-100 bg-white p-8 shadow-sm sm:p-10">
          <p className="text-sm text-slate-400">Last updated: May 2026</p>
          <div className="mt-8 space-y-8">
            {sections.map((s) => (
              <div key={s.heading}>
                <h2 className="font-heading text-lg font-semibold text-dark">
                  {s.heading}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}
