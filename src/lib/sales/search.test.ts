import assert from "node:assert/strict";
import { test } from "node:test";
import { activeFilterCount, readSalesSearch, searchHref } from "./search";

const P = "cproject000000000001";
const M = "ctype000000000000001";
const PL = "cplan000000000000001";

test("reads every filter", () => {
  assert.deepEqual(
    readSalesSearch({ project: P, model: M, type: "APARTMENT", beds: "3", floorMin: "2", floorMax: "8", view: "garden", state: "HELD", budget: "4,500,000", by: "down", plan: PL, page: "2" }),
    { project: P, model: M, type: "APARTMENT", beds: 3, floorMin: 2, floorMax: 8, view: "garden", state: "HELD", budget: 4_500_000, by: "down", plan: PL, page: 2 },
  );
});

test("unknown values fall away; a unit type and a plan need a project", () => {
  assert.deepEqual(
    readSalesSearch({ type: "CASTLE", view: "moon", state: "LOST", by: "weekly", beds: "9", model: M, plan: PL, page: "-1", budget: "abc", project: "x" }),
    { by: "total", page: 1 },
  );
});

test("Arabic digits, commas and spaces in numbers", () => {
  assert.equal(readSalesSearch({ budget: "٤٥٠٠٠٠٠" }).budget, 4_500_000);
  assert.equal(readSalesSearch({ budget: "4 500 000" }).budget, 4_500_000);
  assert.equal(readSalesSearch({ budget: "٤٬٥٠٠٬٠٠٠" }).budget, 4_500_000);
});

test("a floor range typed the wrong way round is swapped", () => {
  const s = readSalesSearch({ floorMin: "9", floorMax: "3" });
  assert.equal(s.floorMin, 3);
  assert.equal(s.floorMax, 9);
});

test("the search URL keeps what is set and reads back the same", () => {
  const s = readSalesSearch({ project: P, type: "VILLA", budget: "30000", by: "monthly", page: "3" });
  const href = searchHref(s);
  assert.equal(href, `/sales?project=${P}&type=VILLA&budget=30000&by=monthly&page=3`);
  const back = Object.fromEntries(new URL(href, "http://x").searchParams);
  assert.deepEqual(readSalesSearch(back), s);
});

test("page 1 and a basis without a budget are left out; changes override", () => {
  assert.equal(searchHref({ by: "down", page: 1 }), "/sales");
  assert.equal(searchHref({ by: "total", page: 4, project: P }, { project: undefined, page: 1 }), "/sales");
});

test("active filters: everything but the project, the basis and the page", () => {
  assert.equal(activeFilterCount({ by: "total", page: 2, project: P }), 0);
  assert.equal(activeFilterCount({ by: "down", page: 1, budget: 500_000, beds: 2, floorMin: 1, floorMax: 4 }), 3);
});

test("Persian digits and decimals in the budget", () => {
  assert.equal(readSalesSearch({ budget: "\u06F4\u06F5\u06F0\u06F0\u06F0\u06F0\u06F0" }).budget, 4_500_000);
  assert.equal(readSalesSearch({ budget: "4500000.99" }).budget, 4_500_000);
  assert.equal(readSalesSearch({ budget: "\u0664\u066B\u0665" }).budget, 4, "Arabic decimal separator, rounded down");
  assert.equal(readSalesSearch({ budget: "0.5" }).budget, undefined, "below 1 after rounding down");
  assert.equal(readSalesSearch({ budget: "4.5.1" }).budget, undefined);
  assert.equal(readSalesSearch({ beds: "2.5" }).beds, undefined, "only the budget takes decimals");
});

test("a budget has a currency: pounds unless dollars are chosen", () => {
  assert.equal(readSalesSearch({ budget: "200000", cur: "USD" }).cur, "USD");
  assert.equal(readSalesSearch({ budget: "200000" }).cur, undefined);
  assert.equal(readSalesSearch({ budget: "200000", cur: "EUR" }).cur, undefined);
  assert.match(searchHref(readSalesSearch({ budget: "200000", cur: "USD" })), /cur=USD/);
  assert.doesNotMatch(searchHref(readSalesSearch({ cur: "USD" })), /cur=/, "no budget, no currency");
});
