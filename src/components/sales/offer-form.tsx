"use client";

import { useId, useState, type ReactNode } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { createOfferAction } from "@/app/sales/offer-actions";
import { Money } from "./money";
import type { Currency } from "@/lib/property";
import { DISCOUNT_CAP, OFFER_VALIDITY_MAX, OFFER_VALIDITY_MIN, discountDecision, parsePct, type DiscountLimits, type OfferActor } from "@/lib/sales/offers";

type PlanOption = { id: string; label: string };

// 16 px on a phone so iOS doesn't zoom into the field, and 44 px tall to tap (as in the hold box).
const input = "admin-input min-h-11 text-base sm:min-h-10 sm:text-sm";
const pct = (n: number) => String(Number(n.toFixed(2)));

/** A labelled field with its hint and the slot AdminForm fills with the server's message for it. */
function Field({ name, label, hint, hintId, children }: { name: string; label: ReactNode; hint?: ReactNode; hintId?: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {children}
      {hint && (
        <span id={hintId} className="text-xs leading-relaxed text-pretty text-muted">
          {hint}
        </span>
      )}
      <span data-error-for={name} className="text-xs text-red-700 empty:hidden dark:text-red-300" />
    </label>
  );
}

/**
 * A new offer for one unit: who it is for, the plan, the language, how long it holds and an optional
 * discount. Under the discount it says at once what the client pays and whether the offer goes out
 * now or waits for a team lead. The service checks all of it again against the database.
 */
export function OfferForm({
  unitId,
  plans,
  validityDays,
  limits,
  role,
  price,
  currency,
}: {
  unitId: string;
  plans: PlanOption[];
  validityDays: number;
  limits: DiscountLimits;
  role: OfferActor["role"];
  price: number;
  currency: Currency;
}) {
  const ids = useId();
  const [discount, setDiscount] = useState("");
  const typed = discount.trim();
  const parsed = typed ? parsePct(typed) : null;
  const value = parsed?.value ?? 0;
  const decision = discountDecision(role, value, limits);
  const own = role === "LEAD" ? limits.leadDiscountPct : limits.agentDiscountPct;

  // What the discount does, as it is typed.
  let tone: "muted" | "warn" | "bad" = "muted";
  let note: ReactNode;
  if (!typed || (parsed && value === 0)) {
    note =
      limits.leadDiscountPct === 0 ? (
        "الشركة لسه ماحددتش خصم على العروض، فالعرض هيطلع بسعر الوحدة."
      ) : own >= limits.leadDiscountPct ? (
        <>
          اختياري، لحد <bdi dir="ltr">{pct(own)}%</bdi>.
        </>
      ) : (
        <>
          اختياري. لحد <bdi dir="ltr">{pct(own)}%</bdi> العرض بيطلع على طول، ولحد <bdi dir="ltr">{pct(limits.leadDiscountPct)}%</bdi> بيستنى موافقة قائد الفريق.
        </>
      );
  } else if (!parsed || parsed.decimals > 2 || value > DISCOUNT_CAP) {
    tone = "bad";
    note = parsed && parsed.decimals > 2 ? "رقمين بعد العلامة بالكتير" : `اكتب نسبة من 0 لـ ${DISCOUNT_CAP}`;
  } else if (!decision.ok) {
    tone = "bad";
    note = decision.message;
  } else {
    tone = decision.status === "PENDING_APPROVAL" ? "warn" : "muted";
    note = decision.status === "PENDING_APPROVAL" ? "العرض هيستنى موافقة قائد الفريق قبل ما تقدر تبعته." : "العرض هيطلع على طول بالسعر ده.";
  }
  const net = Math.round(price * (1 - (decision.ok ? value : 0) / 100));
  const showNet = Boolean(typed) && decision.ok && value > 0 && Boolean(parsed) && (parsed?.decimals ?? 0) <= 2;
  const noteClass = { muted: "text-muted", warn: "text-brass-dark", bad: "text-red-700 dark:text-red-300" }[tone];

  return (
    <AdminForm action={createOfferAction} submitLabel="طلّع العرض" pendingLabel="بنجهّز العرض…" submitClassName="press admin-btn min-h-11 justify-center sm:min-h-0">
      <input type="hidden" name="unitId" value={unitId} />

      <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <legend className="mb-3 p-0 font-display text-lg">العميل</legend>
        <Field name="clientName" label="اسم العميل *" hint="بيظهر على غلاف العرض" hintId={`${ids}-name`}>
          <input name="clientName" maxLength={100} autoComplete="off" aria-describedby={`${ids}-name`} className={input} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="clientPhone" label="موبايل العميل" hint="لو كتبته، الواتساب هيفتح على رقمه على طول" hintId={`${ids}-phone`}>
            <input name="clientPhone" type="tel" dir="ltr" maxLength={40} autoComplete="off" aria-describedby={`${ids}-phone`} className={input} />
          </Field>
          <Field name="clientEmail" label="إيميل العميل" hint="اختياري، عشان تبعتله العرض بالإيميل" hintId={`${ids}-email`}>
            <input name="clientEmail" type="email" dir="ltr" maxLength={200} autoComplete="off" aria-describedby={`${ids}-email`} className={input} />
          </Field>
        </div>
      </fieldset>

      <div aria-hidden="true" className="border-t border-divider" />

      <fieldset className="m-0 flex min-w-0 flex-col gap-4 border-0 p-0">
        <legend className="mb-3 p-0 font-display text-lg">العرض</legend>
        <Field name="planId" label="خطة السداد *">
          <select name="planId" defaultValue={plans[0]?.id} className={input}>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field name="language" label="لغة العرض *" hint="اللغة اللي العميل هيقرا بيها العرض">
            <select name="language" defaultValue="ar" className={input}>
              <option value="ar">عربي</option>
              <option value="en">English</option>
            </select>
          </Field>
          <Field
            name="validityDays"
            label="ساري كام يوم *"
            hintId={`${ids}-days`}
            hint={
              <>
                من <bdi dir="ltr">{OFFER_VALIDITY_MIN}</bdi> لـ <bdi dir="ltr">{OFFER_VALIDITY_MAX}</bdi> يوم
              </>
            }
          >
            <input name="validityDays" inputMode="numeric" dir="ltr" defaultValue={validityDays} autoComplete="off" aria-describedby={`${ids}-days`} className={`${input} tabular-nums`} />
          </Field>
        </div>
        <div className="flex flex-col gap-3 rounded-xl bg-ink/[0.035] p-4 sm:flex-row sm:items-start sm:gap-6">
          <label className="flex flex-col gap-1.5 text-sm sm:w-40 sm:shrink-0">
            <span className="font-medium text-ink">خصم %</span>
            <input
              name="discountPct"
              inputMode="decimal"
              dir="ltr"
              autoComplete="off"
              placeholder="0"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              aria-describedby={`${ids}-discount`}
              aria-invalid={tone === "bad" || undefined}
              className={`${input} tabular-nums`}
            />
            <span data-error-for="discountPct" className="text-xs text-red-700 empty:hidden dark:text-red-300" />
          </label>
          <div className="flex min-w-0 flex-1 flex-col gap-1 text-sm sm:pt-7">
            <span className="flex flex-wrap items-baseline gap-x-2 tabular-nums">
              <span className="text-muted">{showNet ? "السعر بعد الخصم" : "سعر الوحدة"}</span>
              <span className="font-medium text-ink">
                <Money value={showNet ? net : price} currency={currency} />
              </span>
              {showNet && (
                <s className="text-xs text-muted">
                  <Money value={price} currency={currency} />
                </s>
              )}
            </span>
            <span id={`${ids}-discount`} aria-live="polite" className={`text-xs leading-relaxed text-pretty ${noteClass}`}>
              {note}
            </span>
          </div>
        </div>
      </fieldset>
    </AdminForm>
  );
}
