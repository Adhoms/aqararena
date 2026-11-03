import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAccount } from "@/lib/portal/session";
import { parseProfileDraft, parseProjectDraft } from "@/lib/portal/drafts";
import { PortalShell } from "@/components/portal/portal-shell";
import { SubmissionStatusBadge } from "@/components/portal/status-badge";
import { ProfileEditor, ProjectEditor } from "@/components/portal/editor";
import { discardSubmission, withdrawSubmission } from "../../actions";

export default async function SubmissionPage({ params }: PageProps<"/portal/submissions/[id]">) {
  const me = await requireAccount();
  const { id } = await params;
  const sub = await db.submission.findFirst({ where: { id, developerId: me.developerId } });
  if (!sub) notFound();
  const areas = await db.area.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } });

  const editable = sub.status === "DRAFT" || sub.status === "REJECTED";
  const folder = `portal/${me.developerId}/${sub.id}`;
  const isProfile = sub.kind === "DEVELOPER_PROFILE";
  const title = isProfile ? "بيانات الشركة" : sub.projectId ? `تعديل: ${sub.title}` : sub.title === "مشروع جديد" ? "مشروع جديد" : `مشروع جديد: ${sub.title}`;

  return (
    <PortalShell
      company={me.developer.nameAr}
      title={title}
      back
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <SubmissionStatusBadge status={sub.status} />
          {editable && (
            <form action={discardSubmission}>
              <input type="hidden" name="id" value={sub.id} />
              <button type="submit" className="admin-btn-danger">
                {sub.projectId || isProfile ? "إلغاء التعديلات" : "حذف المسودة"}
              </button>
            </form>
          )}
        </div>
      }
    >
      {sub.status === "REJECTED" && (
        <div className="admin-panel border-red-600/40">
          <p className="font-medium text-red-700 dark:text-red-300">محتاج تعديل قبل النشر</p>
          {sub.reviewNote && <p className="mt-1 text-sm">{sub.reviewNote}</p>}
          <p className="mt-2 text-sm text-muted">عدّل اللي محتاج تعديل واضغط «إرسال للمراجعة» تاني.</p>
        </div>
      )}
      {sub.status === "PENDING" && (
        <div className="admin-panel flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm">اتبعت للمراجعة. هيظهر على الموقع أول ما نوافق عليه. لو عايز تغيّر حاجة اسحبه الأول.</p>
          <form action={withdrawSubmission}>
            <input type="hidden" name="id" value={sub.id} />
            <button type="submit" className="admin-btn-ghost">
              سحب للتعديل
            </button>
          </form>
        </div>
      )}
      {sub.status === "APPROVED" && <p className="admin-panel text-brand">اتوافق على الطلب ده واتنشر. لأي تعديل جديد افتح «تعديل» من صفحة مشروعاتي.</p>}

      <fieldset disabled={!editable} className="min-w-0 disabled:opacity-80">
        {isProfile ? (
          <ProfileEditor id={sub.id} initial={parseProfileDraft(sub.data)} folder={folder} />
        ) : (
          <ProjectEditor id={sub.id} initial={parseProjectDraft(sub.data)} areas={areas.map((a) => ({ value: a.id, label: a.nameAr }))} folder={folder} />
        )}
      </fieldset>
    </PortalShell>
  );
}
