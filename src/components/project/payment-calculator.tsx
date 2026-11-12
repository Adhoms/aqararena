"use client";

import { useId, useState } from "react";
import type { Locale } from "@/i18n/config";
import { paymentBreakdown } from "@/lib/catalog/payment";
import type { PaymentPlan } from "@/lib/catalog/types";
import { fill, formatMoney } from "@/lib/format";
import type { InstallmentFrequency } from "@/lib/property";

type Unit = { code: string; name: string; price: number };

type Labels = {
  title: string;
  sub: string;
  unit: string;
  plan: string;
  price: string;
  cashPrice: string;
  atContract: string;
  installment: string;
  installmentsCount: string;
  monthlyEq: string;
  delivery: string;
  maintenance: string;
  firstYear: string;
  total: string;
  split: string;
  parts: { down: string; installments: string; delivery: string; maintenance: string };
  note: string;
  /** Link text for the printable offer sheet of the current choice. */
  offer: string;
  frequencyPer: Record<InstallmentFrequency, string>;
  /** Plan names in the page's language, in the same order as `plans`. */
  planNames: string[];
};

type Props = {
  units: Unit[];
  plans: PaymentPlan[];
  maintenancePct?: number;
  locale: Locale;
  labels: Labels;
  /** The project's offer page; the chosen unit and plan are added to it. */
  offerHref: string;
};

/** The four parts of what a buyer pays, in the order they are paid. */
const PART_STYLES = {
  down: "bg-brand",
  installments: "bg-brand-3",
  delivery: "bg-brass",
  maintenance: "bg-brass-light",
} as const;

/** Every pound a buyer pays for one unit type on one plan: at contract, per installment, at handover, in total. */
export function PaymentCalculator({ units, plans, maintenancePct, locale, labels, offerHref }: Props) {
  const id = useId();
  const [unitCode, setUnitCode] = useState(units[0]?.code);
  const [planIndex, setPlanIndex] = useState(0);
  const unit = units.find((u) => u.code === unitCode) ?? units[0];
  const plan = plans[planIndex] ?? plans[0];
  if (!unit || !plan) return null;

  const money = (n: number, step = 100) => formatMoney(Math.round(n / step) * step, locale);
  const { price, cash, down, delivery, installmentsTotal, count, installment, monthly, firstYear, maintenance, total } = paymentBreakdown(
    unit.price,
    plan,
    maintenancePct,
  );

  const parts = (
    [
      ["down", down],
      ["installments", installmentsTotal],
      ["delivery", delivery],
      ["maintenance", maintenance],
    ] as const
  ).filter(([, v]) => v > 0);

  const rows: [string, string][] = [
    [labels.price, money(price, 1000)],
    ...(cash ? ([[labels.cashPrice, money(down, 1000)]] as [string, string][]) : []),
    ...(!cash
      ? ([
          [
            `${labels.installment} (${fill(labels.installmentsCount, { n: count, years: plan.years })})`,
            `${money(installment)} ${labels.frequencyPer[plan.frequency]}`,
          ],
          [labels.monthlyEq, `~${money(monthly)}`],
          ...(delivery ? [[labels.delivery, money(delivery, 1000)]] : []),
          [labels.firstYear, money(firstYear, 1000)],
        ] as [string, string][])
      : []),
    ...(maintenance ? ([[fill(labels.maintenance, { pct: maintenancePct ?? 0 }), money(maintenance, 1000)]] as [string, string][]) : []),
  ];

  const select =
    "min-h-12 w-full rounded-2xl border border-line-strong bg-surface px-4 text-[15px] text-ink focus:border-brand focus:outline-none";

  return (
    <section aria-labelledby={`${id}-title`} className="grid gap-8 rounded-3xl border border-line bg-surface p-6 sm:p-9 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <h3 id={`${id}-title`} className="font-display text-2xl font-medium">
            {labels.title}
          </h3>
          <p className="text-sm text-muted">{labels.sub}</p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          {labels.unit}
          <select value={unit.code} onChange={(e) => setUnitCode(e.target.value)} className={select}>
            {units.map((u) => (
              <option key={u.code} value={u.code}>
                {u.name} · {money(u.price, 1000)}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="mb-1.5 p-0 text-sm font-semibold">{labels.plan}</legend>
          <div className="flex flex-wrap gap-2">
            {plans.map((p, i) => (
              <label
                key={i}
                className="inline-flex min-h-11 cursor-pointer items-center rounded-full border border-line-strong px-4 text-sm has-checked:border-brand has-checked:bg-brand has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-brand"
              >
                <input
                  type="radio"
                  name={`${id}-plan`}
                  checked={i === planIndex}
                  onChange={() => setPlanIndex(i)}
                  className="sr-only"
                />
                {labels.planNames[i]}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="text-xs text-muted">{labels.note}</p>
        <a
          href={`${offerHref}?u=${encodeURIComponent(unit.code)}&plan=${plans.indexOf(plan)}`}
          className="press inline-flex min-h-12 items-center justify-center self-start rounded-full bg-brand px-5.5 text-[15px] font-medium text-white no-underline hover:bg-brand-2 hover:text-white print:hidden"
        >
          {labels.offer}
        </a>
      </div>

      <div className="flex flex-col gap-5" aria-live="polite">
        <div className="flex flex-col gap-1 rounded-2xl bg-brass-soft px-5 py-4">
          <span className="text-sm text-body">{labels.atContract}</span>
          <span className="font-display text-[34px] leading-tight font-light text-ink">{money(down, 1000)}</span>
        </div>

        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted">{label}</dt>
              <dd className="text-end font-semibold">{value}</dd>
            </div>
          ))}
          <dt className="border-t border-divider pt-2.5 font-semibold">{labels.total}</dt>
          <dd className="border-t border-divider pt-2.5 text-end font-display text-lg">{money(total, 1000)}</dd>
        </dl>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-muted">{labels.split}</span>
          <div className="flex h-3 overflow-hidden rounded-full bg-divider" aria-hidden="true">
            {parts.map(([key, value]) => (
              <span key={key} className={PART_STYLES[key]} style={{ width: `${(value / total) * 100}%` }} />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-body">
            {parts.map(([key, value]) => (
              <li key={key} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`size-2.5 rounded-full ${PART_STYLES[key]}`} />
                {key === "down" && cash ? labels.cashPrice : labels.parts[key]} {Math.round((value / total) * 100)}%
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
