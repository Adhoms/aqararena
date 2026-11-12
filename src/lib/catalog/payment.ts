import { INSTALLMENTS_PER_YEAR } from "@/lib/property";
import type { PaymentPlan } from "./types";

// What a buyer pays for one unit on one plan. The calculator on the project page and the
// printable offer sheet both read these figures, so the two can never disagree.

export type PaymentBreakdown = {
  price: number;
  /** A cash plan: everything is paid at contract, less the cash discount. */
  cash: boolean;
  /** Paid at contract: the down payment, or the discounted price on a cash plan. */
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
  const maintenance = (price * maintenancePct) / 100;
  const down = cash ? price * (1 - (plan.cashDiscountPct ?? 0) / 100) : (price * plan.downPaymentPct) / 100;
  const delivery = cash ? 0 : (price * plan.deliveryPaymentPct) / 100;
  const installmentsTotal = cash ? 0 : price - down - delivery;
  const perYear = INSTALLMENTS_PER_YEAR[plan.frequency];
  const count = cash ? 0 : plan.years * perYear;
  const installment = count ? installmentsTotal / count : 0;
  return {
    price,
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

/** One line of the offer sheet's schedule: a year of installments. */
export type ScheduleYear = { year: number; count: number; installment: number; total: number };

/** The installments year by year (empty for a cash plan). */
export function paymentSchedule(b: PaymentBreakdown): ScheduleYear[] {
  if (b.cash || !b.count) return [];
  return Array.from({ length: b.count / b.perYear }, (_, i) => ({
    year: i + 1,
    count: b.perYear,
    installment: b.installment,
    total: b.installment * b.perYear,
  }));
}
