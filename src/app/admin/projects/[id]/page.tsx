import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteProject } from "@/app/admin/actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { DeleteButton } from "@/components/admin/admin-form";
import { NewAreaForm, ProjectForm } from "@/components/admin/project-form";
import { DistanceList, MediaList, PaymentPlanList, TypologyList, ZoneList } from "@/components/admin/project-parts";

const SECTIONS = [
  ["#details", "البيانات"],
  ["#typologies", "النماذج"],
  ["#plans", "أنظمة السداد"],
  ["#zones", "الماستر بلان"],
  ["#media", "الصور"],
  ["#distances", "المسافات"],
] as const;

export default async function EditProjectPage({ params, searchParams }: PageProps<"/admin/projects/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const { created } = await searchParams;
  const [project, developers, areas] = await Promise.all([
    db.project.findUnique({
      where: { id },
      include: {
        typologies: { orderBy: { priceFrom: "asc" } },
        paymentPlans: { orderBy: { createdAt: "asc" } },
        zones: { orderBy: { sortOrder: "asc" } },
        media: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] },
        distances: { orderBy: { sortOrder: "asc" } },
      },
    }),
    db.developer.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } }),
    db.area.findMany({ select: { id: true, nameAr: true }, orderBy: { nameAr: "asc" } }),
  ]);
  if (!project) notFound();

  const pricedTypes = project.typologies.filter((t) => t.priceFrom !== null).length;
  const live = project.published && pricedTypes > 0;

  return (
    <AdminShell
      title={project.nameAr}
      back={{ href: "/admin", label: "لوحة التحكم" }}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {live ? <span className="admin-badge">ظاهر على الموقع</span> : <span className="admin-badge-off">غير ظاهر على الموقع</span>}
          {live && (
            <a href={`/ar/projects/${project.slug}`} target="_blank" rel="noreferrer" className="admin-btn-ghost">
              صفحة المشروع ↗
            </a>
          )}
        </div>
      }
    >
      {created && <p className="admin-panel text-brand">تم إنشاء المشروع ✓ أضف الآن نماذج الوحدات وأنظمة السداد، ثم فعّل «منشور».</p>}
      {!live && (
        <p className="text-sm text-muted">
          لكي يظهر المشروع: {!project.published && "فعّل «منشور على الموقع»"}
          {!project.published && pricedTypes === 0 && " و"}
          {pricedTypes === 0 && "أضف نموذج وحدة بسعر"}.
        </p>
      )}
      <nav className="sticky top-14 z-10 -mx-1 flex flex-wrap gap-1 rounded-full border border-line bg-ground/90 p-1 text-sm backdrop-blur">
        {SECTIONS.map(([href, label]) => (
          <a key={href} href={href} className="rounded-full px-3 py-1 text-ink no-underline hover:bg-brass-soft">
            {label}
          </a>
        ))}
      </nav>

      <div id="details" className="scroll-mt-28">
        <ProjectForm project={project} developers={developers} areas={areas} />
      </div>
      <NewAreaForm />
      <TypologyList projectId={project.id} items={project.typologies} />
      <PaymentPlanList projectId={project.id} items={project.paymentPlans} typologies={project.typologies} />
      <ZoneList projectId={project.id} items={project.zones} />
      <MediaList projectId={project.id} items={project.media} />
      <DistanceList projectId={project.id} items={project.distances} />

      <section className="admin-panel flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">حذف المشروع يحذف نماذجه وأنظمة السداد والصور. لإخفائه مؤقتًا ألغِ «منشور» بدلًا من الحذف.</p>
        <DeleteButton action={deleteProject} fields={{ id: project.id }} label="حذف المشروع" confirmText={`حذف «${project.nameAr}» نهائيًا؟`} />
      </section>
    </AdminShell>
  );
}
