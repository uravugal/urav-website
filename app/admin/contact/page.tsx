"use client";

import { useState } from "react";
import {
  Mail,
  Phone,
  Search,
  Clock,
  Trash2,
  Send,
  StickyNote,
  User as UserIcon,
  Inbox,
  Settings2,
} from "lucide-react";
import { api } from "@/lib/client";
import { useAuth } from "@/components/AuthProvider";
import { usePaginatedList } from "@/lib/usePaginatedList";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonList } from "@/components/ui/Skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { ContactInfoEditor } from "@/components/ContactInfoEditor";
import { DAILY_MESSAGE_LIMIT } from "@/lib/contactLimit";
import {
  CONTACT_MESSAGE_STATUSES,
  type ContactMessageRecord,
  type ContactMessageStatus,
} from "@/lib/types";

const STATUSES = CONTACT_MESSAGE_STATUSES as readonly ContactMessageStatus[];

type Tab = "all" | ContactMessageStatus;

function formatDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

/** One message, with its own reply / note editor. */
function MessageCard({
  item,
  isSuper,
  onPatched,
  onDeleted,
}: {
  item: ContactMessageRecord;
  isSuper: boolean;
  onPatched: (updated: ContactMessageRecord) => void;
  onDeleted: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState(item.reply ?? "");
  const [note, setNote] = useState(item.internalNote ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function patch(body: Record<string, any>) {
    setBusy(true);
    setError("");
    try {
      const updated = await api<ContactMessageRecord>(
        `/api/admin/contact-messages/${item._id}`,
        { method: "PATCH", body: JSON.stringify(body) }
      );
      onPatched(updated);
      return true;
    } catch (e: any) {
      setError(e?.message ?? "Could not save. Please try again.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function saveReply() {
    // Recording a reply moves the message to "Replied" unless it has already
    // been closed — no point making the admin change two things.
    const body: Record<string, any> = { reply, internalNote: note };
    if (reply.trim() && item.status !== "Closed") body.status = "Replied";
    if (await patch(body)) setOpen(false);
  }

  async function remove() {
    if (!confirm(`Delete the message from ${item.name}? This cannot be undone.`))
      return;
    setBusy(true);
    try {
      await api(`/api/admin/contact-messages/${item._id}`, { method: "DELETE" });
      onDeleted(item._id);
    } catch (e: any) {
      setError(e?.message ?? "Could not delete this message.");
      setBusy(false);
    }
  }

  const sender = typeof item.user === "object" ? item.user : null;

  return (
    <div className="rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary-light font-heading font-semibold text-primary">
            {(item.name?.[0] ?? "?").toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-heading font-semibold text-dark">
              {item.name}
              {sender && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
                  <UserIcon className="h-3 w-3" /> Registered {sender.role ?? "user"}
                </span>
              )}
            </p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <a
                href={`mailto:${item.email}`}
                className="inline-flex items-center gap-1 hover:text-primary"
              >
                <Mail className="h-3 w-3" /> {item.email}
              </a>
              {item.phone && (
                <a
                  href={`tel:${item.phone}`}
                  className="inline-flex items-center gap-1 hover:text-primary"
                >
                  <Phone className="h-3 w-3" /> {item.phone}
                </a>
              )}
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatDate(item.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={item.status} />
          <select
            value={item.status}
            disabled={busy}
            onChange={(e) => patch({ status: e.target.value })}
            className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          {isSuper && (
            <button
              onClick={remove}
              disabled={busy}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:border-danger/40 hover:text-danger disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>

      {/* The message itself */}
      <div className="mt-4 border-t border-slate-100 pt-4">
        {item.subject && (
          <p className="text-sm font-medium text-dark">{item.subject}</p>
        )}
        <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
          {item.message}
        </p>
      </div>

      {/* Existing reply / note */}
      {(item.reply || item.internalNote) && !open && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          {item.reply && (
            <div className="rounded-lg bg-primary-light/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
                Reply recorded
                {item.repliedAt && ` · ${formatDate(item.repliedAt)}`}
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-dark">
                {item.reply}
              </p>
            </div>
          )}
          {item.internalNote && (
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <StickyNote className="h-3 w-3" /> Internal note
              </p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">
                {item.internalNote}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reply editor */}
      <div className="mt-4 border-t border-slate-100 pt-4">
        {open ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Reply
                <span className="ml-2 text-xs font-normal text-slate-400">
                  kept here as the record of what was sent
                </span>
              </label>
              <textarea
                rows={4}
                maxLength={4000}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="What was sent back to them…"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Internal note
                <span className="ml-2 text-xs font-normal text-slate-400">
                  admin only
                </span>
              </label>
              <textarea
                rows={2}
                maxLength={2000}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Context for the team…"
                className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <div className="flex gap-2">
              <button
                onClick={saveReply}
                disabled={busy}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
              >
                <Send className="h-4 w-4" /> {busy ? "Saving…" : "Save reply"}
              </button>
              <button
                onClick={() => {
                  setReply(item.reply ?? "");
                  setNote(item.internalNote ?? "");
                  setError("");
                  setOpen(false);
                }}
                disabled={busy}
                className="inline-flex h-10 items-center rounded-md border border-slate-200 px-4 text-sm font-medium text-slate-600 hover:bg-light disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <a
              href={`mailto:${item.email}?subject=${encodeURIComponent(
                item.subject ? `Re: ${item.subject}` : "Your message to URAV"
              )}`}
              onClick={() => {
                if (item.status === "New") patch({ status: "Read" });
              }}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:border-primary/40 hover:text-primary"
            >
              <Mail className="h-3.5 w-3.5" /> Reply by email
            </a>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-600 hover:border-primary/40 hover:text-primary"
            >
              <Send className="h-3.5 w-3.5" />
              {item.reply ? "Edit reply" : "Record reply"}
            </button>
            {item.handledBy && typeof item.handledBy === "object" && (
              <span className="text-xs text-slate-400">
                Last handled by {item.handledBy.firstName}{" "}
                {item.handledBy.lastName}
              </span>
            )}
            {error && <span className="text-sm text-danger">{error}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminContactPage() {
  const { user } = useAuth();
  const isSuper = user?.role === "superadmin";

  const [view, setView] = useState<"messages" | "details">("messages");
  const [tab, setTab] = useState<Tab>("all");

  const list = usePaginatedList<ContactMessageRecord>({
    path: "/api/admin/contact-messages",
    params: { status: tab === "all" ? undefined : tab },
  });

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "all", label: "All", count: list.counts.all },
    ...STATUSES.map((s) => ({
      key: s as Tab,
      label: s,
      count: list.counts[s],
    })),
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-dark">Contact</h1>
      <p className="mt-1 text-sm text-slate-500">
        Messages sent from the contact page, and — for a superadmin — the
        details the page shows. Each sender can send{" "}
        {DAILY_MESSAGE_LIMIT} messages a day.
      </p>

      {/* Only a superadmin gets the second view, so ordinary admins see no
          switch at all rather than a tab that refuses to open. */}
      {isSuper && (
        <div className="mt-5 flex w-fit gap-1 rounded-lg border border-slate-200 bg-white p-1">
          {(
            [
              { key: "messages", label: "Messages", icon: Inbox },
              { key: "details", label: "Page details", icon: Settings2 },
            ] as const
          ).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setView(key)}
              className={`inline-flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium ${
                view === key
                  ? "bg-primary text-white"
                  : "text-slate-600 hover:bg-light"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
      )}

      {isSuper && view === "details" ? (
        <div className="mt-5">
          <ContactInfoEditor />
        </div>
      ) : (
        <>
          {/* Status tabs + search */}
          <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-1 lg:w-fit">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium ${
                    tab === t.key
                      ? "bg-primary text-white"
                      : "text-slate-600 hover:bg-light"
                  }`}
                >
                  {t.label}
                  {t.count !== undefined && ` (${t.count})`}
                </button>
              ))}
            </div>

            <div className="relative lg:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={list.query}
                onChange={(e) => list.setQuery(e.target.value)}
                placeholder="Search name, email, subject or message"
                className="h-11 w-full rounded-md border border-slate-200 bg-white pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
          </div>

          <div className="mt-5">
            {list.loading ? (
              <SkeletonList rows={3} />
            ) : list.error ? (
              <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-sm text-danger">
                {list.error}
              </div>
            ) : list.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <Inbox className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-4 font-heading text-lg font-semibold text-dark">
                  {list.query
                    ? "No messages match that search"
                    : "No messages yet"}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {list.query
                    ? "Try a different name, email or keyword."
                    : "Messages sent from the contact page will appear here."}
                </p>
              </div>
            ) : (
              <div
                className={`space-y-3 transition-opacity ${
                  list.fetching ? "opacity-60" : ""
                }`}
              >
                {list.items.map((item) => (
                  <MessageCard
                    key={item._id}
                    item={item}
                    isSuper={isSuper}
                    onPatched={(updated) =>
                      list.patchItem((m) => m._id === updated._id, updated)
                    }
                    onDeleted={(id) => {
                      list.removeItem((m) => m._id === id);
                      list.reload();
                    }}
                  />
                ))}
              </div>
            )}

            <Pagination
              page={list.page}
              pages={list.pages}
              total={list.total}
              limit={list.limit}
              onPageChange={list.setPage}
              onLimitChange={list.setLimit}
              busy={list.fetching}
              label="messages"
            />
          </div>
        </>
      )}
    </div>
  );
}
