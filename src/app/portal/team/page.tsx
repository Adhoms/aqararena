import { db } from "@/lib/db";
import { requireAccount } from "@/lib/portal/session";
import { ROLE_LABELS, SALES_ROLES } from "@/lib/sales/fields";
import { PortalShell } from "@/components/portal/portal-shell";
import { AdminForm } from "@/components/admin/admin-form";
import { Panel, Row, Select, TextField } from "@/components/admin/fields";
import { createSalesAccount, resetSalesPassword, setSalesStatus, updateSalesAccount } from "../team-actions";

const when = (d: Date | null) => (d ? d.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" }) : "لسه ماخدش");
const roleOptions = SALES_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }));

type Member = { nameAr?: string | null; nameEn?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null; role?: string };

function PersonFields({ m }: { m?: Member }) {
  return (
    <>
      <Row cols={3}>
        <TextField name="nameAr" label="الاسم بالعربي *" defaultValue={m?.nameAr} autoComplete="name" />
        <TextField name="nameEn" label="الاسم بالإنجليزي" defaultValue={m?.nameEn} dir="ltr" autoComplete="name" />
        <Select name="role" label="الدور *" defaultValue={m?.role ?? "AGENT"} options={roleOptions} />
      </Row>
      <Row cols={3}>
        <TextField name="phone" label="الموبايل *" type="tel" defaultValue={m?.phone} dir="ltr" autoComplete="tel" />
        <TextField name="whatsapp" label="واتساب" type="tel" defaultValue={m?.whatsapp} dir="ltr" autoComplete="off" />
        <TextField name="email" label="البريد الإلكتروني" type="email" defaultValue={m?.email} dir="ltr" autoComplete="email" />
      </Row>
    </>
  );
}

export default async function PortalTeamPage() {
  const me = await requireAccount();
  const team = await db.salesAccount.findMany({ where: { developerId: me.developerId }, orderBy: [{ status: "asc" }, { nameAr: "asc" }] });

  return (
    <PortalShell company={me.developer.nameAr} title="فريق المبيعات" back>
      <section className="admin-panel flex flex-col gap-2 text-sm">
        <p className="font-medium">AqarArena Sales</p>
        <p className="text-muted">
          كل سيلز بيدخل من <span dir="ltr">aqararena.com/sales</span> باسم مستخدم وكلمة مرور خاصين بيه، وبيشوف مشروعات شركتك بس. «قائد الفريق» بيشوف شغل الفريق كله. الاسم والأرقام هنا بتظهر على عروض الأسعار اللي السيلز بيبعتها.
        </p>
      </section>

      <Panel title={`الفريق (${team.length.toLocaleString("ar-EG")})`}>
        <div className="flex flex-col gap-3">
          {team.length === 0 && <p className="text-sm text-muted">لسه مفيش حد. ضيف أول عضو تحت.</p>}
          {team.map((m) => (
            <details key={m.id} className="admin-item">
              <summary>
                <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <strong>{m.nameAr}</strong>
                  <span dir="ltr" className="text-muted">
                    {m.username}
                  </span>
                  <span className="admin-badge">{ROLE_LABELS[m.role]}</span>
                  {m.status !== "ACTIVE" && <span className="admin-badge-off">موقوف</span>}
                  {m.mustChangePassword && <span className="text-xs text-muted">(كلمة مرور مؤقتة)</span>}
                  <span className="text-xs text-muted">آخر دخول: {when(m.lastLoginAt)}</span>
                </span>
                <span className="text-xs text-link">تعديل ▾</span>
              </summary>
              <AdminForm action={updateSalesAccount}>
                <input type="hidden" name="id" value={m.id} />
                <PersonFields m={m} />
              </AdminForm>
              <div className="mt-4 flex flex-wrap items-start gap-3 border-t border-divider pt-4">
                <AdminForm action={resetSalesPassword} submitLabel="كلمة مرور مؤقتة جديدة">
                  <input type="hidden" name="id" value={m.id} />
                </AdminForm>
                <form action={setSalesStatus}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="status" value={m.status === "ACTIVE" ? "DISABLED" : "ACTIVE"} />
                  <button type="submit" className={m.status === "ACTIVE" ? "admin-btn-danger" : "admin-btn-ghost"}>
                    {m.status === "ACTIVE" ? "إيقاف الحساب" : "تفعيل الحساب"}
                  </button>
                </form>
              </div>
            </details>
          ))}
          <details className="admin-item border-dashed" open={team.length === 0}>
            <summary>
              <span className="font-medium text-link">+ إضافة عضو للفريق</span>
            </summary>
            <AdminForm action={createSalesAccount} submitLabel="إضافة" resetOnSuccess>
              <TextField name="username" label="اسم المستخدم *" dir="ltr" autoComplete="off" hint="حروف إنجليزية صغيرة وأرقام، مثلًا ahmed.ali" />
              <PersonFields />
              <p className="text-xs text-muted">هتظهرلك كلمة مرور مؤقتة مرة واحدة. ابعتها للسيلز، وهو هيختار كلمة مرور جديدة أول ما يدخل.</p>
            </AdminForm>
          </details>
        </div>
      </Panel>
    </PortalShell>
  );
}
