import assert from "node:assert/strict";
import { test } from "node:test";
import { HOLDS_NOUN, HOURS_NOUN, UNITS_NOUN, countAr, formatCountAr, formatDateTimeAr } from "./format";

test("a hold's end is shown on Cairo's clock, whatever the server's time zone", () => {
  // 13:00 UTC on Thursday 19 November 2026 is 3:00 pm in Cairo (UTC+2 in winter).
  const s = formatDateTimeAr(new Date("2026-11-19T13:00:00Z"));
  assert.match(s, /الخميس/);
  assert.match(s, /١٩/);
  assert.match(s, /٣:٠٠/);
  assert.match(s, /٣:٠٠\sم/);
});

test("in summer Cairo is UTC+3", () => {
  assert.match(formatDateTimeAr(new Date("2026-07-15T12:00:00Z")), /٣:٠٠\sم/);
});

test("the clock changes at the end of April: just after midnight UTC on Friday 24 April is 3:30 am", () => {
  const s = formatDateTimeAr(new Date("2026-04-24T00:30:00Z"));
  assert.match(s, /الجمعة/);
  assert.match(s, /٣:٣٠\sص/);
});

test("late evening UTC is already the next day in Cairo", () => {
  assert.match(formatDateTimeAr(new Date("2026-11-19T23:30:00Z")), /الجمعة/);
});

test("counts are written in Arabic digits", () => {
  assert.equal(formatCountAr(0), "٠");
  assert.equal(formatCountAr(48), "٤٨");
  assert.equal(formatCountAr(2000), "٢٬٠٠٠");
});

test("a counted noun follows the Arabic rule: 1, 2, 3 to 10, 11 and up", () => {
  const hours = [1, 2, 3, 10, 11, 48, 168].map((n) => countAr(n, HOURS_NOUN));
  assert.deepEqual(hours, ["ساعة", "ساعتين", "٣ ساعات", "١٠ ساعات", "١١ ساعة", "٤٨ ساعة", "١٦٨ ساعة"]);
  assert.deepEqual([1, 2, 7, 65].map((n) => countAr(n, UNITS_NOUN)), ["وحدة", "وحدتين", "٧ وحدات", "٦٥ وحدة"]);
  assert.deepEqual([1, 2, 3, 12].map((n) => countAr(n, HOLDS_NOUN)), ["حجز", "حجزين", "٣ حجوزات", "١٢ حجز"]);
});

test("past 100 the last two digits decide, and 0 takes the singular", () => {
  assert.equal(countAr(0, UNITS_NOUN), "٠ وحدة");
  assert.equal(countAr(100, UNITS_NOUN), "١٠٠ وحدة");
  assert.equal(countAr(102, UNITS_NOUN), "١٠٢ وحدة");
  assert.equal(countAr(103, UNITS_NOUN), "١٠٣ وحدات");
  assert.equal(countAr(111, UNITS_NOUN), "١١١ وحدة");
});
