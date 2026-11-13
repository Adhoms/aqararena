import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminForm } from "@/components/admin/admin-form";
import { Checkbox, TextArea } from "@/components/admin/fields";
import { SubmissionStatusBadge } from "@/components/portal/status-badge";
import { parseProfileDraft, parseProjectDraft } from "@/lib/portal/drafts";
import { profileReview, projectReview, type MediaDiff } from "@/lib/portal/review";
import { approveSubmission, rejectSubmission } from "../../portal-actions";

const isImage = (url: string) => /\.(webp|jpe?g|png|avif|gif|svg)(\?|$)/i.test(url);

function Thumbs({ title, urls, labels, tone }: { title: string; urls: string[]; labels: Record<string, string>; tone: "add" | "remove" | "keep" }) {
  if (!urls.length) return null;
  const border = { add: "border-brand", remove: "border-red-600 opacity-70", keep: "border-line" }[tone];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        {title} ({urls.length})
      </p>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {urls.map((u) => (
          <li key={u} className={`flex flex-col gap-1 rounded-lg border-2 p-1 text-xs ${border}`}>
            <a href={u} target="_blank" rel="noreferrer">
              {isImage(u) ? (
                // eslint-disable-next-line @next/next/no-img-element -- review thumbnail
                <img src={u} alt="" loading="lazy" className="aspect-[4/3] w-full rounded object-cover" />
              ) : (
                <span className="flex aspect-[4/3] items-center justify-center rounded bg-divider">ملف ↗</span>
              )}
            </a>
            <span className="text-muted">{labels[u]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MediaPanel({ media, labels }: { media: MediaDiff; labels: Record<string, string> }) {
  if (!media.added.length && !media.removed.length && !media.kept.length) return null;
  return (
    <section className="admin-panel flex flex-col gap-4">
      <h2 className="font-display text-xl">الصور والملفات</h2>
      <Thumbs title="جديد" urls={media.added} labels={labels} tone="add" />
      <Thumbs title="هيتشال" urls={media.removed} labels={labels} tone="remove" />
      <details>
        <summary className="cursor-pointer text-sm text-link">زي ما هو ({media.kept.length})</summary>
        <div className="mt-3">
          <Thumbs title="زي ما هو" urls={media.kept} labels={labels} tone="keep" />
        </div>
      </details>
    </section>
  );
}

export default async function ReviewPage({ params }: PageProps<"/admin/review/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const sub = await db.submission.findUnique({
    where: { id },
    include: { developer: { select: { nameAr: true } }, account: { select: { username: true, contactName: true, phone: true } } },
  });
  if (!sub) notFound();

  const isProject = sub.kind === "PROJECT";
  const review = isProject ? await projectReview(sub.projectId, parseProjectDraft(sub.data)) : await profileReview(sub.developerId, parseProfileDraft(sub.data));
  const live = review.live;
  const unitsLost: { code: string; units: number }[] = "unitsLost" in review ? (review.unitsLost as { code: string; units: number }[]) : [];
  const changedCount = review.sections.reduce((n, s) => n + s.rows.filter((r) => r.changed).length, 0) + review.media.added.length + review.media.removed.length;

  return (
    <AdminShell
      title={isProject ? sub.title : `بيانات الشركة: ${sub.developer.nameAr}`}
      back={{ href: "/admin/review", label: "المراجعة" }}
      actions={<SubmissionStatusBadge status={sub.status} />}
    >
      <p className="text-sm text-muted">
        {sub.developer.nameAr} · <span dir="ltr">{sub.account.username}</span>
        {sub.account.contactName && ` · ${sub.account.contactName}`}
        {sub.account.phone && (
          <>
            {" · "}
            <span dir="ltr">{sub.account.phone}</span>
          </>
        )}
        {" · "}
        {isProject ? (sub.projectId ? "تعديل مشروع موجود" : "مشروع جديد") : "تعديل بيانات الشركة"} · {changedCount} تغيير
        {live && (
          <>
            {" · "}
            <a href={`/ar/projects/${live.slug}`} target="_blank" rel="noreferrer">
              الصفحة الحالية ↗
            </a>
          </>
        )}
      </p>

      {unitsLost.length > 0 && (
        <p className="admin-panel border-red-600/50 text-sm text-red-700 dark:text-red-300">
          <b>تنبيه:</b> الطلب ده بيشيل نماذج عليها وحدات، والوحدات دي هتتمسح لو وافقت:{" "}
          {unitsLost.map((t) => `${t.code} (${t.units} وحدة)`).join("، ")}. لو المطور غيّر الكود بس، المفروض يعدّل النموذج نفسه بدل ما يمسحه ويضيف واحد جديد.
        </p>
      )}

      {review.sections.map((section) => {
        const rows = section.rows.filter((r) => r.before || r.after);
        if (!rows.length) return null;
        const changed = rows.filter((r) => r.changed).length;
        return (
          <section key={section.title} className="admin-panel overflow-x-auto">
            <h2 className="mb-3 font-display text-xl">
              {section.title} <span className="text-sm text-muted">({changed ? `${changed} تغيير` : "مافيش تغيير"})</span>
            </h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="w-40"></th>
                  <th>{sub.projectId || !isProject ? "الحالي على الموقع" : ""}</th>
                  <th>المقترح</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={r.changed ? "bg-brass-soft/40" : ""}>
                    <td className="font-medium">{r.label}</td>
                    <td className={r.changed && r.before ? "text-red-700 line-through decoration-red-700/40 dark:text-red-300" : "text-muted"}>{r.before || "—"}</td>
                    <td className={r.changed ? "font-medium" : ""}>{r.after || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        );
      })}

      <MediaPanel media={review.media} labels={review.mediaLabels} />

      {sub.status === "PENDING" ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="admin-panel border-brand/40">
            <h2 className="mb-3 font-display text-xl">موافقة</h2>
            <AdminForm action={approveSubmission} submitLabel="موافقة ونشر التغييرات">
              <input type="hidden" name="id" value={sub.id} />
              {isProject && (
                <Checkbox
                  name="publish"
                  label={sub.projectId ? (live?.published ? "المشروع منشور على الموقع" : "انشر المشروع على الموقع") : "انشر المشروع على الموقع فورًا"}
                  defaultChecked={sub.projectId ? live?.published ?? true : true}
                />
              )}
            </AdminForm>
          </section>
          <section className="admin-panel">
            <h2 className="mb-3 font-display text-xl">رجّعه للمطور</h2>
            <AdminForm action={rejectSubmission} submitLabel="إرسال الملاحظة">
              <input type="hidden" name="id" value={sub.id} />
              <TextArea name="note" label="إيه اللي محتاج يتعدّل؟" hint="المطور هيشوف الملاحظة دي ويقدر يعدّل ويبعت تاني." />
            </AdminForm>
          </section>
        </div>
      ) : (
        sub.reviewNote && <p className="admin-panel text-sm">الملاحظة: {sub.reviewNote}</p>
      )}
    </AdminShell>
  );
}
