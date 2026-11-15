import type { Metadata } from "next";
import { db } from "@/lib/db";
import { requireSales } from "@/lib/sales/session";
import { SalesShell } from "@/components/sales/sales-shell";

export const metadata: Metadata = { title: "المشروعات" };

const num = (n: number) => n.toLocaleString("ar-EG");

// The company's published projects with how many units are available, as the starting point
// for a salesperson. Search, holds and offers build on this in the next phases.
export default async function SalesHome({ searchParams }: PageProps<"/sales">) {
  const me = await requireSales();
  const { password } = await searchParams;
  const projects = await db.project.findMany({
    where: { developerId: me.developer.id, published: true },
    orderBy: { nameAr: "asc" },
    select: { id: true, nameAr: true, slug: true, deliveryDate: true, _count: { select: { typologies: true } } },
  });
  const projectIds = projects.map((p) => p.id);
  const [units, types] = await Promise.all([
    db.unit.groupBy({
      by: ["availability", "typologyId"],
      where: { typology: { projectId: { in: projectIds } } },
      _count: { _all: true },
    }),
    db.typology.findMany({ where: { projectId: { in: projectIds } }, select: { id: true, projectId: true } }),
  ]);
  const projectOf = new Map(types.map((t) => [t.id, t.projectId]));
  const count = (projectId: string, availability?: string) =>
    units.filter((u) => projectOf.get(u.typologyId) === projectId && (!availability || u.availability === availability)).reduce((n, u) => n + u._count._all, 0);

  return (
    <SalesShell me={me} title={`أهلًا ${me.nameAr}`}>
      {password && <p className="admin-panel text-brand">تم تغيير كلمة المرور ✓</p>}
      <section className="admin-panel overflow-x-auto">
        <h2 className="mb-3 font-display text-xl">مشروعات {me.developer.nameAr}</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted">لسه مفيش مشروعات منشورة لشركتك على AqarArena.</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>المشروع</th>
                <th>التسليم</th>
                <th>النماذج</th>
                <th>متاحة</th>
                <th>كل الوحدات</th>
                <th>
                  <span className="sr-only">صفحة المشروع</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td className="font-medium">{p.nameAr}</td>
                  <td>{String(p.deliveryDate.getUTCFullYear())}</td>
                  <td>{num(p._count.typologies)}</td>
                  <td className="font-semibold text-brand">{num(count(p.id, "AVAILABLE"))}</td>
                  <td>{num(count(p.id))}</td>
                  <td>
                    <a href={`/ar/projects/${p.slug}`} target="_blank" rel="noreferrer">
                      صفحة المشروع <span aria-hidden="true">↗</span>
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </SalesShell>
  );
}
