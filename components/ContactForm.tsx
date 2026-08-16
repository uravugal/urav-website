"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Send, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { api } from "@/lib/client";
import { useAuth } from "@/components/AuthProvider";
import {
  DAILY_MESSAGE_LIMIT,
  timeUntil,
  type ContactQuota,
} from "@/lib/contactLimit";

const fieldClass =
  "w-full rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-dark placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:bg-slate-50 disabled:text-slate-400";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Quota reported by the API, plus whether it refers to a real address yet. */
type Quota = ContactQuota & { known?: boolean };

/**
 * The "Send a message" form on /contact.
 *
 * Messages are stored in MongoDB and read from the dashboard. Each sender may
 * send three a day: the count is shown here *before* anything is typed so
 * nobody writes a long message they can't send, and the server enforces the
 * same limit independently — this is the friendly half of it, not the
 * protection.
 *
 * The allowance follows the email address (plus the account, when signed in),
 * so it is looked up again whenever the address changes.
 */
export function ContactForm() {
  const { user, loading: authLoading } = useAuth();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [quota, setQuota] = useState<Quota | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  // Pre-fill from the signed-in profile, filling blanks only so it never
  // overwrites something already typed.
  useEffect(() => {
    if (authLoading || !user) return;
    setForm((f) => ({
      ...f,
      name: f.name || user.name || "",
      email: f.email || user.email || "",
    }));
  }, [user, authLoading]);

  /** Ignore a slow lookup that lands after a newer one. */
  const requestId = useRef(0);

  const loadQuota = useCallback(async (email: string) => {
    const id = ++requestId.current;
    try {
      const q = await api<Quota>(
        `/api/contact${email ? `?email=${encodeURIComponent(email)}` : ""}`
      );
      if (id === requestId.current) setQuota(q);
    } catch {
      // The allowance line is a convenience — if it can't be read the form
      // still works and the server still enforces the limit on submit.
      if (id === requestId.current) setQuota(null);
    }
  }, []);

  // Look the allowance up once the address looks like an address, debounced so
  // it isn't refetched on every keystroke.
  useEffect(() => {
    const email = form.email.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      setQuota(null);
      return;
    }
    const t = setTimeout(() => loadQuota(email), 400);
    return () => clearTimeout(t);
  }, [form.email, loadQuota]);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  const exhausted = quota?.known === true && quota.remaining === 0;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending || exhausted) return;

    setError("");
    setSending(true);
    try {
      const result = await api<{ quota: Quota }>("/api/contact", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setQuota({ ...result.quota, known: true });
      setSent(true);
    } catch (err: any) {
      setError(err?.message ?? "Could not send your message. Please try again.");
      // A 429 means the count moved on without us (another tab, or a stale
      // reading) — refresh it so the notice matches reality.
      if (err?.status === 429) loadQuota(form.email.trim().toLowerCase());
    } finally {
      setSending(false);
    }
  }

  function sendAnother() {
    setForm((f) => ({ ...f, subject: "", message: "" }));
    setError("");
    setSent(false);
  }

  /* ---------------------------------------------------------------- */
  /* Confirmation                                                      */
  /* ---------------------------------------------------------------- */

  if (sent) {
    const left = quota?.remaining ?? 0;
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-sm">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-success/10 text-success">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <h3 className="font-heading text-lg font-semibold text-dark">
          Message sent
        </h3>
        <p className="max-w-sm text-sm text-slate-600">
          Thanks for reaching out — the URAV team has your message and will
          reply to {form.email} soon.
        </p>

        <p className="max-w-sm text-sm text-slate-500">
          {left > 0 ? (
            <>
              You have {left} of {DAILY_MESSAGE_LIMIT} message
              {left === 1 ? "" : "s"} left today.
            </>
          ) : (
            <>
              That was your {DAILY_MESSAGE_LIMIT} messages for today. You can
              send another tomorrow, {timeUntil(quota?.resetsAt)}.
            </>
          )}
        </p>

        {left > 0 && (
          <button
            onClick={sendAnother}
            className="mt-2 text-sm font-medium text-primary hover:underline"
          >
            Send another message
          </button>
        )}
      </div>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Form                                                              */
  /* ---------------------------------------------------------------- */

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8"
    >
      {/* Allowance. Always visible, so the rule is never a surprise. */}
      <div
        className={`mb-5 flex items-start gap-2.5 rounded-lg px-4 py-3 text-sm ${
          exhausted
            ? "bg-warning/10 text-slate-700"
            : "bg-primary-light/60 text-slate-700"
        }`}
      >
        <Clock
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            exhausted ? "text-warning" : "text-primary"
          }`}
        />
        {exhausted ? (
          <span>
            <span className="font-medium text-dark">
              You&apos;ve used all {DAILY_MESSAGE_LIMIT} messages for today.
            </span>{" "}
            The form opens again tomorrow ({timeUntil(quota?.resetsAt)}). If
            it&apos;s urgent, please call or email us using the details on the
            left.
          </span>
        ) : quota?.known ? (
          <span>
            <span className="font-medium text-dark">
              {quota.remaining} of {DAILY_MESSAGE_LIMIT} message
              {quota.remaining === 1 ? "" : "s"} left today
            </span>{" "}
            for {form.email.trim().toLowerCase()} — the allowance resets at
            midnight.
          </span>
        ) : (
          <span>
            You can send up to{" "}
            <span className="font-medium text-dark">
              {DAILY_MESSAGE_LIMIT} messages a day
            </span>
            . The count resets at midnight.
          </span>
        )}
      </div>

      <fieldset disabled={exhausted || sending} className="disabled:opacity-70">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-dark"
              htmlFor="name"
            >
              Full name<span className="ml-0.5 text-danger">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Your name"
              className={fieldClass}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-dark"
              htmlFor="email"
            >
              Email<span className="ml-0.5 text-danger">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="you@example.com"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-dark"
              htmlFor="phone"
            >
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="Optional"
              className={fieldClass}
            />
          </div>
          <div>
            <label
              className="mb-1.5 block text-sm font-medium text-dark"
              htmlFor="subject"
            >
              Subject
            </label>
            <input
              id="subject"
              name="subject"
              value={form.subject}
              onChange={(e) => set("subject", e.target.value)}
              placeholder="How can we help?"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="mt-4">
          <label
            className="mb-1.5 block text-sm font-medium text-dark"
            htmlFor="message"
          >
            Message<span className="ml-0.5 text-danger">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            maxLength={4000}
            value={form.message}
            onChange={(e) => set("message", e.target.value)}
            placeholder="Write your message…"
            className={`${fieldClass} resize-y`}
          />
          <p className="mt-1 text-right text-xs text-slate-400">
            {form.message.length}/4000
          </p>
        </div>

        {error && (
          <p className="mt-4 flex items-start gap-2 rounded-md bg-danger/5 px-3 py-2 text-sm text-danger">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={exhausted || sending}
          className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-6 text-[15px] font-medium text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          {sending
            ? "Sending…"
            : exhausted
              ? "Daily limit reached"
              : "Send message"}
        </button>
      </fieldset>
    </form>
  );
}
