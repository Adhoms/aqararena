import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin/auth";
import { statsFor } from "@/lib/stats";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatsTable } from "@/components/stats/stats-table";

// Visitor statistics for every published project, busiest first: what to show a developer
// when offering a subscription or a featured listing.
export default async function StatsPage() {
  await requireAdmin();
  const projects = await db.project.findMany({
    where: { published: true },
    select: { id: true, nameAr: true, developer: { select: { nameAr: true } } },
  });
  const stats = await statsFor(projects.map((p) => p.id));
  const rows = projects
    .map((p) => ({ id: p.id, name: `${p.nameAr} · ${p.developer.nameAr}`, href: `/admin/projects/${p.id}`, stats: stats.get(p.id)! }))
    .sort((a, b) => b.stats.totals.VIEW.now - a.stats.totals.VIEW.now || a.name.localeCompare(b.name, "ar"));

  return (
    <AdminShell title="إحصائيات الزوار" back={{ href: "/admin", label: "لوحة التحكم" }}>
      <section className="admin-panel">
        <StatsTable rows={rows} />
      </section>
    </AdminShell>
  );
}
