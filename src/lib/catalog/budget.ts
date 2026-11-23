import { paymentBreakdown } from "./payment";
import { inEgp, isCashPlan, monthlyFor } from "./summary";
import type { PaymentPlan, Project, Typology } from "./types";

// "Search by budget": the visitor says how much cash they have for the down payment and the
// most they can pay each month, and we find the unit types and plans that fit both.

export type Budget = {
  /** Cash available now, in pounds (the visitor types it so): covers the down payment (or the whole price for a cash plan). */
  cash?: number;
  /** Highest monthly installment the visitor can pay, in pounds too. */
  monthly?: number;
};

export type BudgetFit = {
  typology: Typology;
  plan: PaymentPlan;
  /** Paid at contract: the down payment, or the discounted price for a cash plan. */
  down: number;
  /** Monthly equivalent of the installments (0 for a cash plan). */
  monthly: number;
  /** Lump sum due at handover (0 when the plan has none). */
  delivery: number;
};

export const hasBudget = (b: Budget) => Boolean(b.cash || b.monthly);

/** Every unit type × plan the budget covers. A project priced in another currency never fits a budget in pounds. */
export function budgetFits(project: Project, budget: Budget): BudgetFit[] {
  if (!hasBudget(budget) || !inEgp(project)) return [];
  const fits: BudgetFit[] = [];
  for (const typology of project.typologies) {
    const price = typology.priceFrom;
    for (const plan of project.paymentPlans) {
      if (isCashPlan(plan)) {
        // A cash plan only fits when the visitor told us how much cash they have.
        const total = price * (1 - (plan.cashDiscountPct ?? 0) / 100);
        if (budget.cash && total <= budget.cash) fits.push({ typology, plan, down: total, monthly: 0, delivery: 0 });
        continue;
      }
      // A custom schedule's first payment, whatever its month, is what the buyer needs to start.
      const { down, delivery } = paymentBreakdown(price, plan);
      const monthly = monthlyFor(price, plan);
      if (budget.cash && down > budget.cash) continue;
      if (budget.monthly && monthly > budget.monthly) continue;
      fits.push({ typology, plan, down, monthly, delivery });
    }
  }
  return fits;
}

/** The best unit the budget buys: the most expensive one that fits, then the lowest monthly. */
export function bestBudgetFit(project: Project, budget: Budget): BudgetFit | undefined {
  return budgetFits(project, budget).sort(
    (a, b) => b.typology.priceFrom - a.typology.priceFrom || a.monthly - b.monthly || a.down - b.down,
  )[0];
}
