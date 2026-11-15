import assert from "node:assert/strict";
import { test } from "node:test";
import { FormReader } from "@/lib/admin/form";
import { readSalesPerson, readSalesRole } from "./fields";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return new FormReader(data);
};

test("a complete form reads cleanly", () => {
  const f = form({ nameAr: "أحمد علي", nameEn: "Ahmed Ali", phone: "+20 100 123 4567", whatsapp: "", email: "ahmed@example.com", role: "LEAD" });
  const v = readSalesPerson(f);
  assert.equal(f.ok, true);
  assert.deepEqual(v, { nameAr: "أحمد علي", nameEn: "Ahmed Ali", phone: "+20 100 123 4567", whatsapp: null, email: "ahmed@example.com" });
});

test("name and phone are required, the phone needs enough digits, the email must look like one", () => {
  const f = form({ nameAr: "", phone: "12", email: "not-an-email" });
  readSalesPerson(f);
  assert.equal(f.errors.nameAr, "هذا الحقل مطلوب");
  assert.match(f.errors.phone, /رقم موبايل/);
  assert.match(f.errors.email, /بريد/);
});

test("readSalesRole returns LEAD for LEAD", () => {
  const f = form({ role: "LEAD" });
  assert.equal(readSalesRole(f), "LEAD");
  assert.equal(f.ok, true);
});

test("readSalesRole returns AGENT for an unknown role and records an error", () => {
  const f = form({ role: "BOSS" });
  assert.equal(readSalesRole(f), "AGENT");
  assert.ok(f.errors.role);
});

test("Arabic-Indic digits are converted and the phone is returned normalised", () => {
  const f = form({ nameAr: "منى", phone: "٠١٠٠ ١٢٣ ٤٥٦٧" });
  const v = readSalesPerson(f);
  assert.equal(f.ok, true);
  assert.equal(v.phone, "0100 123 4567");
});

test("Persian digits are converted too", () => {
  const f = form({ nameAr: "منى", phone: "۰۱۰۰۱۲۳۴۵۶۷" });
  assert.equal(readSalesPerson(f).phone, "01001234567");
  assert.equal(f.ok, true);
});

test("brackets and dots become spaces and runs of spaces collapse", () => {
  const f = form({ nameAr: "منى", phone: "(010) 123.4567" });
  const v = readSalesPerson(f);
  assert.equal(f.ok, true);
  assert.equal(v.phone, "010 123 4567");
});

test("a phone with letters is refused", () => {
  const f = form({ nameAr: "منى", phone: "abc12345678" });
  readSalesPerson(f);
  assert.match(f.errors.phone, /رقم موبايل/);
});

test("a 16-digit phone is refused", () => {
  const f = form({ nameAr: "منى", phone: "1234567890123456" });
  readSalesPerson(f);
  assert.match(f.errors.phone, /رقم موبايل/);
});

test("a 7-digit WhatsApp number is refused with the WhatsApp message", () => {
  const f = form({ nameAr: "منى", phone: "01001234567", whatsapp: "1234567" });
  readSalesPerson(f);
  assert.match(f.errors.whatsapp, /رقم واتساب/);
  assert.equal(f.errors.phone, undefined);
});

test("an empty nameEn reads as null", () => {
  const f = form({ nameAr: "منى", nameEn: "", phone: "01001234567" });
  assert.equal(readSalesPerson(f).nameEn, null);
  assert.equal(f.ok, true);
});

test("invisible direction marks around a phone number are ignored", () => {
  const a = form({ nameAr: "منى", phone: "\u202A+20 100 123 4567\u202C" });
  assert.equal(readSalesPerson(a).phone, "+20 100 123 4567");
  assert.equal(a.ok, true);
  const b = form({ nameAr: "منى", phone: "\u200E01001234567" });
  assert.equal(readSalesPerson(b).phone, "01001234567");
  assert.equal(b.ok, true);
});
