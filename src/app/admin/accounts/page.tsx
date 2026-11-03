import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminForm, DeleteButton } from "@/components/admin/admin-form";
import { Row, Select, TextField } from "@/components/admin/fields";
import { approveAccount, createAccount, deleteAccount, resetPassword, setAccountStatus } from "../portal-actions";

const when = (d: Date | null) => (d ? d.toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" }) : "—");
const STATUS = { PENDING: "مستني موافقة", ACTIVE: "فعّال", DISABLED: "موقوف" } as const;

export default async function AccountsPage() {
  await requireAdmin();
  const [accounts, developers] = await Promise.all([
    db.developerAccount.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], include: { developer: { select: { nameAr: true } } } }),
    db.developer.findMany({ select: { id: true, nameAr: true, nameEn: true }, orderBy: { nameAr: "asc" } }),
  ]);
  const requests = accounts.filter((a) => a.status === "PENDING");
  const others = accounts.filter((a) => a.status !== "PENDING");
  const devOptions = developers.map((d) => ({ value: d.id, label: d.nameAr }));

  return (
    <AdminShell title="حسابات المطورين" back={{ href: "/admin", label: "لوحة التحكم" }}>
      <section className="admin-panel flex flex-col gap-4">
        <h2 className="font-display text-xl">طلبات حسابات جديدة ({requests.length})</h2>
        {requests.length === 0 && <p className="text-sm text-muted">مافيش طلبات جديدة. الطلبات بتيجي من صفحة «للمطورين» على الموقع.</p>}
        {requests.map((a) => {
          const match = developers.find((d) => d.nameEn.toLowerCase() === (a.companyNameEn ?? "").toLowerCase() || d.nameAr === a.companyNameAr);
          return (
            <div key={a.id} className="admin-item flex flex-col gap-3">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm">
                <strong className="text-base">{a.companyNameAr}</strong>
                {a.companyNameEn && <span dir="ltr">{a.companyNameEn}</span>}
                <span>{a.contactName}</span>
                <span dir="ltr">{a.phone}</span>
                {a.email && <span dir="ltr">{a.email}</span>}
                <span className="text-muted">
                  المستخدم: <span dir="ltr">{a.username}</span> · {when(a.createdAt)}
                </span>
              </div>
              {a.note && <p className="text-sm text-muted">{a.note}</p>}
              <AdminForm action={approveAccount} submitLabel="تفعيل الحساب">
                <input type="hidden" name="id" value={a.id} />
                <Row cols={3}>
                  <Select
                    name="developerId"
                    label="يخص مطور"
                    defaultValue={match?.id ?? "new"}
                    options={[{ value: "new", label: "＋ مطور جديد من بيانات الطلب" }, ...devOptions]}
                    hint="لو الشركة موجودة على الموقع اختارها، غير كده هيتعمل مطور جديد."
                  />
                  <TextField name="nameAr" label="اسم المطور الجديد بالعربية" defaultValue={a.companyNameAr} />
                  <TextField name="nameEn" label="اسم المطور الجديد بالإنجليزية" defaultValue={a.companyNameEn} dir="ltr" />
                </Row>
              </AdminForm>
              <div className="flex justify-end">
                <DeleteButton action={deleteAccount} fields={{ id: a.id }} label="رفض ومسح الطلب" confirmText="مسح الطلب ده؟" />
              </div>
            </div>
          );
        })}
      </section>

      <section className="admin-panel">
        <h2 className="mb-3 font-display text-xl">عمل حساب لمطور</h2>
        <AdminForm action={createAccount} submitLabel="عمل الحساب" resetOnSuccess>
          <Row cols={3}>
            <Select name="developerId" label="المطور" emptyLabel="— اختر —" options={devOptions} />
            <TextField name="username" label="اسم المستخدم" dir="ltr" placeholder="sodic" hint="حروف إنجليزية صغيرة وأرقام" />
          </Row>
          <p className="text-xs text-muted">هتظهرلك كلمة مرور مؤقتة مرة واحدة. ابعتها للمطور، وهو هيختار كلمة مرور جديدة أول ما يدخل.</p>
        </AdminForm>
      </section>

      <section className="admin-panel overflow-x-auto">
        <h2 className="mb-3 font-display text-xl">الحسابات ({others.length})</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>اسم المستخدم</th>
              <th>المطور</th>
              <th>الحالة</th>
              <th>آخر دخول</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {others.map((a) => (
              <tr key={a.id}>
                <td dir="ltr" className="text-end">
                  {a.username}
                </td>
                <td>{a.developer?.nameAr ?? "—"}</td>
                <td>
                  <span className={a.status === "ACTIVE" ? "admin-badge" : "admin-badge-off"}>{STATUS[a.status]}</span>
                  {a.mustChangePassword && <span className="ms-1 text-xs text-muted">(كلمة مرور مؤقتة)</span>}
                </td>
                <td className="text-muted">{when(a.lastLoginAt)}</td>
                <td>
                  <div className="flex flex-wrap items-start gap-2">
                    <details>
                      <summary className="admin-btn-ghost cursor-pointer list-none">كلمة مرور جديدة</summary>
                      <div className="mt-2 w-72">
                        <AdminForm action={resetPassword} submitLabel="إنشاء كلمة مرور مؤقتة">
                          <input type="hidden" name="id" value={a.id} />
                        </AdminForm>
                      </div>
                    </details>
                    <form action={setAccountStatus}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="status" value={a.status === "ACTIVE" ? "DISABLED" : "ACTIVE"} />
                      <button type="submit" className="admin-btn-ghost">
                        {a.status === "ACTIVE" ? "إيقاف" : "تفعيل"}
                      </button>
                    </form>
                    <DeleteButton action={deleteAccount} fields={{ id: a.id }} confirmText="مسح الحساب ده؟ مشروعات المطور على الموقع مش هتتمسح." />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AdminShell>
  );
}
