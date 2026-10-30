import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteDeveloper } from "@/app/admin/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteButton } from "@/components/admin/admin-form";
import { DeveloperForm } from "@/components/admin/developer-form";

export default async function EditDeveloperPage({ params, searchParams }: PageProps<"/admin/developers/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;
  const developer = await db.developer.findUnique({
    where: { id },
    include: { projects: { select: { id: true, nameAr: true, published: true }, orderBy: { nameEn: "asc" } } },
  });
  if (!developer) notFound();

  return (
    <AdminShell
      title={developer.nameAr}
      back={{ href: "/admin", label: "لوحة التحكم" }}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <a href={`/ar/developers/${developer.slug}`} target="_blank" rel="noreferrer" className="admin-btn-ghost">
            صفحة المطور ↗
          </a>
          <Link href={`/admin/projects/new?developer=${developer.id}`} className="admin-btn">
            + مشروع لهذا المطور
          </Link>
        </div>
      }
    >
      {created && <p className="admin-panel text-brand">تمت إضافة المطور ✓ أضف الآن مشروعاته.</p>}
      <DeveloperForm developer={developer} />
      <section className="admin-panel">
        <h2 className="mb-3 font-display text-xl">مشروعاته ({developer.projects.length})</h2>
        <ul className="flex flex-col gap-1.5">
          {developer.projects.map((p) => (
            <li key={p.id}>
              <Link href={`/admin/projects/${p.id}`}>{p.nameAr}</Link> {!p.published && <span className="admin-badge-off">مسودة</span>}
            </li>
          ))}
        </ul>
      </section>
      <section className="admin-panel flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">حذف المطور يحذف كل مشروعاته وبياناتها.</p>
        <DeleteButton
          action={deleteDeveloper}
          fields={{ id: developer.id }}
          label="حذف المطور"
          confirmText={`حذف «${developer.nameAr}» و${developer.projects.length} مشروع؟ لا يمكن التراجع.`}
        />
      </section>
    </AdminShell>
  );
}
