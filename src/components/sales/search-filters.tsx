import Link from "next/link";
import ar from "@/app/[lang]/dictionaries/ar.json";
import { UNIT_VIEWS, type SubType } from "@/lib/property";
import { BUDGET_BASES, planLabel, type BudgetBasis, type SalesPlan } from "@/lib/sales/budget";
import { SALES_STATES } from "@/lib/sales/holds";
import type { SalesProject } from "@/lib/sales/inventory";
import { STATE_LABELS, subTypeLabel } from "@/lib/sales/labels";
import { searchHref, type SalesSearch } from "@/lib/sales/search";
import { SalesSearchForm } from "./search-form";

/** What the budget amount is. The monthly figure is the plan's installments spread over its months, so on a quarterly plan it is an average. */
export const BASIS_LABELS: Record<BudgetBasis, string> = { total: "السعر الكلي", down: "المقدم", monthly: "القسط (متوسط شهري)" };

const field = "flex min-w-0 flex-col gap-1.5 text-sm font-medium text-ink";
const sub = "flex min-w-0 flex-col gap-1.5 text-sm text-body";
// 16 px on a phone so iOS doesn't zoom into the field; 44 px tall to tap.
const input = "admin-input min-h-11 text-base sm:min-h-10 sm:text-sm";
const hint = "col-span-2 m-0 text-xs leading-relaxed text-muted";
const str = (v: string | number | undefined) => (v === undefined ? "" : String(v));

/**
 * The search filters as a GET form: they apply with «بحث», and the results show the new count.
 * Open while nothing is filtered; after a search it closes, so the results come first on a phone.
 */
export function SearchFilters({
  search,
  project,
  subTypes,
  plans,
  count,
}: {
  search: SalesSearch;
  project?: SalesProject;
  subTypes: SubType[];
  plans: SalesPlan[];
  count: number;
}) {
  return (
    // A new search remounts the box, so it opens or closes for that search whatever was toggled before.
    <details key={searchHref(search, { page: 1 })} open={count === 0} className="admin-panel group">
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
            <input name="floorMin" type="text" inputMode="numeric" dir="ltr" autoComplete="off" defaultValue={str(search.floorMin)} aria-describedby="floor-hint" className={input} />
          </label>
          <label className={sub}>
            لحد
            <input name="floorMax" type="text" inputMode="numeric" dir="ltr" autoComplete="off" defaultValue={str(search.floorMax)} aria-describedby="floor-hint" className={input} />
          </label>
          <p id="floor-hint" className={hint}>
            اكتب صفر للأرضي، ورقم بالسالب للبدروم.
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
              defaultValue={str(search.budget)}
              aria-describedby="budget-hint"
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
              <select name="plan" defaultValue={str(search.plan)} className={input}>
                <option value="">أي خطة (الأقل)</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {planLabel(p)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <p id="budget-hint" className={hint}>
            {project && plans.length > 0
              ? "المقدم والقسط بيتقارنوا بالخطة اللي تختارها، أو بأقل رقم في خطط كل وحدة."
              : "المقدم والقسط بيتقارنوا بأقل رقم في خطط كل وحدة. اختار مشروع عشان تحدد خطة."}{" "}
            القسط متوسط في الشهر، حتى لو الخطة ربع سنوية.
          </p>
        </fieldset>

        <div className="col-span-full flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
          <button type="submit" className="press admin-btn min-h-11 justify-center max-sm:flex-1">
            بحث
          </button>
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
