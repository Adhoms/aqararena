import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSteps } from "./plan-steps";
import {
  addMonths,
  buildSchedule,
  cairoDate,
  maintenanceAmount,
  monthsBetween,
  pageRows,
  payablePrice,
  planFingerprint,
  planSteps,
  splitAmount,
  type SchedulePlan,
} from "./schedule";

const plan = (over: Partial<SchedulePlan> = {}): SchedulePlan => ({
  downPaymentPct: 10,
  deliveryPaymentPct: 0,
  years: 2,
  frequency: "QUARTERLY",
  cashDiscountPct: null,
  maintenancePct: null,
  steps: [],
  ...over,
});

test("the sample offer: 27,454,000 on 5% + 5% + 31 quarterly installments, 10% maintenance in three parts", () => {
  const steps = parseSteps("0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100").steps;
  const s = buildSchedule(27_454_000, steps, maintenanceAmount(27_454_000, { maintenancePct: 10 }), 36);
  assert.equal(s.maintenance, 2_745_400);
  assert.equal(s.total, 30_199_400);
  assert.equal(s.payments, 33);
  assert.equal(s.maintenancePayments, 3);
  assert.equal(s.rows.length, 33, "maintenance falls on installment months");
  const [down, first, second, third] = s.rows;
  assert.deepEqual([down.installment, down.amount, down.monthOffset], [0, 1_372_700, 0]);
  assert.deepEqual([first.installment, first.amount], [1, 1_372_700]);
  assert.deepEqual([second.installment, second.amount], [2, 797_052]);
  assert.deepEqual([third.monthOffset, third.amount, third.maintenance, third.total], [9, 797_052, 915_133, 1_712_185]);
  assert.equal(Number(third.cumulativePct.toFixed(2)), 15.81);
  const last = s.rows.at(-1)!;
  assert.deepEqual([last.installment, last.monthOffset, last.amount, last.cumulativePct], [32, 96, 797_040, 100]);
  assert.equal(s.rows.reduce((sum, r) => sum + r.amount, 0), 27_454_000);
  assert.equal(s.rows.reduce((sum, r) => sum + r.maintenance, 0), 2_745_400);
  assert.equal(s.rows.find((r) => r.monthOffset === 33)!.maintenance, 915_134, "the last part takes the rounding");
  assert.deepEqual(s.rows.slice(2, 32).map((r) => r.amount), Array(30).fill(797_052), "every installment but the last is the same");
  assert.equal(s.rows.find((r) => r.monthOffset === 21)!.maintenance, 915_133);
  assert.deepEqual(
    s.rows.filter((r) => r.maintenance > 0).map((r) => [r.installment, r.monthOffset]),
    [[3, 9], [7, 21], [11, 33]],
    "maintenance rides on installments 3, 7 and 11",
  );
});

test("split: each part rounded, the last takes the rest", () => {
  assert.deepEqual(splitAmount(100, [33.333333, 33.333333, 33.333334]), [33, 33, 34]);
  assert.deepEqual(splitAmount(1_000_001, [50, 50]), [500_001, 500_000]);
});

test("split: a last part pushed below zero falls back to rounding the running total", () => {
  // Six parts of 1.5 each round up to 2, which would leave the last one -2.
  const parts = splitAmount(10, [15, 15, 15, 15, 15, 15, 10]);
  assert.deepEqual(parts, [2, 1, 2, 1, 2, 1, 1]);
  assert.equal(parts.reduce((a, b) => a + b, 0), 10);
  assert.ok(parts.every((p) => p >= 0));
  // Many tiny parts: every one stays within a pound of its share, and the total is exact.
  const many = splitAmount(1_000, [...Array(399).fill(0.25), 0.25]);
  assert.equal(many.reduce((a, b) => a + b, 0), 1_000);
  assert.ok(many.every((p) => p >= 2 && p <= 3), JSON.stringify(many.slice(-3)));
});

test("a plan without steps: down payment, equal installments, delivery payment at handover", () => {
  const steps = planSteps(plan({ deliveryPaymentPct: 10 }), 30);
  assert.equal(steps.length, 1 + 8 + 1);
  assert.deepEqual(steps[0], { monthOffset: 0, pct: 10, kind: "PAYMENT" });
  assert.deepEqual(steps.slice(1, 9).map((s) => s.monthOffset), [3, 6, 9, 12, 15, 18, 21, 24]);
  assert.equal(steps[1].pct, 10);
  assert.deepEqual(steps[9], { monthOffset: 30, pct: 10, kind: "PAYMENT" });
  const s = buildSchedule(1_000_000, steps, 0, 30);
  assert.deepEqual(s.rows.map((r) => r.amount), [100_000, ...Array(8).fill(100_000), 100_000]);
});

test("a delivery payment on an installment month shares its row", () => {
  const s = buildSchedule(1_000_000, planSteps(plan({ deliveryPaymentPct: 10 }), 24), 0, 24);
  assert.equal(s.rows.length, 9);
  assert.equal(s.rows.at(-1)!.amount, 200_000);
  assert.equal(s.payments, 10);
});

test("a cash plan is one payment, after its discount", () => {
  const cash = plan({ years: 0, downPaymentPct: 100, cashDiscountPct: 15 });
  assert.deepEqual(planSteps(cash, 12), [{ monthOffset: 0, pct: 100, kind: "PAYMENT" }]);
  assert.equal(payablePrice(2_000_000, cash), 1_700_000);
  assert.equal(payablePrice(2_000_000, cash, 5), 1_615_000);
  assert.equal(payablePrice(2_000_000, plan(), 2.5), 1_950_000);
});

test("maintenance without its own steps is paid at handover", () => {
  const s = buildSchedule(1_000_000, planSteps(plan(), 40), 80_000, 40);
  const handover = s.rows.find((r) => r.monthOffset === 40)!;
  assert.deepEqual([handover.installment, handover.amount, handover.maintenance], [null, 0, 80_000]);
  assert.equal(s.maintenancePayments, 1);
});

test("dates: calendar months, the 31st becomes the month's last day, Cairo's today", () => {
  assert.equal(addMonths("2026-11-12", 3), "2027-02-12");
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2027-12-31", 2), "2028-02-29");
  assert.equal(cairoDate(new Date("2026-11-18T23:30:00Z")), "2026-11-19");
  assert.equal(monthsBetween("2026-11-12", "2029-06-30"), 31);
  assert.equal(monthsBetween("2026-11-12", "2025-06-30"), 0);
});

test("a fingerprint changes with any term or step", () => {
  const base = { ...plan({ steps: parseSteps("0:10, 12:90").steps }), typologyId: null };
  assert.equal(planFingerprint(base), planFingerprint({ ...base, steps: [...base.steps].reverse() }));
  assert.notEqual(planFingerprint(base), planFingerprint({ ...base, maintenancePct: 8 }));
  assert.notEqual(planFingerprint(base), planFingerprint({ ...base, steps: parseSteps("0:10, 24:90").steps }));
  assert.notEqual(planFingerprint(base), planFingerprint({ ...base, typologyId: "t1" }));
});

test("a stepped plan's fingerprint ignores its derived terms", () => {
  const base = { ...plan({ steps: parseSteps("0:10, 12:90").steps }), typologyId: null };
  assert.equal(planFingerprint(base), planFingerprint({ ...base, downPaymentPct: 12, years: 3, frequency: "MONTHLY", deliveryPaymentPct: 5 }));
  const flat = { ...plan(), typologyId: null };
  assert.notEqual(planFingerprint(flat), planFingerprint({ ...flat, frequency: "MONTHLY" }), "a plan without steps is its terms");
});

test("rows split into pages", () => {
  const rows = Array.from({ length: 33 }, (_, i) => i);
  assert.deepEqual(pageRows(rows, 12, 16).map((p) => p.length), [12, 16, 5]);
  assert.deepEqual(pageRows([1, 2], 12, 16), [[1, 2]]);
});
