import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { ImportForm } from "@/components/admin/import-form";

export default async function ImportPage() {
  await requireAdmin();
  return (
    <AdminShell title="استيراد من Excel" back={{ href: "/admin", label: "لوحة التحكم" }}>
      <section className="admin-panel flex flex-col gap-4">
        <h2 className="font-display text-xl">1. نزّل الملف</h2>
        <p className="text-sm text-muted">
          ملف Excel فيه أربع شيتات: المطورين، المشروعات، النماذج، أنظمة السداد. الخانات فيها قوائم تختار منها، وأول شيت فيه شرح لكل عمود.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/admin/import/template" className="admin-btn" download>
            تنزيل ملف فاضي
          </a>
          <a href="/admin/import/template?data=1" className="admin-btn-ghost" download>
            تنزيل البيانات الحالية (للتعديل)
          </a>
        </div>
      </section>
      <ImportForm />
    </AdminShell>
  );
}
