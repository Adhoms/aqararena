import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSteps, formatSteps, parseSteps, spreadEvenly, termsFromSteps, toStepRows } from "./plan-steps";

const SAMPLE = "0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100";

test("single entries, with or without a percent sign", () => {
  const r = parseSteps("0:10, 12:40%, 24:50");
  assert.equal(r.error, null);
  assert.deepEqual(r.steps, [
    { monthOffset: 0, pct: 10, kind: "PAYMENT" },
    { monthOffset: 12, pct: 40, kind: "PAYMENT" },
    { monthOffset: 24, pct: 50, kind: "PAYMENT" },
  ]);
});

test("an even share: each rounded to 6 decimals, the last takes what is left", () => {
  assert.deepEqual(spreadEvenly(90, 31).slice(0, 2), [2.903226, 2.903226]);
  assert.equal(spreadEvenly(90, 31)[30], 2.90322);
  assert.deepEqual(spreadEvenly(100, 3), [33.333333, 33.333333, 33.333334]);
  assert.deepEqual(spreadEvenly(30, 12), Array(12).fill(2.5));
});

test("the sample plan: 33 payments and 3 maintenance parts", () => {
  const r = parseSteps(SAMPLE);
  assert.equal(r.error, null);
  const pay = r.steps.filter((s) => s.kind === "PAYMENT");
  const care = r.steps.filter((s) => s.kind === "MAINTENANCE");
  assert.equal(pay.length, 33);
  assert.deepEqual(pay.slice(0, 3).map((s) => [s.monthOffset, s.pct]), [[0, 5], [3, 5], [6, 2.903226]]);
  assert.deepEqual(pay.at(-1), { monthOffset: 96, pct: 2.90322, kind: "PAYMENT" });
  assert.deepEqual(care.map((s) => s.monthOffset), [9, 21, 33]);
});

test("Arabic digits, Arabic commas and new lines", () => {
  const r = parseSteps("٠:١٠، ١٢:٤٠\n٢٤:٥٠");
  assert.equal(r.error, null);
  assert.deepEqual(r.steps.map((s) => s.monthOffset), [0, 12, 24]);
});

test("nothing typed means no custom schedule", () => {
  assert.deepEqual(parseSteps("  "), { steps: [], error: null });
});

test("mistakes are explained", () => {
  assert.match(parseSteps("0:50, 12:40").error!, /مجموع الدفعات 90%/);
  assert.match(parseSteps("0:50, 0:50").error!, /متكرر/);
  assert.match(parseSteps("abc").error!, /مش فاهم «abc»/);
  assert.match(parseSteps("0:10, 6-95/3:90").error!, /مش بتيجي مظبوطة/);
  assert.match(parseSteps("0:100, صيانة 12:50").error!, /مجموع الصيانة 50%/);
  assert.match(parseSteps("0:99.1234567, 1:0.8765433").error!, /6 أرقام/);
  assert.match(parseSteps("0:50, 400:50").error!, /برّه المدى/);
  assert.match(parseSteps("صيانة 12:100").error!, /مجموع الدفعات 0%/);
  assert.match(parseSteps("0:10, 6-96/0:90").error!, /شهر أو أكتر/);
  assert.match(parseSteps("0:10, 6-95/3:90").error!, /كل ٣ شهور/);
  assert.match(parseSteps("0:10, 6-95/1:90, 96:0").error!, /مش فاهم|لازم تبقى أكبر من صفر/);
});

test("the work is capped before anything is checked", () => {
  assert.match(parseSteps("0:100, ".repeat(1000)).error!, /أطول من/);
  assert.match(parseSteps("0:10, 1-100000000/1:90").error!, /برّه المدى/);
  assert.match(parseSteps("0-360/1:100, صيانة 0-360/1:100").error!, /ميزيدش عن ٤٠٠ دفعة/);
  assert.match(parseSteps(Array.from({ length: 401 }, (_, i) => `${i % 361}:0.1`).join(",")).error!, /أكتر من ٤٠٠ دفعة/);
});

test("a share too small to spread is refused", () => {
  assert.match(parseSteps("0:99.99999, 1-6/1:0.00001").error!, /النسبة صغيرة على ٦ دفعات/);
});

test("common Arabic typing: ٪, dashes, «الصيانة», «صيانه» and direction marks", () => {
  const plain = parseSteps("0:10, 3-12/3:90, صيانة 12:100").steps;
  for (const text of [
    "٠:١٠٪، ٣\u2013١٢/٣:٩٠٪، الصيانة ١٢:١٠٠٪",
    "0:10, 3\u201412/3:90, صيانه 12:100",
    "\u200F0:10\u200E, \u202B3-12/3:90\u202C, \u2067الصيانه 12:100\u2069\u061C",
  ]) {
    const r = parseSteps(text);
    assert.equal(r.error, null, text);
    assert.deepEqual(r.steps, plain);
  }
});

test("checkSteps accepts what parseSteps makes", () => {
  assert.equal(checkSteps(parseSteps(SAMPLE).steps), null);
  assert.equal(checkSteps([]), null);
});

test("written back in the shortest form, and read again to the same steps", () => {
  assert.equal(formatSteps(parseSteps(SAMPLE).steps), SAMPLE);
  for (const text of ["0:10, 12:40, 24:50", "0:20, 1-12/1:30, 24:50", "0:100", "0:10, 3:30, 6:60, صيانة 12:100", "0:5, 3-12/3:40, 15-24/3:55", "0:1, 1-360/1:99"]) {
    const steps = parseSteps(text).steps;
    assert.equal(formatSteps(steps), text);
    assert.deepEqual(parseSteps(formatSteps(steps)).steps, steps);
  }
});

test("the plan's headline terms come from its steps", () => {
  assert.deepEqual(termsFromSteps(parseSteps(SAMPLE).steps), { downPaymentPct: 5, deliveryPaymentPct: 0, years: 8, frequency: "QUARTERLY" });
  assert.deepEqual(termsFromSteps(parseSteps("0:100").steps), { downPaymentPct: 100, deliveryPaymentPct: 0, years: 0, frequency: null });
  // Nothing at contract: the first payment is what the buyer needs to start, so it counts as the down payment.
  assert.deepEqual(termsFromSteps(parseSteps("3:50, 13:50").steps), { downPaymentPct: 50, deliveryPaymentPct: 0, years: 2, frequency: null });
});

test("the frequency is the schedule's most common gap", () => {
  assert.equal(termsFromSteps(parseSteps("0:10, 1-12/1:60, 18-36/6:30").steps).frequency, "MONTHLY");
  assert.equal(termsFromSteps(parseSteps("0:10, 6-48/6:80, 60:10").steps).frequency, "SEMI_ANNUAL");
  assert.equal(termsFromSteps(parseSteps("0:20, 12-60/12:80").steps).frequency, "ANNUAL");
  assert.equal(termsFromSteps(parseSteps("0:10, 3:10, 6:10, 18:10, 30:60").steps).frequency, "QUARTERLY", "a tie goes to the shorter gap");
});

test("rows for the database keep the order", () => {
  const rows = toStepRows(parseSteps("صيانة 12:100, 0:10, 12:90").steps);
  assert.deepEqual(rows.map((r) => [r.kind, r.monthOffset, r.sortOrder]), [["PAYMENT", 0, 0], ["PAYMENT", 12, 1], ["MAINTENANCE", 12, 2]]);
});
