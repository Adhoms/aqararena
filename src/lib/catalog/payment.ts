import { INSTALLMENTS_PER_YEAR } from "@/lib/property";
import type { PlanStepInput } from "./plan-steps";
import { buildSchedule } from "./schedule";
import type { PaymentPlan } from "./types";

// What a buyer pays for one unit on one plan, for the calculator on the project page and the Sales
// budget search. A plan with a custom schedule is worked out from its steps (catalog/schedule.ts, the
// same math as price offers), so its first payment and its total match the offer; its installments
// aren't equal, so `installment` and `monthly` are averages there (`custom` says so).

export type PaymentBreakdown = {
  price: number;
  /** Worked out from a custom schedule: the installments differ, `installment` and `monthly` are averages. */
  custom: boolean;
  /** A cash plan: everything is paid at contract, less the cash discount. */
  cash: boolean;
  /** Paid at contract: the down payment, or the discounted price on a cash plan (on a custom schedule, the first payment). */
  down: number;
  /** Paid at handover. */
  delivery: number;
  installmentsTotal: number;
  /** Number of installments over the whole plan. */
  count: number;
  perYear: number;
  installment: number;
  /** The installments spread over every month of the plan. */
  monthly: number;
  /** Down payment plus the installments of the first twelve months. */
  firstYear: number;
  maintenance: number;
  total: number;
};

export function paymentBreakdown(price: number, plan: PaymentPlan, maintenancePct = 0): PaymentBreakdown {
  const cash = plan.years === 0;
  if (plan.steps?.length && !cash) return customBreakdown(price, plan, plan.steps, maintenancePct);
  const maintenance = (price * maintenancePct) / 100;
  const down = cash ? price * (1 - (plan.cashDiscountPct ?? 0) / 100) : (price * plan.downPaymentPct) / 100;
  const delivery = cash ? 0 : (price * plan.deliveryPaymentPct) / 100;
  const installmentsTotal = cash ? 0 : price - down - delivery;
  const perYear = INSTALLMENTS_PER_YEAR[plan.frequency];
  const count = cash ? 0 : plan.years * perYear;
  const installment = count ? installmentsTotal / count : 0;
  return {
    price,
    custom: false,
    cash,
    down,
    delivery,
    installmentsTotal,
    count,
    perYear,
    installment,
    monthly: cash ? 0 : installmentsTotal / (plan.years * 12),
    firstYear: down + installment * Math.min(perYear, count),
    maintenance,
    total: down + installmentsTotal + delivery + maintenance,
  };
}

/** A custom schedule's figures, from the same rows a price offer lists. */
function customBreakdown(price: number, plan: PaymentPlan, steps: PlanStepInput[], maintenancePct: number): PaymentBreakdown {
  const maintenance = (price * maintenancePct) / 100;
  const rows = buildSchedule(price, steps, 0, 0).rows;
  const down = rows[0]?.amount ?? 0;
  const installmentsTotal = price - down;
  const count = rows.length - 1;
  const lastMonth = rows.at(-1)?.monthOffset ?? 0;
  return {
    price,
    custom: true,
    cash: false,
    down,
    delivery: 0,
    installmentsTotal,
    count,
    perYear: INSTALLMENTS_PER_YEAR[plan.frequency],
    installment: count ? installmentsTotal / count : 0,
    monthly: lastMonth ? installmentsTotal / lastMonth : 0,
    firstYear: rows.filter((r) => r.monthOffset < 12).reduce((sum, r) => sum + r.amount, 0),
    maintenance,
    total: price + maintenance,
  };
}

/** One line of the offer sheet's schedule: a year of installments. */
export type ScheduleYear = { year: number; count: number; installment: number; total: number };

/** The installments year by year (empty for a cash plan, and for a custom schedule: its installments differ). */
export function paymentSchedule(b: PaymentBreakdown): ScheduleYear[] {
  if (b.cash || !b.count || b.custom) return [];
  return Array.from({ length: b.count / b.perYear }, (_, i) => ({
    year: i + 1,
    count: b.perYear,
    installment: b.installment,
    total: b.installment * b.perYear,
  }));
}
