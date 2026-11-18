import type { Metadata } from "next";
import Link from "next/link";
import { ProjectChips } from "@/components/sales/project-chips";
import { SalesShell } from "@/components/sales/sales-shell";
import { SearchFilters, type InvalidFilters } from "@/components/sales/search-filters";
import { FocusResults } from "@/components/sales/search-form";
import { UnitResults } from "@/components/sales/unit-results";
import { UNITS_NOUN, countAr, formatCountAr as num } from "@/lib/format";
import { PAGE_SIZE, SCAN_LIMIT, salesPlans, salesProjects, searchUnits } from "@/lib/sales/inventory";
import type { SalesPlan } from "@/lib/sales/budget";
import { activeFilterCount, readSalesSearch, searchHref, type SalesSearch } from "@/lib/sales/search";
import { requireSales } from "@/lib/sales/session";

export const metadata: Metadata = { title: "المخزون" };

/** "وحدة واحدة", "وحدتين", "٧ وحدات", "٦٥ وحدة". */
const units = (n: number) => (n === 0 ? "مفيش وحدات" : n === 1 ? "وحدة واحدة" : countAr(n, UNITS_NOUN));

// The inventory search: every unit of the company's published projects, available ones first.
// The filters live in the address, so a search can be sent to a colleague as a link.
// The page reads the session and the address on every request (the Sales layout's Suspense holds it).
export default async function SalesInventoryPage({ searchParams }: PageProps<"/sales">) {
  const me = await requireSales();
  const params = await searchParams;
  const asked = readSalesSearch(params);
  // One clock for the chips' counts and the search, so a hold ending mid-request can't make them disagree.
  const now = new Date();
  const projects = await salesProjects(me.developer.id, now);
  // Ids from another company or an old link are dropped, never trusted; so is a type the chosen project doesn't have.
  const project = projects.find((p) => p.id === asked.project);
  // Plans are read only when needed: a budget by down payment or installment checks the searched
  // projects' plans, and the plan select lists the chosen project's.
  const needsPlans = asked.budget !== undefined && asked.by !== "total";
  const plans = project || needsPlans ? await salesPlans(me.developer.id, project ? [project.id] : undefined) : new Map<string, SalesPlan[]>();
  const projectPlans = project ? (plans.get(project.id) ?? []) : [];
  const search: SalesSearch = {
    ...asked,
    project: project?.id,
    model: project?.types.some((t) => t.id === asked.model) ? asked.model : undefined,
    type: !project || project.types.some((t) => t.subType === asked.type) ? asked.type : undefined,
    plan: projectPlans.some((p) => p.id === asked.plan) ? asked.plan : undefined,
  };
  const { rows, capped } = projects.length ? await searchUnits({ id: me.id, developerId: me.developer.id }, search, plans, now) : { rows: [], capped: false };
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = Math.min(search.page, pages);
  const shown = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const subTypes = [...new Set((project ? project.types : projects.flatMap((p) => p.types)).map((t) => t.subType))];
  const count = activeFilterCount(search);
  const clearHref = searchHref({ by: "total", page: 1, project: search.project });
  // A typed budget or floor the search couldn't read (e.g. «٥٠٠ ألف») is shown back with what to fix, not silently ignored.
  const raw = (key: "budget" | "floorMin" | "floorMax") => {
    const v = params[key];
    const typed = (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 40);
    return typed && asked[key] === undefined ? typed : undefined;
  };
  const invalid: InvalidFilters = Object.fromEntries(
    (["budget", "floorMin", "floorMax"] as const).flatMap((k) => (raw(k) ? [[k, raw(k)]] : [])),
  );
  // The address as asked, so the results move focus once per search (see FocusResults).
  const address = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (v === undefined ? [] : Array.isArray(v) ? v.map((x) => [k, x]) : [[k, v]])),
  ).toString();
  const heading = !capped
    ? units(rows.length)
    : rows.length >= SCAN_LIMIT
      ? `أكتر من ${num(SCAN_LIMIT)} وحدة`
      : rows.length === 0
        ? `مفيش وحدات في أول ${num(SCAN_LIMIT)}`
        : `${units(rows.length)} أو أكتر`;

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
          <SearchFilters search={search} project={project} subTypes={subTypes} plans={projectPlans} count={count} invalid={invalid} />
          <section aria-labelledby="results-title" className="admin-panel flex flex-col gap-4">
            {/* A live region, so a screen reader hears the new count after each search. */}
            <div role="status" aria-atomic="true" className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <FocusResults key={address} target="results-title" />
              <h2 id="results-title" tabIndex={-1} className="scroll-mt-4 rounded-md font-display text-xl">
                {heading}
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
                    {search.budget ? "جرّب ميزانية أكبر أو شيل فلتر" : "جرّب تشيل فلتر"}، أو <Link href={clearHref}>امسح الفلاتر</Link>.
                  </>
                ) : (
                  "لسه متسجلش وحدات هنا."
                )}
              </p>
            ) : (
              <UnitResults rows={shown} basis={search.budget ? search.by : null} showProject={!project} />
            )}
            {pages > 1 && (
              <nav aria-label="صفحات النتايج" className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-4">
                {page > 1 ? (
                  <Link href={searchHref(search, { page: page - 1 })} rel="prev" aria-label="الصفحة السابقة" className="press admin-btn-ghost min-h-11">
                    <span aria-hidden="true">→</span> السابقة
                  </Link>
                ) : (
                  <span />
                )}
                {page < pages ? (
                  <Link href={searchHref(search, { page: page + 1 })} rel="next" aria-label="الصفحة التالية" className="press admin-btn-ghost min-h-11">
                    التالية <span aria-hidden="true">←</span>
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
