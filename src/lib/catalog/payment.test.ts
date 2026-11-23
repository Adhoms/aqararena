import assert from "node:assert/strict";
import { test } from "node:test";
import { paymentBreakdown, paymentSchedule } from "./payment";
import { parseSteps } from "./plan-steps";
import type { PaymentPlan } from "./types";

const plan = (over: Partial<PaymentPlan>): PaymentPlan => ({
  name: { ar: "", en: "" },
  downPaymentPct: 10,
  deliveryPaymentPct: 0,
  years: 8,
  frequency: "QUARTERLY",
  ...over,
});

test("installment plan: down payment, installments and total add up to the price", () => {
  const b = paymentBreakdown(4_000_000, plan({ downPaymentPct: 10, deliveryPaymentPct: 5, years: 8 }));
  assert.equal(b.cash, false);
  assert.equal(b.down, 400_000);
  assert.equal(b.delivery, 200_000);
  assert.equal(b.installmentsTotal, 3_400_000);
  assert.equal(b.count, 32);
  assert.equal(b.installment, 106_250);
  assert.equal(b.monthly, 3_400_000 / 96);
  assert.equal(b.firstYear, 400_000 + 4 * 106_250);
  assert.equal(b.total, 4_000_000);
});

test("maintenance deposit is added on top of the price", () => {
  const b = paymentBreakdown(4_000_000, plan({}), 8);
  assert.equal(b.maintenance, 320_000);
  assert.equal(b.total, 4_320_000);
});

test("cash plan: one payment, less the discount, no installments", () => {
  const b = paymentBreakdown(4_000_000, plan({ years: 0, downPaymentPct: 100, cashDiscountPct: 25 }));
  assert.equal(b.cash, true);
  assert.equal(b.down, 3_000_000);
  assert.equal(b.count, 0);
  assert.equal(b.installment, 0);
  assert.equal(b.monthly, 0);
  assert.equal(b.total, 3_000_000);
  assert.deepEqual(paymentSchedule(b), []);
});

test("schedule: one line per year, summing to the installments total", () => {
  const b = paymentBreakdown(6_000_000, plan({ downPaymentPct: 5, years: 10, frequency: "MONTHLY" }));
  const rows = paymentSchedule(b);
  assert.equal(rows.length, 10);
  assert.equal(rows[0].count, 12);
  assert.equal(rows[0].year, 1);
  assert.equal(Math.round(rows.reduce((sum, r) => sum + r.total, 0)), b.installmentsTotal);
});

test("a plan shorter than a year of installments counts only what it has in the first year", () => {
  const b = paymentBreakdown(1_200_000, plan({ downPaymentPct: 50, years: 1, frequency: "ANNUAL" }));
  assert.equal(b.count, 1);
  assert.equal(b.firstYear, 600_000 + 600_000);
});

test("a custom schedule: the figures come from its steps, like the offer's", () => {
  const steps = parseSteps("0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100").steps;
  const b = paymentBreakdown(27_454_000, plan({ downPaymentPct: 5, years: 8, steps }), 10);
  assert.equal(b.custom, true);
  assert.equal(b.down, 1_372_700);
  assert.equal(b.delivery, 0);
  assert.equal(b.count, 32);
  assert.equal(b.installmentsTotal, 27_454_000 - 1_372_700);
  assert.equal(b.firstYear, 1_372_700 * 2 + 797_052 * 2);
  assert.equal(b.monthly, (27_454_000 - 1_372_700) / 96);
  assert.equal(b.total, 27_454_000 + 2_745_400);
  assert.deepEqual(paymentSchedule(b), [], "its installments differ, so no equal year-by-year table");
});

test("a custom schedule with nothing at contract: its first payment is what the buyer starts with", () => {
  const steps = parseSteps("3:50, 13:50").steps;
  const b = paymentBreakdown(2_000_000, plan({ downPaymentPct: 50, years: 2, frequency: "QUARTERLY", steps }));
  assert.equal(b.down, 1_000_000);
  assert.equal(b.count, 1);
  assert.equal(b.monthly, 1_000_000 / 13);
});
