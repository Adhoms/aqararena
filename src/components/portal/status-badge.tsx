const LABELS: Record<string, { text: string; className: string }> = {
  DRAFT: { text: "مسودة", className: "admin-badge-off" },
  PENDING: { text: "قيد المراجعة", className: "admin-badge" },
  APPROVED: { text: "اتوافق عليه ✓", className: "inline-flex items-center rounded-full bg-brand/10 px-2.5 py-0.5 text-xs text-brand" },
  REJECTED: { text: "محتاج تعديل", className: "inline-flex items-center rounded-full bg-red-600/10 px-2.5 py-0.5 text-xs text-red-700 dark:text-red-300" },
};

export function SubmissionStatusBadge({ status }: { status: string }) {
  const s = LABELS[status] ?? { text: status, className: "admin-badge-off" };
  return <span className={s.className}>{s.text}</span>;
}
