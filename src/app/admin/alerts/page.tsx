import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteButton } from "@/components/admin/admin-form";
import { deletePriceAlert } from "../portal-actions";

const when = (d: Date) => d.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });

export default async function AlertsPage({ searchParams }: PageProps<"/admin/alerts">) {
  await requireAdmin();
  const { project } = await searchParams;
  const filter = typeof project === "string" && project ? project : undefined;
  const [byProject, alerts] = await Promise.all([
    db.priceAlert.groupBy({ by: ["projectId"], where: { confirmedAt: { not: null } }, _count: { _all: true } }),
    db.priceAlert.findMany({
      where: filter ? { projectId: filter } : {},
      include: { project: { select: { id: true, nameAr: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
  ]);
  const names = new Map(
    (await db.project.findMany({ where: { id: { in: byProject.map((b) => b.projectId) } }, select: { id: true, nameAr: true } })).map((p) => [p.id, p.nameAr]),
  );
  const confirmed = alerts.filter((a) => a.confirmedAt).length;

  return (
    <AdminShell
      title="المشتركين في تنبيهات الأسعار"
      back={{ href: "/admin", label: "لوحة التحكم" }}
      actions={
        <a href={`/admin/alerts/export${filter ? `?project=${filter}` : ""}`} className="admin-btn">
          تحميل Excel (CSV)
        </a>
      }
    >
      <p className="text-sm text-muted">
        الزوار اللي سابوا اسمهم وإيميلهم عشان يعرفوا لما أسعار مشروع تتغيّر. المؤكَّد بس هو اللي بيوصله إيميل. ولما أي حد يوقف التنبيهات من الإيميل بيتمسح من هنا.
      </p>
      {byProject.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/alerts" className={filter ? "admin-btn-ghost" : "admin-btn"}>
            الكل
          </Link>
          {byProject
            .sort((a, b) => b._count._all - a._count._all)
            .map((b) => (
              <Link key={b.projectId} href={`/admin/alerts?project=${b.projectId}`} className={filter === b.projectId ? "admin-btn" : "admin-btn-ghost"}>
                {names.get(b.projectId)} ({b._count._all})
              </Link>
            ))}
        </div>
      )}
      {alerts.length === 0 ? (
        <p className="admin-panel text-sm text-muted">لسه مافيش مشتركين.</p>
      ) : (
        <div className="admin-panel overflow-x-auto p-0">
          <p className="px-5 pt-4 text-sm text-muted">
            {alerts.length} مشترك · {confirmed} مؤكَّد
          </p>
          <table className="w-full text-sm">
            <thead className="text-start text-muted">
              <tr>
                <th className="px-5 py-3 text-start font-medium">الاسم</th>
                <th className="px-5 py-3 text-start font-medium">البريد</th>
                <th className="px-5 py-3 text-start font-medium">الموبايل</th>
                <th className="px-5 py-3 text-start font-medium">المشروع</th>
                <th className="px-5 py-3 text-start font-medium">الحالة</th>
                <th className="px-5 py-3 text-start font-medium">التاريخ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => (
                <tr key={a.id} className="border-t border-line">
                  <td className="px-5 py-3">{a.name}</td>
                  <td className="px-5 py-3" dir="ltr">
                    <a href={`mailto:${a.email}`}>{a.email}</a>
                  </td>
                  <td className="px-5 py-3" dir="ltr">
                    {a.phone ?? "-"}
                  </td>
                  <td className="px-5 py-3">
                    <Link href={`/admin/projects/${a.project.id}`}>{a.project.nameAr}</Link>
                  </td>
                  <td className="px-5 py-3">{a.confirmedAt ? <span className="admin-badge">مؤكَّد</span> : <span className="admin-badge-off">مستني التأكيد</span>}</td>
                  <td className="px-5 py-3 text-muted">{when(a.createdAt)}</td>
                  <td className="px-5 py-3">
                    <DeleteButton action={deletePriceAlert} fields={{ id: a.id }} confirmText="مسح المشترك ده؟" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
