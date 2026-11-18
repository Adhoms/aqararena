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
  // Mirrors the public catalog's "showable" rule: only unit types with a starting price are
  // shown on the site and can be offered, so only those are counted here.
  const priced = { priceFrom: { not: null } } as const;
  const projects = await db.project.findMany({
    where: { developerId: me.developer.id, published: true },
    orderBy: { nameAr: "asc" },
    select: {
      id: true,
      nameAr: true,
      slug: true,
      deliveryDate: true,
      _count: { select: { typologies: { where: priced } } },
    },
  });
  const projectIds = projects.map((p) => p.id);
  const [units, types] = projectIds.length
    ? await Promise.all([
        db.unit.groupBy({
          by: ["availability", "typologyId"],
          where: { typology: { projectId: { in: projectIds }, ...priced } },
          _count: { _all: true },
        }),
        db.typology.findMany({
          where: { projectId: { in: projectIds }, ...priced },
          select: { id: true, projectId: true },
        }),
      ])
    : [[], []];
  const projectOf = new Map(types.map((t) => [t.id, t.projectId]));
  const totals = new Map<string, { available: number; total: number }>();
  for (const u of units) {
    const projectId = projectOf.get(u.typologyId);
    if (!projectId) continue;
    const t = totals.get(projectId) ?? { available: 0, total: 0 };
    t.total += u._count._all;
    if (u.availability === "AVAILABLE") t.available += u._count._all;
    totals.set(projectId, t);
  }

  return (
    <SalesShell me={me} title={`أهلًا ${me.nameAr}`}>
      {password && (
        <p className="admin-panel text-brand">تم تغيير كلمة المرور ✓</p>
      )}
      <section className="admin-panel">
        <h2 className="mb-3 font-display text-xl">
          مشروعات {me.developer.nameAr}
        </h2>
        {projects.length === 0 ? (
          <p className="text-sm text-muted">
            لسه مفيش مشروعات منشورة لشركتك على AqarArena.
          </p>
        ) : (
          <div className="overflow-x-auto">
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
                    <td className="font-semibold text-brand">
                      {num(totals.get(p.id)?.available ?? 0)}
                    </td>
                    <td>{num(totals.get(p.id)?.total ?? 0)}</td>
                    <td className="whitespace-nowrap">
                      {p._count.typologies > 0 ? (
                        <a
                          href={`/ar/projects/${p.slug}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          صفحة المشروع <span aria-hidden="true">↗</span>
                          <span className="sr-only">
                            {" "}
                            {p.nameAr} (بتفتح في تبويب جديد)
                          </span>
                        </a>
                      ) : (
                        <span className="text-muted">مش ظاهر على الموقع</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </SalesShell>
  );
}
