import { paymentBreakdown } from "@/lib/catalog/payment";
import type { PaymentPlan } from "@/lib/catalog/types";

// The Sales search's budget filter. The salesperson types one amount and says what it is: the
// whole price, the down payment, or the monthly installment. Down payments and installments come
// from the same payment math as the calculator (catalog/payment.ts), so the two always agree.

export const BUDGET_BASES = ["total", "down", "monthly"] as const;
export type BudgetBasis = (typeof BUDGET_BASES)[number];
export const BUDGET_LABELS: Record<BudgetBasis, string> = { total: "السعر الكلي", down: "المقدم", monthly: "القسط الشهري" };

/** An active payment plan as Sales reads it: the catalog's terms plus its id, the unit type it is limited to, and its maintenance. */
export type SalesPlan = PaymentPlan & { id: string; typologyId: string | null; maintenancePct?: number };

/** The plans a unit of this type is sold on: the project's general plans and the type's own. */
export const plansForType = (plans: SalesPlan[], typologyId: string) => plans.filter((p) => p.typologyId === null || p.typologyId === typologyId);

export type BudgetFigure = { value: number; planId: string | null };

/**
 * The amount a budget is compared with: the price itself, or the lowest down payment / monthly
 * installment over `plans` (only `planId` when one is chosen). Null when no plan gives one.
 */
export function budgetFigure(price: number, plans: SalesPlan[], basis: BudgetBasis, planId?: string): BudgetFigure | null {
  if (basis === "total") return { value: price, planId: null };
  let best: BudgetFigure | null = null;
  for (const plan of plans) {
    if (planId && plan.id !== planId) continue;
    const b = paymentBreakdown(price, plan);
    // A cash plan, or one paid entirely at contract and handover, has no installments to compare.
    if (basis === "monthly" && (b.cash || b.installmentsTotal <= 0)) continue;
    const value = basis === "down" ? b.down : b.monthly;
    if (!best || value < best.value) best = { value, planId: plan.id };
  }
  return best;
}

/** Within the budget, to the nearest pound. */
export function fitsBudget(figure: BudgetFigure | null, amount: number): figure is BudgetFigure {
  return figure !== null && Math.round(figure.value) <= amount;
}

/** A plan's name, or its terms when the developer didn't name it. */
export function planLabel(plan: Pick<SalesPlan, "name" | "downPaymentPct" | "years" | "cashDiscountPct">): string {
  const named = plan.name.ar.trim() || plan.name.en.trim();
  if (named) return named;
  if (plan.years === 0) return plan.cashDiscountPct ? `كاش (خصم ${plan.cashDiscountPct}%)` : "كاش";
  const years = plan.years === 1 ? "سنة" : plan.years === 2 ? "سنتين" : `${plan.years} ${plan.years <= 10 ? "سنين" : "سنة"}`;
  return `${plan.downPaymentPct}% مقدم · ${years}`;
}
