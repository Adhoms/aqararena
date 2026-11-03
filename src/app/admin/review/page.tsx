import Link from "next/link";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { SubmissionStatusBadge } from "@/components/portal/status-badge";

const when = (d: Date | null) => (d ? d.toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—");

export default async function ReviewList({ searchParams }: PageProps<"/admin/review">) {
  await requireAdmin();
  const { done } = await searchParams;
  const [pending, recent, requests] = await Promise.all([
    db.submission.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "asc" },
      include: { developer: { select: { nameAr: true } }, account: { select: { username: true } } },
    }),
    db.submission.findMany({
      where: { status: { in: ["APPROVED", "REJECTED"] } },
      orderBy: { reviewedAt: "desc" },
      take: 15,
      include: { developer: { select: { nameAr: true } } },
    }),
    db.developerAccount.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <AdminShell title="مراجعة طلبات المطورين" back={{ href: "/admin", label: "لوحة التحكم" }}>
      {done === "approved" && <p className="admin-panel text-brand">اتوافق ✓ والتغييرات ظاهرة على الموقع.</p>}
      {done === "returned" && <p className="admin-panel text-brand">اترجع للمطور بملاحظتك ✓</p>}
      {requests > 0 && (
        <p className="admin-panel">
          فيه {requests} طلب حساب جديد مستني موافقتك. <Link href="/admin/accounts">راجع الحسابات</Link>
        </p>
      )}

      <section className="admin-panel overflow-x-auto">
        <h2 className="mb-3 font-display text-xl">مستني موافقتك ({pending.length})</h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted">مافيش طلبات مستنية دلوقتي.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>الطلب</th>
                <th>المطور</th>
                <th>اتبعت</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {pending.map((s) => (
                <tr key={s.id}>
                  <td>
                    {s.kind === "DEVELOPER_PROFILE" ? "بيانات الشركة" : s.title}
                    {s.kind === "PROJECT" && <span className="admin-badge ms-2">{s.projectId ? "تعديل مشروع" : "مشروع جديد"}</span>}
                  </td>
                  <td>
                    {s.developer.nameAr}
                    <div className="text-xs text-muted" dir="ltr">
                      {s.account.username}
                    </div>
                  </td>
                  <td className="text-muted">{when(s.submittedAt)}</td>
                  <td>
                    <Link href={`/admin/review/${s.id}`} className="admin-btn">
                      راجع
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {recent.length > 0 && (
        <section className="admin-panel overflow-x-auto">
          <h2 className="mb-3 font-display text-xl">آخر اللي اتراجع</h2>
          <table className="admin-table">
            <tbody>
              {recent.map((s) => (
                <tr key={s.id}>
                  <td>
                    <Link href={`/admin/review/${s.id}`}>{s.kind === "DEVELOPER_PROFILE" ? "بيانات الشركة" : s.title}</Link>
                  </td>
                  <td>{s.developer.nameAr}</td>
                  <td>
                    <SubmissionStatusBadge status={s.status} />
                  </td>
                  <td className="text-muted">{when(s.reviewedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </AdminShell>
  );
}
