import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteButton } from "@/components/admin/admin-form";
import { deleteMessage, setMessageStatus } from "../portal-actions";

const KIND = { SUGGESTION: "اقتراح", COMPLAINT: "شكوى", HELP: "مساعدة", REQUEST: "طلب", OTHER: "أخرى" } as const;
const TONE = {
  COMPLAINT: "bg-red-600/10 text-red-700 dark:text-red-300",
  SUGGESTION: "bg-brand/10 text-brand",
  HELP: "bg-brass-soft text-brass-dark",
  REQUEST: "bg-brass-soft text-brass-dark",
  OTHER: "bg-divider text-muted",
} as const;
const when = (d: Date) => d.toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function MessagesPage({ searchParams }: PageProps<"/admin/messages">) {
  await requireAdmin();
  const { show } = await searchParams;
  const done = show === "done";
  const [messages, newCount] = await Promise.all([
    db.contactMessage.findMany({ where: { status: done ? "DONE" : "NEW" }, orderBy: { createdAt: "desc" }, take: 200 }),
    db.contactMessage.count({ where: { status: "NEW" } }),
  ]);

  return (
    <AdminShell
      title="رسائل الزوار"
      back={{ href: "/admin", label: "لوحة التحكم" }}
      actions={
        <div className="flex gap-2">
          <Link href="/admin/messages" className={done ? "admin-btn-ghost" : "admin-btn"}>
            جديدة ({newCount})
          </Link>
          <Link href="/admin/messages?show=done" className={done ? "admin-btn" : "admin-btn-ghost"}>
            اتردّ عليها
          </Link>
        </div>
      }
    >
      {messages.length === 0 && <p className="admin-panel text-sm text-muted">{done ? "مافيش رسائل متقفلة." : "مافيش رسائل جديدة."}</p>}
      {messages.map((m) => {
        const reply = m.email ? `mailto:${m.email}?subject=${encodeURIComponent("رد من AqarArena")}` : undefined;
        const wa = m.phone ? `https://wa.me/${m.phone.replace(/\D/g, "").replace(/^0/, "20")}` : undefined;
        return (
          <article key={m.id} className="admin-panel flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE[m.kind]}`}>{KIND[m.kind]}</span>
              <strong>{m.name}</strong>
              {m.email && (
                <a href={reply} dir="ltr">
                  {m.email}
                </a>
              )}
              {m.phone && (
                <a href={wa} target="_blank" rel="noreferrer" dir="ltr">
                  {m.phone}
                </a>
              )}
              <span className="text-muted">
                {when(m.createdAt)} · {m.locale === "en" ? "English" : "عربي"}
              </span>
            </div>
            <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
            <div className="flex flex-wrap items-center gap-2">
              {reply && (
                <a href={reply} className="admin-btn-ghost">
                  رد بالإيميل
                </a>
              )}
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className="admin-btn-ghost">
                  واتساب
                </a>
              )}
              <form action={setMessageStatus}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="status" value={done ? "NEW" : "DONE"} />
                <button type="submit" className="admin-btn-ghost">
                  {done ? "رجّعها جديدة" : "اتردّ عليها ✓"}
                </button>
              </form>
              <DeleteButton action={deleteMessage} fields={{ id: m.id }} confirmText="مسح الرسالة دي؟" />
            </div>
          </article>
        );
      })}
    </AdminShell>
  );
}
