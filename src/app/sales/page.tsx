import type { Metadata } from "next";
import Link from "next/link";
import { ProjectChips } from "@/components/sales/project-chips";
import { SalesShell } from "@/components/sales/sales-shell";
import { SearchFilters } from "@/components/sales/search-filters";
import { UnitResults } from "@/components/sales/unit-results";
import { PAGE_SIZE, SCAN_LIMIT, salesPlans, salesProjects, searchUnits } from "@/lib/sales/inventory";
import { activeFilterCount, readSalesSearch, searchHref, type SalesSearch } from "@/lib/sales/search";
import { requireSales } from "@/lib/sales/session";

export const metadata: Metadata = { title: "المخزون" };

const num = (n: number) => n.toLocaleString("ar-EG");
/** "وحدة واحدة", "وحدتين", "٧ وحدات", "٦٥ وحدة". */
const units = (n: number) => (n === 0 ? "مفيش وحدات" : n === 1 ? "وحدة واحدة" : n === 2 ? "وحدتين" : n <= 10 ? `${num(n)} وحدات` : `${num(n)} وحدة`);

// The inventory search: every unit of the company's published projects, available ones first.
// The filters live in the address, so a search can be sent to a colleague as a link.
// The page reads the session and the address on every request (the Sales layout's Suspense holds it).
export default async function SalesInventoryPage({ searchParams }: PageProps<"/sales">) {
  const me = await requireSales();
  const params = await searchParams;
  const asked = readSalesSearch(params);
  const projects = await salesProjects(me.developer.id);
  const plans = await salesPlans(me.developer.id, projects.map((p) => p.id));
  // Ids from another company or an old link are dropped, never trusted.
  const project = projects.find((p) => p.id === asked.project);
  const projectPlans = project ? (plans.get(project.id) ?? []) : [];
  const search: SalesSearch = {
    ...asked,
    project: project?.id,
    model: project?.types.some((t) => t.id === asked.model) ? asked.model : undefined,
    plan: projectPlans.some((p) => p.id === asked.plan) ? asked.plan : undefined,
  };
  const { rows, capped } = projects.length ? await searchUnits({ id: me.id, developerId: me.developer.id }, search, plans) : { rows: [], capped: false };
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(search.page, pages);
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const subTypes = [...new Set(projects.flatMap((p) => p.types.map((t) => t.subType)))];
  const count = activeFilterCount(search);
  const clearHref = searchHref({ by: "total", page: 1, project: search.project });

  return (
    <SalesShell me={me} title="المخزون">
      {params.password && (
        <p role="status" className="admin-panel text-brand">
          تم تغيير كلمة المرور ✓
        </p>
      )}
      {projects.length === 0 ? (
        <p className="admin-panel text-sm text-muted">لسه مفيش مشروعات منشورة بأسعار لشركتك على AqarArena.</p>
      ) : (
        <>
          <ProjectChips projects={projects} search={search} />
          <SearchFilters search={search} project={project} subTypes={subTypes} plans={projectPlans} count={count} />
          <section aria-labelledby="results-title" className="admin-panel flex flex-col gap-4">
            {/* A live region, so a screen reader hears the new count after each search. */}
            <div role="status" aria-atomic="true" className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="results-title" className="font-display text-xl">
                {units(rows.length)}
                {project && <span className="text-muted"> في {project.nameAr}</span>}
              </h2>
              {pages > 1 && (
                <span className="text-sm text-muted">
                  صفحة {num(page)} من {num(pages)}
                </span>
              )}
            </div>
            {capped && (
              <p className="m-0 rounded-xl bg-brass-soft px-4 py-3 text-sm text-brass-dark">
                فيه وحدات أكتر من اللي ظاهرة هنا (البحث بيشوف أول {num(SCAN_LIMIT)} وحدة، المتاح الأول). ضيّق البحث بمشروع أو نوع أو عدد غرف عشان تشوفها كلها.
              </p>
            )}
            {shown.length === 0 ? (
              <p className="m-0 rounded-2xl border border-dashed border-line-strong px-5 py-6 text-sm text-muted">
                {count > 0 ? (
                  <>
                    مفيش وحدات بالمواصفات دي. جرّب ميزانية أكبر أو شيل فلتر، أو <Link href={clearHref}>امسح الفلاتر</Link>.
                  </>
                ) : (
                  "مفيش وحدات متسجلة هنا لسه."
                )}
              </p>
            ) : (
              <UnitResults rows={shown} basis={search.budget ? search.by : null} showProject={!project} />
            )}
            {pages > 1 && (
              <nav aria-label="صفحات النتايج" className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
                {page > 1 ? (
                  <Link href={searchHref(search, { page: page - 1 })} rel="prev" className="press admin-btn-ghost min-h-11">
                    <span aria-hidden="true">→</span> الصفحة اللي قبلها
                  </Link>
                ) : (
                  <span />
                )}
                {page < pages ? (
                  <Link href={searchHref(search, { page: page + 1 })} rel="next" className="press admin-btn-ghost min-h-11">
                    الصفحة اللي بعدها <span aria-hidden="true">←</span>
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            )}
          </section>
        </>
      )}
    </SalesShell>
  );
}
