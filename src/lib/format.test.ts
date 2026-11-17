import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDateTimeAr } from "./format";

test("a hold's end is shown on Cairo's clock, whatever the server's time zone", () => {
  // 13:00 UTC on Thursday 19 November 2026 is 3:00 pm in Cairo (UTC+2 in winter).
  const s = formatDateTimeAr(new Date("2026-11-19T13:00:00Z"));
  assert.match(s, /الخميس/);
  assert.match(s, /١٩/);
  assert.match(s, /٣:٠٠/);
  assert.match(s, /م/);
});

test("late evening UTC is already the next day in Cairo", () => {
  assert.match(formatDateTimeAr(new Date("2026-11-19T23:30:00Z")), /الجمعة/);
});
