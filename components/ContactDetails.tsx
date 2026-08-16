import { Mail, Phone, MapPin, Clock, MessageCircle } from "lucide-react";
import { telHref, whatsappHref } from "@/lib/contactDefaults";
import type { ContactInfoRecord } from "@/lib/types";

/**
 * The "Reach us directly" column on /contact.
 *
 * Every row is driven by the record a superadmin edits in the dashboard. A
 * field left blank is dropped rather than rendered as an empty line, which is
 * how "we don't have a second number" is expressed — there is no separate
 * visibility toggle to keep in sync.
 */
export function ContactDetails({ info }: { info: ContactInfoRecord }) {
  const rows: {
    icon: typeof Mail;
    label: string;
    value: string;
    href?: string;
    /** Keep the line breaks the superadmin typed (used for the address). */
    multiline?: boolean;
  }[] = [];

  if (info.email)
    rows.push({
      icon: Mail,
      label: "Email",
      value: info.email,
      href: `mailto:${info.email}`,
    });

  if (info.altEmail)
    rows.push({
      icon: Mail,
      label: "Email",
      value: info.altEmail,
      href: `mailto:${info.altEmail}`,
    });

  if (info.phone)
    rows.push({
      icon: Phone,
      label: "Phone",
      value: info.phone,
      href: telHref(info.phone),
    });

  if (info.altPhone)
    rows.push({
      icon: Phone,
      label: "Phone",
      value: info.altPhone,
      href: telHref(info.altPhone),
    });

  if (info.whatsapp)
    rows.push({
      icon: MessageCircle,
      label: "WhatsApp",
      value: info.whatsapp,
      href: whatsappHref(info.whatsapp),
    });

  if (info.address)
    rows.push({
      icon: MapPin,
      label: "Office",
      value: info.address,
      multiline: true,
    });

  if (info.hours)
    rows.push({ icon: Clock, label: "Hours", value: info.hours });

  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
        Contact details haven&apos;t been added yet. Please use the form to
        reach the URAV team.
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-4">
        {rows.map(({ icon: Icon, label, value, href, multiline }) => (
          <li key={`${label}-${value}`} className="flex items-start gap-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary-light text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {label}
              </p>
              {href ? (
                <a
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className="break-words text-sm font-medium text-dark hover:text-primary"
                >
                  {value}
                </a>
              ) : (
                <p
                  className={`text-sm font-medium text-dark ${
                    multiline ? "whitespace-pre-line" : ""
                  }`}
                >
                  {value}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
