import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { NewAreaForm, ProjectForm } from "@/components/admin/project-form";

export default async function NewProjectPage({ searchParams }: PageProps<"/admin/projects/new">) {
  await requireAdmin();
  const { developer } = await searchParams;
  const [developers, areas] = await Promise.all([
    db.developer.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } }),
    db.area.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } }),
  ]);

  return (
    <AdminShell title="مشروع جديد" back={{ href: "/admin", label: "لوحة التحكم" }}>
      <p className="text-sm text-muted">احفظ البيانات الأساسية أولًا، ثم أضف النماذج وأنظمة السداد والصور في الصفحة التالية.</p>
      <ProjectForm developers={developers} areas={areas} defaultDeveloperId={typeof developer === "string" ? developer : undefined} />
      <NewAreaForm />
    </AdminShell>
  );
}
