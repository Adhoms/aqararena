import assert from "node:assert/strict";
import { test } from "node:test";
import { CHOICES, headerMatches, sheetByKey } from "./columns";

test("price columns say «بعملة المشروع» and still read old templates that said «جنيه»", () => {
  const price = sheetByKey("units").columns.find((c) => c.key === "price")!;
  assert.equal(price.header, "سعر الوحدة (بعملة المشروع)");
  assert.equal(headerMatches(price, "سعر الوحدة (بعملة المشروع)"), true);
  assert.equal(headerMatches(price, "سعر الوحدة (جنيه)"), true);
  assert.equal(headerMatches(price, "price"), true, "the field key works too");
  assert.equal(headerMatches(price, "السعر"), false);
});

test("every old «(جنيه)» header is still accepted", () => {
  const cases: [Parameters<typeof sheetByKey>[0], string, string][] = [
    ["projects", "bookingFee", "مبلغ الحجز (جنيه)"],
    ["typologies", "priceFrom", "السعر يبدأ من (جنيه) *"],
    ["plans", "garageFee", "الجراج (جنيه)"],
    ["plans", "clubFee", "النادي (جنيه)"],
  ];
  for (const [sheet, key, old] of cases) {
    const col = sheetByKey(sheet).columns.find((c) => c.key === key)!;
    assert.match(col.header, /بعملة المشروع/);
    assert.equal(headerMatches(col, old), true, old);
  }
});

test("projects have a currency column", () => {
  const currency = sheetByKey("projects").columns.find((c) => c.key === "currency")!;
  assert.equal(currency.type, "choice");
  assert.deepEqual(CHOICES.currency.map((c) => c.value), ["EGP", "USD"]);
});
