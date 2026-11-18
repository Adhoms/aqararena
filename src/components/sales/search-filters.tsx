import Link from "next/link";
import ar from "@/app/[lang]/dictionaries/ar.json";
import { UNIT_VIEWS, type SubType } from "@/lib/property";
import { BASIS_LABELS, BUDGET_BASES, planLabel, type SalesPlan } from "@/lib/sales/budget";
import { SALES_STATES } from "@/lib/sales/holds";
import type { SalesProject } from "@/lib/sales/inventory";
import { STATE_LABELS, subTypeLabel } from "@/lib/sales/labels";
import { searchHref, type SalesSearch } from "@/lib/sales/search";
import { SalesSearchForm, SearchButton } from "./search-form";

/** Typed values the search couldn't read (e.g. «٥٠٠ ألف»), shown back in their fields with what to fix. */
export type InvalidFilters = { budget?: string; floorMin?: string; floorMax?: string };

const field = "flex min-w-0 flex-col gap-1.5 text-sm font-medium text-ink";
const sub = "flex min-w-0 flex-col gap-1.5 text-sm text-body";
// 16 px on a phone so iOS doesn't zoom into the field; 44 px tall to tap.
const input = "admin-input min-h-11 text-base sm:min-h-10 sm:text-sm";
const hint = "col-span-2 m-0 text-xs leading-relaxed text-muted";
const error = "col-span-2 m-0 text-xs font-medium leading-relaxed text-red-700 dark:text-red-300";
const str = (v: string | number | undefined) => (v === undefined ? "" : String(v));

/**
 * The search filters as a GET form: they apply with «بحث», and the results show the new count.
 * Open while nothing is filtered or a typed value needs fixing; after a search it closes, so the results
 * come first on a phone.
 */
export function SearchFilters({
  search,
  project,
  subTypes,
  plans,
  count,
  invalid,
}: {
  search: SalesSearch;
  project?: SalesProject;
  subTypes: SubType[];
  plans: SalesPlan[];
  count: number;
  invalid: InvalidFilters;
}) {
  const badFloor = invalid.floorMin !== undefined || invalid.floorMax !== undefined;
  const badBudget = invalid.budget !== undefined;
  const codeOf = new Map(project?.types.map((t) => [t.id, t.code]));
  return (
    // A new search remounts the box, so it opens or closes for that search whatever was toggled before.
    <details key={searchHref(search, { page: 1 }) + JSON.stringify(invalid)} open={count === 0 || badFloor || badBudget} className="admin-panel group">
      <summary className="-m-2 flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 rounded-xl p-2 [&::-webkit-details-marker]:hidden">
        <span className="font-display text-lg">
          الفلاتر
          {count > 0 && <span className="ms-2 admin-badge align-middle font-sans">{count.toLocaleString("ar-EG")} مفعّلة</span>}
        </span>
        <span className="text-sm text-link">
          <span className="group-open:hidden">تعديل</span>
          <span className="hidden group-open:inline">إخفاء</span>
        </span>
      </summary>
      <SalesSearchForm className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        {search.project && <input type="hidden" name="project" value={search.project} />}
        {project && (
          <label className={field}>
            النموذج
            <select name="model" defaultValue={str(search.model)} className={input}>
              <option value="">كل النماذج</option>
              {project.types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.code}
                  {t.nameAr ? ` · ${t.nameAr}` : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className={field}>
          النوع
          <select name="type" defaultValue={str(search.type)} className={input}>
            <option value="">كل الأنواع</option>
            {subTypes.map((t) => (
              <option key={t} value={t}>
                {subTypeLabel(t)}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          غرف النوم
          <select name="beds" defaultValue={str(search.beds)} className={input}>
            <option value="">أي عدد</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
            <option value="5">5 أو أكتر</option>
          </select>
        </label>
        <label className={field}>
          الإطلالة
          <select name="view" defaultValue={str(search.view)} className={input}>
            <option value="">أي إطلالة</option>
            {UNIT_VIEWS.map((v) => (
              <option key={v} value={v}>
                {ar.unitViews[v]}
              </option>
            ))}
          </select>
        </label>
        <label className={field}>
          الحالة
          <select name="state" defaultValue={str(search.state)} className={input}>
            <option value="">كل الحالات</option>
            {SALES_STATES.map((s) => (
              <option key={s} value={s}>
                {STATE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="col-span-2 m-0 grid min-w-0 grid-cols-2 gap-x-3 gap-y-1.5 border-0 p-0">
          <legend className="mb-1.5 p-0 text-sm font-medium">الدور</legend>
          <label className={sub}>
            من
            <input
              name="floorMin"
              type="text"
              dir="ltr"
              autoComplete="off"
              defaultValue={invalid.floorMin ?? str(search.floorMin)}
              aria-invalid={invalid.floorMin !== undefined || undefined}
              aria-describedby={badFloor ? "floor-error floor-hint" : "floor-hint"}
              className={input}
            />
          </label>
          <label className={sub}>
            لحد
            <input
              name="floorMax"
              type="text"
              dir="ltr"
              autoComplete="off"
              defaultValue={invalid.floorMax ?? str(search.floorMax)}
              aria-invalid={invalid.floorMax !== undefined || undefined}
              aria-describedby={badFloor ? "floor-error floor-hint" : "floor-hint"}
              className={input}
            />
          </label>
          {badFloor && (
            <p id="floor-error" role="alert" className={error}>
              الدور لازم يبقى رقم صحيح من <bdi dir="ltr">-5</bdi> لـ <bdi dir="ltr">200</bdi>، زي <bdi dir="ltr">3</bdi>.
            </p>
          )}
          {/* A text keyboard, not a number pad: iOS's number pad has no minus sign for the basement. */}
          <p id="floor-hint" className={hint}>
            اكتب <bdi dir="ltr">0</bdi> (صفر) للأرضي، و<bdi dir="ltr">-1</bdi> للبدروم.
          </p>
        </fieldset>

        <fieldset className="col-span-2 m-0 grid min-w-0 grid-cols-2 gap-x-3 gap-y-1.5 border-0 p-0 sm:col-span-3 lg:col-span-2">
          <legend className="mb-1.5 p-0 text-sm font-medium">الميزانية</legend>
          <label className={sub}>
            المبلغ بالجنيه
            <input
              name="budget"
              type="text"
              inputMode="numeric"
              dir="ltr"
              autoComplete="off"
              defaultValue={invalid.budget ?? str(search.budget)}
              aria-invalid={badBudget || undefined}
              aria-describedby={badBudget ? "budget-error budget-hint" : "budget-hint"}
              className={input}
            />
          </label>
          <label className={sub}>
            المبلغ ده
            <select name="by" defaultValue={search.by} aria-describedby="budget-hint" className={input}>
              {BUDGET_BASES.map((b) => (
                <option key={b} value={b}>
                  {BASIS_LABELS[b]}
                </option>
              ))}
            </select>
          </label>
          {project && plans.length > 0 && (
            <label className={`${sub} col-span-2 mt-2.5`}>
              خطة الدفع (للمقدم والقسط)
              <select name="plan" defaultValue={str(search.plan)} aria-describedby="budget-hint" className={input}>
                <option value="">أي خطة (الأقل)</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {planLabel(p)}
                    {p.typologyId ? ` · ${codeOf.get(p.typologyId) ?? "نموذج واحد"} بس` : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          {badBudget && (
            <p id="budget-error" role="alert" className={error}>
              الميزانية لازم تبقى رقم بس، زي <bdi dir="ltr">5000000</bdi>.
            </p>
          )}
          <p id="budget-hint" className={hint}>
            أرقام بس، من غير «ألف» أو «مليون».{" "}
            {project && plans.length > 0
              ? "المقدم والقسط بيتقارنوا بالخطة اللي تختارها، أو بأقل رقم في خطط كل وحدة."
              : "المقدم والقسط بيتقارنوا بأقل رقم في خطط كل وحدة. اختار مشروع عشان تحدد خطة."}{" "}
            القسط متوسط في الشهر، حتى لو الخطة ربع سنوية.
          </p>
        </fieldset>

        <div className="col-span-full flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
          <SearchButton className="press admin-btn min-h-11 justify-center max-sm:flex-1" />
          {count > 0 && (
            <Link href={searchHref({ by: "total", page: 1, project: search.project })} className="inline-flex min-h-11 items-center text-sm">
              مسح الفلاتر
            </Link>
          )}
        </div>
      </SalesSearchForm>
    </details>
  );
}
