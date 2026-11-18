import { SITE_URL } from "@/lib/site";
import { db } from "@/lib/db";
import { requireAccount } from "@/lib/portal/session";
import { ROLE_LABELS, SALES_ROLES } from "@/lib/sales/fields";
import { PortalShell } from "@/components/portal/portal-shell";
import { AdminForm, ConfirmForm } from "@/components/admin/admin-form";
import { Panel, Row, Select, TextField } from "@/components/admin/fields";
import { createSalesAccount, resetSalesPassword, saveHoldHours, setSalesStatus, updateSalesAccount } from "../team-actions";
import { HOLD_HOURS_MAX, HOLD_HOURS_MIN } from "@/lib/sales/holds";
import { HOURS_NOUN, countAr, formatCountAr, formatDateAr } from "@/lib/format";

const when = (d: Date | null) => (d ? formatDateAr(d) : "لسه ماخدش");
const roleOptions = SALES_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }));

type Member = { nameAr?: string | null; nameEn?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null; role?: string };

function PersonFields({ m }: { m?: Member }) {
  return (
    <>
      <Row cols={3}>
        <TextField name="nameAr" label="الاسم بالعربي *" defaultValue={m?.nameAr} autoComplete="off" />
        <TextField name="nameEn" label="الاسم بالإنجليزي" defaultValue={m?.nameEn} dir="ltr" autoComplete="off" />
        <Select name="role" label="الدور *" defaultValue={m?.role ?? "AGENT"} options={roleOptions} />
      </Row>
      <Row cols={3}>
        <TextField name="phone" label="الموبايل *" type="tel" defaultValue={m?.phone} dir="ltr" autoComplete="off" />
        <TextField name="whatsapp" label="واتساب" type="tel" defaultValue={m?.whatsapp} dir="ltr" autoComplete="off" />
        <TextField name="email" label="البريد الإلكتروني" type="email" defaultValue={m?.email} dir="ltr" autoComplete="off" />
      </Row>
    </>
  );
}

export default async function PortalTeamPage() {
  const me = await requireAccount();
  const [team, developer] = await Promise.all([
    db.salesAccount.findMany({ where: { developerId: me.developerId }, orderBy: [{ status: "asc" }, { nameAr: "asc" }] }),
    db.developer.findUniqueOrThrow({ where: { id: me.developerId }, select: { holdHours: true } }),
  ]);

  return (
    <PortalShell company={me.developer.nameAr} title="فريق المبيعات" back>
      <section className="admin-panel flex flex-col gap-2 text-sm">
        <p className="font-medium">AqarArena Sales</p>
        <p className="text-muted">
          كل سيلز بيدخل من <span dir="ltr">{SITE_URL.replace(/^https?:\/\//, "")}/sales</span> باسم مستخدم وكلمة مرور خاصين بيه، وبيشوف مشروعات شركتك بس. «قائد الفريق» بيشوف شغل الفريق كله. الاسم والأرقام هنا بتظهر على عروض الأسعار اللي السيلز بيبعتها.
        </p>
      </section>

      <Panel title="مدة الحجز المؤقت">
        <AdminForm action={saveHoldHours}>
          <TextField
            name="holdHours"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            label="عدد الساعات *"
            defaultValue={developer.holdHours}
            hint={`من ${formatCountAr(HOLD_HOURS_MIN)} لـ ${countAr(HOLD_HOURS_MAX, HOURS_NOUN)} (أسبوع). السيلز بيحجز الوحدة المدة دي، ولو ماأكدش الحجز الوحدة بترجع متاحة لوحدها. تقدر تحدد مدة مختلفة لكل مشروع من صفحة مخزونه. بيسري على الحجوزات الجديدة بس.`}
          />
        </AdminForm>
      </Panel>

      <Panel title={`الفريق (${team.length.toLocaleString("ar-EG")})`}>
        <div className="flex flex-col gap-3">
          {team.length === 0 && <p className="text-sm text-muted">لسه مفيش حد. ضيف أول عضو من الفورم اللي تحت.</p>}
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
                <AdminForm action={resetSalesPassword} submitLabel="كلمة مرور مؤقتة جديدة" secret confirmText="كلمة المرور الحالية هتتلغي والسيلز هيخرج من كل الأجهزة. نكمل؟">
                  <input type="hidden" name="id" value={m.id} />
                </AdminForm>
                <ConfirmForm
                  action={setSalesStatus}
                  fields={{ id: m.id, status: m.status === "ACTIVE" ? "DISABLED" : "ACTIVE" }}
                  confirmText={m.status === "ACTIVE" ? "هتوقف الحساب والسيلز هيخرج من كل الأجهزة، والحجوزات المؤقتة اللي عليه هتتلغي. نكمل؟" : undefined}
                  label={m.status === "ACTIVE" ? "إيقاف الحساب" : "تفعيل الحساب"}
                  className={m.status === "ACTIVE" ? "admin-btn-danger" : "admin-btn-ghost"}
                />
              </div>
            </details>
          ))}
        </div>
      </Panel>

      <Panel title="إضافة عضو للفريق">
        <AdminForm action={createSalesAccount} submitLabel="إضافة" resetOnSuccess secret>
          <TextField name="username" label="اسم المستخدم *" dir="ltr" autoComplete="off" autoCapitalize="none" spellCheck={false} hint="حروف إنجليزية صغيرة وأرقام، مثلًا ahmed.ali" />
          <PersonFields />
          <p className="text-xs text-muted">هتظهرلك كلمة مرور مؤقتة مرة واحدة. ابعتها للسيلز، وهو هيختار كلمة مرور جديدة أول ما يدخل.</p>
        </AdminForm>
      </Panel>
    </PortalShell>
  );
}
