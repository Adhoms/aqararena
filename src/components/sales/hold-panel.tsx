import { AdminForm } from "@/components/admin/admin-form";
import { holdUnit } from "@/app/sales/hold-actions";
import { HOURS_NOUN, countAr, formatDateTimeAr } from "@/lib/format";
import type { SalesState } from "@/lib/sales/holds";
import type { UnitHoldView } from "@/lib/sales/inventory";
import type { SalesUser } from "@/lib/sales/session";
import { CancelHoldButton, ConvertHoldButton } from "./hold-buttons";
import { HoldStatus } from "./hold-status";

/** The unit's temporary hold and what this salesperson may do: hold it, confirm or cancel their own, or (team lead) cancel a colleague's. */
export function HoldPanel({ me, unitId, state, hold, hours }: { me: SalesUser; unitId: string; state: SalesState; hold: UnitHoldView | null; hours: number }) {
  const mine = hold?.salesAccountId === me.id;
  return (
    <section aria-labelledby="hold-title" className="admin-panel flex flex-col gap-4">
      {/* Focus comes back here after an action refreshes the box (see HoldStatus). */}
      <h2 id="hold-title" tabIndex={-1} className="font-display text-xl">
        الحجز المؤقت
      </h2>
      {/* Keyed by unit: the last result belongs to this unit only. */}
      <HoldStatus key={unitId}>
        {state === "AVAILABLE" && (
          <AdminForm
            action={holdUnit}
            submitLabel={`احجزها ${countAr(hours, HOURS_NOUN)}`}
            submitClassName="press admin-btn min-h-11 justify-center sm:min-h-0"
            pendingLabel="جارٍ الحجز…"
          >
            <input type="hidden" name="unitId" value={unitId} />
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-ink">الحجز لمين؟ (اختياري)</span>
              {/* 16 px on a phone so iOS doesn't zoom into the field; 44 px tall to tap. */}
              <input
                name="clientNote"
                maxLength={200}
                autoComplete="off"
                aria-describedby="hold-note-hint"
                className="admin-input min-h-11 text-base sm:min-h-10 sm:text-sm"
              />
              <span id="hold-note-hint" className="text-xs text-muted">
                اسم العميل أو ملاحظة ليك، لحد ٢٠٠ حرف. بتبان ليك ولقادة الفريق بس.
              </span>
              <span data-error-for="clientNote" className="text-xs text-red-700 empty:hidden dark:text-red-300" />
            </label>
            <p className="m-0 text-xs leading-relaxed text-pretty text-muted">
              الوحدة هتبان «محجوزة مؤقتًا» لكل الفريق لحد ما تأكد الحجز أو تلغيه. لو الوقت خلص من غير تأكيد بترجع متاحة لوحدها.
            </p>
          </AdminForm>
        )}
        {state === "HELD" && hold && (
          <div className="flex flex-col gap-3">
            <p className="m-0 rounded-xl bg-brass-soft px-4 py-3 text-sm leading-relaxed text-brass-dark">
              {mine ? "محجوزة ليك" : `محجوزة مؤقتًا لـ ${hold.holder}`} لحد <b className="font-semibold">{formatDateTimeAr(hold.expiresAt)}</b>
              {hold.clientNote && (
                <span className="mt-1 block text-body">
                  الحجز لـ: <bdi>{hold.clientNote}</bdi>
                </span>
              )}
            </p>
            {mine ? (
              <>
                <p className="m-0 text-xs leading-relaxed text-pretty text-muted">أكّد الحجز لما العميل يدفع، أو ألغيه عشان زمايلك يقدروا يحجزوها.</p>
                <div className="flex flex-wrap items-start gap-3">
                  <ConvertHoldButton holdId={hold.id} />
                  <CancelHoldButton holdId={hold.id} />
                </div>
              </>
            ) : (
              <>
                <p className="m-0 text-xs leading-relaxed text-pretty text-muted">مينفعش تحجزها لحد ما الحجز يخلص أو يتلغى.</p>
                {me.role === "LEAD" && <CancelHoldButton holdId={hold.id} holder={hold.holder} />}
              </>
            )}
          </div>
        )}
        {state === "RESERVED" && <p className="m-0 text-sm text-muted">الوحدة دي محجوزة (الحجز اتأكد)، فمينفعش تتحجز مؤقتًا.</p>}
        {state === "SOLD" && <p className="m-0 text-sm text-muted">الوحدة دي اتباعت.</p>}
      </HoldStatus>
    </section>
  );
}
