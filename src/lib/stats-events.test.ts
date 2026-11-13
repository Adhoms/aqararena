import assert from "node:assert/strict";
import { test } from "node:test";
import { BOT_PATTERN, changePct, parseTrackAttr, periodTotals, trackAttr, type DayCount } from "./stats-events";

test("track attribute round trip, and junk is refused", () => {
  assert.deepEqual(parseTrackAttr(trackAttr("CALL", "project-a")), { event: "CALL", slug: "project-a" });
  assert.equal(parseTrackAttr("CALL"), null);
  assert.equal(parseTrackAttr("HACK:project-a"), null);
  assert.equal(parseTrackAttr("VIEW:../../etc"), null);
  assert.equal(parseTrackAttr(""), null);
});

test("period totals split the last 30 days from the 30 before", () => {
  const rows: DayCount[] = [
    { day: "2026-11-13", event: "VIEW", count: 5 }, // today: this period
    { day: "2026-10-15", event: "VIEW", count: 2 }, // 30th day back: this period
    { day: "2026-10-14", event: "VIEW", count: 7 }, // 31st day back: earlier period
    { day: "2026-09-15", event: "VIEW", count: 1 }, // 60th day back: earlier period
    { day: "2026-09-14", event: "VIEW", count: 100 }, // too old
    { day: "2026-11-01", event: "CALL", count: 3 },
  ];
  const t = periodTotals(rows, "2026-11-13", 30);
  assert.deepEqual(t.VIEW, { now: 7, before: 8 });
  assert.deepEqual(t.CALL, { now: 3, before: 0 });
  assert.deepEqual(t.SHARE, { now: 0, before: 0 });
});

test("change in percent, none without an earlier figure", () => {
  assert.equal(changePct({ now: 15, before: 10 }), 50);
  assert.equal(changePct({ now: 5, before: 10 }), -50);
  assert.equal(changePct({ now: 5, before: 0 }), null);
});

test("crawlers and link previews are recognised", () => {
  assert.ok(BOT_PATTERN.test("Mozilla/5.0 (compatible; Googlebot/2.1)"));
  assert.ok(BOT_PATTERN.test("WhatsApp/2.23.20.0"));
  assert.ok(BOT_PATTERN.test("Mozilla/5.0 HeadlessChrome/130.0"));
  assert.ok(!BOT_PATTERN.test("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"));
});
