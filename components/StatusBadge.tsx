const styles: Record<string, string> = {
  // Job statuses
  Applied: "bg-primary-light text-primary",
  "Under Review": "bg-warning/10 text-warning",
  Shortlisted: "bg-indigo-50 text-indigo-600",
  Interview: "bg-purple-50 text-purple-600",
  Accepted: "bg-success/10 text-success",
  Rejected: "bg-danger/10 text-danger",
  // Webinar statuses
  Registered: "bg-primary-light text-primary",
  Confirmed: "bg-success/10 text-success",
  Attended: "bg-emerald-50 text-emerald-600",
  Cancelled: "bg-slate-100 text-slate-500",
  // Consultation + contact message statuses
  New: "bg-primary-light text-primary",
  "In Progress": "bg-warning/10 text-warning",
  Responded: "bg-success/10 text-success",
  Read: "bg-slate-100 text-slate-600",
  Replied: "bg-success/10 text-success",
  Closed: "bg-slate-100 text-slate-500",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = styles[status] ?? "bg-slate-100 text-slate-600";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${cls}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status}
    </span>
  );
}
