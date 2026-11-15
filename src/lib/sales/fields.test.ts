import assert from "node:assert/strict";
import { test } from "node:test";
import { FormReader } from "@/lib/admin/form";
import { readSalesPerson } from "./fields";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return new FormReader(data);
};

test("a complete form reads cleanly", () => {
  const f = form({ nameAr: "أحمد علي", nameEn: "Ahmed Ali", phone: "+20 100 123 4567", whatsapp: "", email: "ahmed@example.com", role: "LEAD" });
  const v = readSalesPerson(f);
  assert.equal(f.ok, true);
  assert.deepEqual(v, { nameAr: "أحمد علي", nameEn: "Ahmed Ali", phone: "+20 100 123 4567", whatsapp: null, email: "ahmed@example.com", role: "LEAD" });
});

test("name and phone are required, the phone needs enough digits, the email must look like one", () => {
  const f = form({ nameAr: "", phone: "12", email: "not-an-email" });
  readSalesPerson(f);
  assert.equal(f.errors.nameAr, "هذا الحقل مطلوب");
  assert.match(f.errors.phone, /رقم موبايل/);
  assert.match(f.errors.email, /بريد/);
});

test("an unknown role falls back to AGENT", () => {
  const f = form({ nameAr: "منى", phone: "01001234567", role: "BOSS" });
  assert.equal(readSalesPerson(f).role, "AGENT");
});
