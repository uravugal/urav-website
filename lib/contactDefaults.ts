import type { ContactInfoRecord } from "./types";

/**
 * What /contact shows before a superadmin has saved anything.
 *
 * These are the placeholder details the page used to have hardcoded, kept so
 * a fresh install (or a database that can't be reached for a moment) still
 * renders a complete page instead of an empty column. As soon as the details
 * are saved in the dashboard these disappear.
 *
 * Imported by a client component — no server imports in this file.
 */
export const DEFAULT_CONTACT_INFO: ContactInfoRecord = {
  intro:
    "Questions, partnerships or support — we'd love to hear from you. Send us a message and the team will get back to you.",
  email: "hello@urav.example",
  altEmail: "",
  phone: "+91 00000 00000",
  altPhone: "",
  whatsapp: "",
  address: "Placeholder address, City, India",
  hours: "Mon – Fri, 9:00 AM – 6:00 PM",
};

/** Strip a phone number down to something `tel:` / wa.me will accept. */
export function telHref(value: string): string {
  return `tel:${value.replace(/[^\d+]/g, "")}`;
}

export function whatsappHref(value: string): string {
  return `https://wa.me/${value.replace(/\D/g, "")}`;
}
