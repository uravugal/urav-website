import type { Metadata } from "next";
import { PageShell } from "@/components/PageShell";
import { ContactForm } from "@/components/ContactForm";
import { ContactDetails } from "@/components/ContactDetails";
import { connectDB } from "@/lib/db";
import { ContactInfo, CONTACT_INFO_KEY } from "@/models/ContactInfo";
import { serialize } from "@/lib/api";
import { DEFAULT_CONTACT_INFO } from "@/lib/contactDefaults";
import { DAILY_MESSAGE_LIMIT } from "@/lib/contactLimit";
import type { ContactInfoRecord } from "@/lib/types";

export const metadata: Metadata = {
  title: "Contact — URAV",
  description:
    "Get in touch with the URAV team — email, phone and a message form.",
};

// The details are editable from the dashboard, so the page is rendered per
// request rather than baked in at build time.
export const dynamic = "force-dynamic";

/**
 * Read the single contact-details document.
 *
 * Falls back to the built-in defaults both when nothing has been saved yet
 * and when the database can't be reached — a contact page that 500s is worse
 * than one showing slightly stale details.
 */
async function loadContactInfo(): Promise<ContactInfoRecord> {
  try {
    await connectDB();
    const doc = await ContactInfo.findOne({ key: CONTACT_INFO_KEY }).lean();
    return doc ? (serialize(doc) as ContactInfoRecord) : DEFAULT_CONTACT_INFO;
  } catch {
    return DEFAULT_CONTACT_INFO;
  }
}

export default async function ContactPage() {
  const info = await loadContactInfo();

  return (
    <PageShell eyebrow="Contact" title="Let's talk" subtitle={info.intro}>
      <section className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          {/* Contact details */}
          <div>
            <h2 className="h3 text-dark">Reach us directly</h2>
            <p className="mt-2 text-sm text-slate-600">
              Prefer to talk? Here&apos;s where to find us.
            </p>
            <div className="mt-6">
              <ContactDetails info={info} />
            </div>
          </div>

          {/* Form */}
          <div>
            <h2 className="h3 text-dark">Send a message</h2>
            <p className="mt-2 text-sm text-slate-600">
              Fill in the form and we&apos;ll get back to you soon — up to{" "}
              {DAILY_MESSAGE_LIMIT} messages a day.
            </p>
            <div className="mt-6">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
