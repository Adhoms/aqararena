// src/lib/sales/budget.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { budgetFigure, fitsBudget, planLabel, plansForType, type SalesPlan } from "./budget";

const plan = (over: Partial<SalesPlan>): SalesPlan => ({
  id: "p",
  typologyId: null,
  name: { ar: "", en: "" },
  downPaymentPct: 10,
  deliveryPaymentPct: 0,
  years: 8,
  frequency: "QUARTERLY",
  ...over,
});
// On a 4,000,000 unit: A = 400,000 down and 3,600,000 / 96 = 37,500 a month;
// B = 800,000 down and 3,200,000 / 60 = 53,333.33 a month; cash = 3,000,000 at once.
const A = plan({ id: "A", downPaymentPct: 10, years: 8 });
const B = plan({ id: "B", downPaymentPct: 20, years: 5, frequency: "MONTHLY" });
const CASH = plan({ id: "cash", downPaymentPct: 100, years: 0, cashDiscountPct: 25 });
const PRICE = 4_000_000;

test("total price: the unit's price, no plan needed", () => {
  assert.deepEqual(budgetFigure(PRICE, [], "total"), { value: PRICE, planId: null });
});

test("down payment: the lowest across the plans, or on the chosen plan", () => {
  assert.deepEqual(budgetFigure(PRICE, [A, B, CASH], "down"), { value: 400_000, planId: "A" });
  assert.deepEqual(budgetFigure(PRICE, [A, B, CASH], "down", "B"), { value: 800_000, planId: "B" });
  assert.deepEqual(budgetFigure(PRICE, [A, B, CASH], "down", "cash"), { value: 3_000_000, planId: "cash" });
});

test("monthly: the lowest monthly equivalent; a cash plan has none", () => {
  assert.deepEqual(budgetFigure(PRICE, [A, B, CASH], "monthly"), { value: 37_500, planId: "A" });
  assert.equal(budgetFigure(PRICE, [CASH], "monthly"), null);
  assert.equal(budgetFigure(PRICE, [A, B], "monthly", "cash"), null, "a plan that isn't offered gives nothing");
});

test("a plan with no installments never wins a monthly budget", () => {
  const NO_INSTALLMENTS = plan({ id: "N", downPaymentPct: 50, deliveryPaymentPct: 50, years: 2 });
  assert.equal(budgetFigure(PRICE, [NO_INSTALLMENTS], "monthly"), null);
  assert.deepEqual(budgetFigure(PRICE, [NO_INSTALLMENTS, A], "monthly"), { value: 37_500, planId: "A" });
});

test("without plans there is no down payment or installment to compare", () => {
  assert.equal(budgetFigure(PRICE, [], "down"), null);
  assert.equal(budgetFigure(PRICE, [], "monthly"), null);
});

test("fits within the budget, to the nearest pound", () => {
  assert.equal(fitsBudget({ value: 37_500, planId: "A" }, 37_500), true);
  assert.equal(fitsBudget({ value: 37_500, planId: "A" }, 37_499), false);
  assert.equal(fitsBudget({ value: 53_333.33, planId: "B" }, 53_333), true);
  assert.equal(fitsBudget(null, 10_000_000), false);
});

test("a type is sold on the project's general plans and its own", () => {
  const general = plan({ id: "g" });
  const mine = plan({ id: "m", typologyId: "t1" });
  const other = plan({ id: "o", typologyId: "t2" });
  assert.deepEqual(plansForType([general, mine, other], "t1").map((p) => p.id), ["g", "m"]);
});

test("plan labels: the name, else the terms", () => {
  assert.equal(planLabel(plan({ name: { ar: "خطة الإطلاق", en: "Launch" } })), "خطة الإطلاق");
  assert.equal(planLabel(plan({ name: { ar: "", en: "Launch" } })), "Launch");
  assert.equal(planLabel(plan({ downPaymentPct: 10, years: 8 })), "10% مقدم · 8 سنين");
  assert.equal(planLabel(plan({ downPaymentPct: 50, years: 1 })), "50% مقدم · سنة");
  assert.equal(planLabel(plan({ downPaymentPct: 30, years: 2 })), "30% مقدم · سنتين");
  assert.equal(planLabel(CASH), "كاش (خصم 25%)");
  assert.equal(planLabel(plan({ years: 0, downPaymentPct: 100 })), "كاش");
});
