import type { PaymentPlan, Project, ProjectSummary } from "./types";

export const isCashPlan = (plan: PaymentPlan) => plan.years === 0;

/** Figures shown on cards and compared side by side, derived from unit types and plans. */
export function summarize(project: Project): ProjectSummary {
  const prices = project.typologies.map((t) => t.priceFrom);
  const perM2 = project.typologies.map((t) => t.priceFrom / t.buaM2);
  const areas = project.typologies.map((t) => t.buaM2);
  const installments = project.paymentPlans.filter((p) => !isCashPlan(p));
  return {
    startingPrice: Math.min(...prices),
    avgPricePerM2: Math.round(perM2.reduce((a, b) => a + b, 0) / perM2.length / 50) * 50,
    minDownPct: installments.length ? Math.min(...installments.map((p) => p.downPaymentPct)) : 100,
    maxYears: installments.length ? Math.max(...installments.map((p) => p.years)) : 0,
    maxCashDiscountPct: Math.max(0, ...project.paymentPlans.map((p) => p.cashDiscountPct ?? 0)),
    areaRange: [Math.min(...areas), Math.max(...areas)],
    subTypes: [...new Set(project.typologies.map((t) => t.subType))],
    finishings: [...new Set(project.typologies.map((t) => t.finishing))],
  };
}
