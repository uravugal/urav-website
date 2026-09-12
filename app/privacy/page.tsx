import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";

export const metadata: Metadata = {
  title: "Privacy Policy — URAV",
  description:
    "How URAV collects, uses and protects your information. Policy for now.",
};

const sections = [
  {
    heading: "1. Information we collect",
    body: "We may collect information you provide directly, such as your name, email and profile details, along with usage data about how you interact with the platform.",
  },
  {
    heading: "2. How we use information",
    body: "We use your information to provide and improve our services, personalise your experience, send relevant updates, and keep the platform secure.",
  },
  {
    heading: "3. Sharing and disclosure",
    body: "We do not sell your personal data. We may share information with trusted service providers who help us operate the platform, subject to appropriate safeguards.",
  },
  {
    heading: "4. Cookies and tracking",
    body: "We use cookies and similar technologies to remember your preferences and understand how the platform is used. You can control cookies through your browser settings.",
  },
  {
    heading: "5. Data security",
    body: "We take reasonable technical and organisational measures to protect your information, though no method of transmission over the internet is fully secure.",
  },
  {
    heading: "6. Your rights",
    body: "Depending on your location, you may have the right to access, correct or delete your data, and to object to certain processing. Contact us to exercise these rights.",
  },
  {
    heading: "7. Changes to this policy",
    body: "We may update this policy from time to time. Material changes will be communicated through the platform or by email.",
  },
  {
    heading: "8. Contact us",
    body: "If you have questions about this policy, reach out to us via the Contact page.",
  },
];

export default function PrivacyPage() {
  return (
    <PageShell
      eyebrow="Legal"
      title="Privacy Policy"
      subtitle="How we collect, use, and protect your information."
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
