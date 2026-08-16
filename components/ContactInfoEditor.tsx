"use client";

import { useEffect, useState } from "react";
import { Save, CheckCircle2, AlertCircle, RotateCcw } from "lucide-react";
import { api } from "@/lib/client";
import { Skeleton } from "@/components/ui/Skeleton";
import { DEFAULT_CONTACT_INFO } from "@/lib/contactDefaults";
import type { ContactInfoRecord } from "@/lib/types";

const fieldClass =
  "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-dark placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

type FormState = {
  intro: string;
  email: string;
  altEmail: string;
  phone: string;
  altPhone: string;
  whatsapp: string;
  address: string;
  hours: string;
};

const EMPTY: FormState = {
  intro: "",
  email: "",
  altEmail: "",
  phone: "",
  altPhone: "",
  whatsapp: "",
  address: "",
  hours: "",
};

function toForm(info: ContactInfoRecord | null): FormState {
  if (!info) return { ...EMPTY };
  return {
    intro: info.intro ?? "",
    email: info.email ?? "",
    altEmail: info.altEmail ?? "",
    phone: info.phone ?? "",
    altPhone: info.altPhone ?? "",
    whatsapp: info.whatsapp ?? "",
    address: info.address ?? "",
    hours: info.hours ?? "",
  };
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-dark">
        {label}
        {hint && (
          <span className="ml-2 text-xs font-normal text-slate-400">{hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}

/**
 * Superadmin editor for what /contact shows.
 *
 * Saving writes the one contact-details document; a blank field is a
 * deliberate "don't show this row" rather than "leave it as it was", which is
 * how a second phone number gets removed. Until anything is saved the public
 * page shows the built-in defaults, and "Load the current defaults" copies
 * those into the form so they can be edited instead of retyped.
 */
export function ContactInfoEditor() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saved, setSaved] = useState<ContactInfoRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    api<ContactInfoRecord | null>("/api/contact-info")
      .then((info) => {
        setSaved(info);
        setForm(toForm(info));
      })
      .catch((e: any) =>
        setError(e?.message ?? "Could not load the contact details.")
      )
      .finally(() => setLoading(false));
  }, []);

  function set(key: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setDone(false);
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const info = await api<ContactInfoRecord>("/api/contact-info", {
        method: "PUT",
        body: JSON.stringify(form),
      });
      setSaved(info);
      setForm(toForm(info));
      setDone(true);
    } catch (e: any) {
      setError(e?.message ?? "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  const editor =
    saved?.updatedBy && typeof saved.updatedBy === "object"
      ? `${saved.updatedBy.firstName} ${saved.updatedBy.lastName}`
      : null;

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold text-dark">
            Contact page details
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            These appear in the &ldquo;Reach us directly&rdquo; column on{" "}
            <span className="font-medium text-dark">/contact</span>. Leave a
            field blank to hide that row.
          </p>
        </div>
        {!saved && (
          <button
            onClick={() => setForm(toForm(DEFAULT_CONTACT_INFO))}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:border-primary/40 hover:text-primary"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Load the current defaults
          </button>
        )}
      </div>

      {!saved && (
        <p className="mt-4 rounded-lg bg-warning/10 px-4 py-3 text-sm text-slate-700">
          Nothing has been saved yet, so the page is still showing the built-in
          placeholder details. The first save replaces them.
        </p>
      )}

      <div className="mt-5 space-y-4">
        <Field label="Intro line" hint="shown under the page title">
          <textarea
            rows={2}
            maxLength={400}
            value={form.intro}
            onChange={(e) => set("intro", e.target.value)}
            placeholder="Questions, partnerships or support — we'd love to hear from you."
            className={fieldClass}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="hello@urav.in"
              className={fieldClass}
            />
          </Field>
          <Field label="Second email" hint="optional">
            <input
              type="email"
              value={form.altEmail}
              onChange={(e) => set("altEmail", e.target.value)}
              placeholder="careers@urav.in"
              className={fieldClass}
            />
          </Field>

          <Field label="Phone">
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+91 98765 43210"
              className={fieldClass}
            />
          </Field>
          <Field label="Second phone" hint="optional">
            <input
              value={form.altPhone}
              onChange={(e) => set("altPhone", e.target.value)}
              placeholder="+91 98765 43211"
              className={fieldClass}
            />
          </Field>

          <Field label="WhatsApp" hint="with country code, e.g. 919876543210">
            <input
              value={form.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              placeholder="919876543210"
              className={fieldClass}
            />
          </Field>
          <Field label="Office hours">
            <input
              value={form.hours}
              onChange={(e) => set("hours", e.target.value)}
              placeholder="Mon – Fri, 9:00 AM – 6:00 PM"
              className={fieldClass}
            />
          </Field>
        </div>

        <Field label="Office address" hint="line breaks are kept">
          <textarea
            rows={3}
            maxLength={500}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder={"URAV\n12 Example Street\nChennai 600001"}
            className={fieldClass}
          />
        </Field>
      </div>

      {error && (
        <p className="mt-4 flex items-start gap-2 rounded-md bg-danger/5 px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save details"}
        </button>

        <button
          onClick={() => {
            setForm(toForm(saved));
            setError("");
            setDone(false);
          }}
          disabled={saving}
          className="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-light disabled:opacity-60"
        >
          Undo changes
        </button>

        {done && (
          <span className="inline-flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" /> Saved — the contact page is
            updated.
          </span>
        )}
        {!done && editor && (
          <span className="text-xs text-slate-400">
            Last saved by {editor}
          </span>
        )}
      </div>
    </div>
  );
}
