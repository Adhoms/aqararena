import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { DeveloperForm } from "@/components/admin/developer-form";

export default async function NewDeveloperPage() {
  await requireAdmin();
  return (
    <AdminShell title="مطور جديد" back={{ href: "/admin", label: "لوحة التحكم" }}>
      <DeveloperForm />
    </AdminShell>
  );
}
