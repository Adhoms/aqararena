import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { statusLabel } from "@/lib/admin/labels";
import { AdminShell } from "@/components/admin/admin-shell";

export default async function AdminHome() {
  await requireAdmin();
  const [pendingReviews, pendingAccounts] = await Promise.all([
    db.submission.count({ where: { status: "PENDING" } }),
    db.developerAccount.count({ where: { status: "PENDING" } }),
  ]);
  const [developers, projects] = await Promise.all([
    db.developer.findMany({ orderBy: { nameEn: "asc" }, include: { _count: { select: { projects: true } } } }),
    db.project.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        developer: { select: { nameAr: true } },
        area: { select: { nameAr: true } },
        _count: { select: { typologies: true, paymentPlans: true } },
      },
    }),
  ]);

  return (
    <AdminShell
      title="لوحة التحكم"
      actions={
        <div className="flex gap-2">
          <Link href="/admin/developers/new" className="admin-btn-ghost">
            + مطور جديد
          </Link>
          <Link href="/admin/projects/new" className="admin-btn">
            + مشروع جديد
          </Link>
        </div>
      }
    >
      {(pendingReviews > 0 || pendingAccounts > 0) && (
        <section className="admin-panel flex flex-wrap items-center gap-3 border-brass">
          <strong>مستني موافقتك:</strong>
          {pendingReviews > 0 && (
            <Link href="/admin/review" className="admin-btn">
              {pendingReviews} طلب تعديل من المطورين
            </Link>
          )}
          {pendingAccounts > 0 && (
            <Link href="/admin/accounts" className="admin-btn-ghost">
              {pendingAccounts} طلب حساب جديد
            </Link>
          )}
        </section>
      )}
      <section className="admin-panel overflow-x-auto">
        <h2 className="mb-3 font-display text-xl">المشروعات ({projects.length})</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>المشروع</th>
              <th>المطور</th>
              <th>المنطقة</th>
              <th>الحالة</th>
              <th>النماذج / الأنظمة</th>
              <th>النشر</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td>
                  <Link href={`/admin/projects/${p.id}`}>{p.nameAr}</Link>
                  <div className="text-xs text-muted" dir="ltr">
                    {p.slug}
                  </div>
                </td>
                <td>{p.developer.nameAr}</td>
                <td>{p.area.nameAr}</td>
                <td>{statusLabel(p.status)}</td>
                <td>
                  {p._count.typologies} / {p._count.paymentPlans}
                  {p._count.typologies === 0 && <div className="text-xs text-red-700">لن يظهر بدون نموذج له سعر</div>}
                </td>
                <td>
                  {p.published ? <span className="admin-badge">منشور</span> : <span className="admin-badge-off">مسودة</span>}
                  {p.isFeatured && <span className="admin-badge ms-1">مميز</span>}
                </td>
              </tr>
            ))}
            {projects.length === 0 && (
              <tr>
                <td colSpan={6} className="text-muted">
                  لا توجد مشروعات بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="admin-panel overflow-x-auto">
        <h2 className="mb-3 font-display text-xl">المطورون ({developers.length})</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>المطور</th>
              <th>الخط الساخن</th>
              <th>المشروعات</th>
              <th>موثّق</th>
            </tr>
          </thead>
          <tbody>
            {developers.map((d) => (
              <tr key={d.id}>
                <td>
                  <Link href={`/admin/developers/${d.id}`}>{d.nameAr}</Link>
                  <div className="text-xs text-muted">{d.nameEn}</div>
                </td>
                <td dir="ltr" className="text-end">
                  {d.hotline ?? "—"}
                </td>
                <td>{d._count.projects}</td>
                <td>{d.verified ? "✓" : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
