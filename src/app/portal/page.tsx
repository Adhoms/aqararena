import Link from "next/link";
import { db } from "@/lib/db";
import { requireAccount } from "@/lib/portal/session";
import { statsFor } from "@/lib/stats";
import { StatsTable } from "@/components/stats/stats-table";
import { PortalShell } from "@/components/portal/portal-shell";
import { SubmissionStatusBadge } from "@/components/portal/status-badge";
import { editProfile, editProject, newProject } from "./actions";

const when = (d: Date) => d.toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" });

export default async function PortalHome({ searchParams }: PageProps<"/portal">) {
  const me = await requireAccount();
  const { password } = await searchParams;
  const [projects, submissions] = await Promise.all([
    db.project.findMany({
      where: { developerId: me.developerId },
      orderBy: { nameAr: "asc" },
      select: { id: true, nameAr: true, slug: true, published: true, _count: { select: { typologies: true } } },
    }),
    db.submission.findMany({
      where: { developerId: me.developerId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, kind: true, status: true, title: true, projectId: true, reviewNote: true, updatedAt: true },
    }),
  ]);
  const shown = projects.filter((p) => p.published && p._count.typologies > 0);
  const stats = await statsFor(shown.map((p) => p.id));
  const openFor = new Map(submissions.filter((s) => s.projectId && s.status !== "APPROVED").map((s) => [s.projectId!, s]));

  return (
    <PortalShell
      company={me.developer.nameAr}
      title="مشروعاتي"
      actions={
        <div className="flex flex-wrap gap-2">
          <form action={editProfile}>
            <button type="submit" className="admin-btn-ghost">
              بيانات الشركة وأرقام التواصل
            </button>
          </form>
          <form action={newProject}>
            <button type="submit" className="admin-btn">
              + مشروع جديد
            </button>
          </form>
        </div>
      }
    >
      {password && <p className="admin-panel text-brand">تم تغيير كلمة المرور ✓</p>}

      <section className="admin-panel flex flex-col gap-2 text-sm">
        <p className="font-medium">إزاي البوابة بتشتغل</p>
        <ol className="list-inside list-decimal text-muted">
          <li>أضف مشروع جديد أو افتح تعديل لمشروع موجود، واملا البيانات والأسعار وارفع الصور.</li>
          <li>تقدر تحفظ مسودة وتكمّل بعدين. لما تخلص اضغط «إرسال للمراجعة».</li>
          <li>فريق AqarArena بيراجع البيانات، وأول ما نوافق بتظهر على الموقع. لو محتاجة تعديل هتلاقي ملاحظتنا هنا.</li>
          <li>حالة الوحدات (متاحة / محجوزة / مباعة) بتتعدّل من «المخزون» وبتوصل لفريق مبيعاتك على طول من غير مراجعة.</li>
        </ol>
      </section>

      {submissions.length > 0 && (
        <section className="admin-panel overflow-x-auto">
          <h2 className="mb-3 font-display text-xl">طلباتك ({submissions.length})</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>الطلب</th>
                <th>الحالة</th>
                <th>آخر تعديل</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/portal/submissions/${s.id}`}>{s.kind === "DEVELOPER_PROFILE" ? "بيانات الشركة" : s.title}</Link>
                    {!s.projectId && s.kind === "PROJECT" && s.status !== "APPROVED" && <span className="admin-badge ms-2">مشروع جديد</span>}
                    {s.status === "REJECTED" && s.reviewNote && <p className="mt-1 text-xs text-red-700 dark:text-red-300">ملاحظة المراجعة: {s.reviewNote}</p>}
                  </td>
                  <td>
                    <SubmissionStatusBadge status={s.status} />
                  </td>
                  <td className="text-muted">{when(s.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="admin-panel overflow-x-auto">
        <h2 className="mb-3 font-display text-xl">مشروعاتك على الموقع ({projects.length})</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted">لسه مافيش مشروعات. اضغط «+ مشروع جديد» عشان تبدأ.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>المشروع</th>
                <th>على الموقع</th>
                <th>المخزون والتعديل</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const open = openFor.get(p.id);
                const live = p.published && p._count.typologies > 0;
                return (
                  <tr key={p.id}>
                    <td>
                      {p.nameAr}
                      {live && (
                        <a href={`/ar/projects/${p.slug}`} target="_blank" rel="noreferrer" className="ms-2 text-xs">
                          عرض ↗
                        </a>
                      )}
                    </td>
                    <td>{live ? <span className="admin-badge">ظاهر</span> : <span className="admin-badge-off">مش ظاهر</span>}</td>
                    <td className="flex flex-wrap gap-2">
                      {p._count.typologies > 0 && (
                        <Link href={`/portal/projects/${p.id}/units`} className="admin-btn-ghost">
                          المخزون
                        </Link>
                      )}
                      <form action={editProject}>
                        <input type="hidden" name="projectId" value={p.id} />
                        <button type="submit" className="admin-btn-ghost">
                          {open ? "كمّل التعديل" : "تعديل"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {shown.length > 0 && (
        <section className="admin-panel" id="stats">
          <h2 className="mb-3 font-display text-xl">زوار مشروعاتك</h2>
          <StatsTable rows={shown.map((p) => ({ id: p.id, name: p.nameAr, href: `/ar/projects/${p.slug}`, stats: stats.get(p.id)! }))} />
        </section>
      )}
    </PortalShell>
  );
}
