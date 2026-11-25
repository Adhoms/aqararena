import type { Currency } from "@/lib/property";
import { paymentBreakdown } from "./payment";
import type { PaymentPlan, Project, ProjectSummary } from "./types";

/** A project's currency. */
export const currencyOf = (p: Pick<Project, "currency">): Currency => p.currency ?? "EGP";
/** Cross-project comparisons (area figures, price filters and sort, "best" marks) are made in pounds only. */
export const inEgp = (p: Pick<Project, "currency">) => currencyOf(p) === "EGP";

/** What a plan costs per month once the down payment and the delivery payment are set aside (from its steps, when it has a custom schedule). */
export const monthlyFor = (price: number, plan: PaymentPlan) =>
  plan.years === 0 ? 0 : plan.steps?.length ? paymentBreakdown(price, plan).monthly : (price * (100 - plan.downPaymentPct - plan.deliveryPaymentPct)) / 100 / (plan.years * 12);

export const isCashPlan = (plan: PaymentPlan) => plan.years === 0;

/** Figures shown on cards and compared side by side, derived from unit types and plans. */
export function summarize(project: Project): ProjectSummary {
  const prices = project.typologies.map((t) => t.priceFrom);
  const perM2 = project.typologies.map((t) => t.priceFrom / t.buaM2);
  const areas = project.typologies.map((t) => t.buaM2);
  const installments = project.paymentPlans.filter((p) => !isCashPlan(p));
  const startingPrice = Math.min(...prices);
  const entryPlan = [...installments].sort((a, b) => a.downPaymentPct - b.downPaymentPct || b.years - a.years)[0];
  return {
    entryDown: entryPlan ? Math.round((startingPrice * entryPlan.downPaymentPct) / 100 / 1000) * 1000 : 0,
    entryMonthly: entryPlan ? Math.round(monthlyFor(startingPrice, entryPlan) / 100) * 100 : 0,
    startingPrice,
    avgPricePerM2: Math.round(perM2.reduce((a, b) => a + b, 0) / perM2.length / 50) * 50,
    minDownPct: installments.length ? Math.min(...installments.map((p) => p.downPaymentPct)) : 100,
    maxYears: installments.length ? Math.max(...installments.map((p) => p.years)) : 0,
    maxCashDiscountPct: Math.max(0, ...project.paymentPlans.map((p) => p.cashDiscountPct ?? 0)),
    minMonthly: installments.length ? Math.round(Math.min(...installments.map((p) => monthlyFor(startingPrice, p))) / 100) * 100 : 0,
    areaRange: [Math.min(...areas), Math.max(...areas)],
    subTypes: [...new Set(project.typologies.map((t) => t.subType))],
    finishings: [...new Set(project.typologies.map((t) => t.finishing))],
  };
}
