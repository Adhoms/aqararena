import assert from "node:assert/strict";
import { test } from "node:test";
import { offerDate, scheduleDate } from "./offer-copy";
import { offerMessage, telegramShareUrl, whatsappNumber, whatsappShareUrl } from "./share";

test("Egyptian mobiles: local 01… becomes 201…", () => {
  assert.equal(whatsappNumber("01012345678"), "201012345678");
  assert.equal(whatsappNumber("٠١١ ٢٣٤٥ ٦٧٨٩"), "201123456789");
  assert.equal(whatsappNumber("+20 155 123 4567"), "201551234567");
  assert.equal(whatsappNumber("00201212345678"), "201212345678");
  assert.equal(whatsappNumber("1012345678"), "201012345678", "written without the leading 0");
  assert.equal(whatsappNumber("+20 010 1234 5678"), "201012345678", "+20 and the local 0 together");
  assert.equal(whatsappNumber("+2001012345678"), "201012345678");
  assert.equal(whatsappNumber("0020 0101 234 5678"), "201012345678");
  assert.equal(whatsappNumber("+20 02 2345 6789"), null, "a landline stays without WhatsApp");
});

test("other countries keep their code; landlines and junk have no WhatsApp number", () => {
  assert.equal(whatsappNumber("+971 50 123 4567"), "971501234567");
  assert.equal(whatsappNumber("0223456789"), null);
  assert.equal(whatsappNumber("123"), null);
  assert.equal(whatsappNumber(""), null);
  assert.equal(whatsappNumber(null), null);
});

test("share links", () => {
  assert.equal(whatsappShareUrl("سلام", "https://x.test/o/T", "201012345678"), "https://wa.me/201012345678?text=%D8%B3%D9%84%D8%A7%D9%85%0Ahttps%3A%2F%2Fx.test%2Fo%2FT");
  assert.match(whatsappShareUrl("hi", "https://x.test/o/T", null), /^https:\/\/wa\.me\/\?text=hi%0A/);
  assert.equal(telegramShareUrl("hi there", "https://x.test/o/T"), "https://t.me/share/url?url=https%3A%2F%2Fx.test%2Fo%2FT&text=hi%20there");
});

test("the message: unit, price, down payment and validity, in the offer's language", () => {
  const base = { unit: "B1 · 101", project: "Wadi Yemm", price: 27_454_000, down: 1_372_700, cash: false, currency: "EGP" as const, validUntil: new Date("2026-11-19T10:00:00Z") };
  assert.equal(
    offerMessage({ ...base, language: "en" }),
    ["Price offer: B1 · 101, Wadi Yemm", "Price: EGP 27,454,000", "Down payment: EGP 1,372,700", "Valid until 19 November 2026"].join("\n"),
  );
  const ar = offerMessage({ ...base, language: "ar", currency: "USD", cash: true });
  assert.match(ar, /^عرض سعر: B1 · 101، Wadi Yemm\n/);
  assert.match(ar, /السعر: \u200E\$27,454,000\n/, "dollars as formatMoney writes them, sign first");
  assert.match(ar, /الدفع كاش: \u200E\$1,372,700\n/);
  assert.match(offerMessage({ ...base, language: "ar" }), /\nالسعر: 27,454,000 ج\.م\nالمقدم: 1,372,700 ج\.م\n/);
  assert.match(ar, /ساري لحد 19 نوفمبر 2026/);
});

test("dates on the offer: Cairo's calendar, Western digits", () => {
  assert.equal(offerDate(new Date("2026-11-18T23:30:00Z"), "en"), "19 November 2026");
  assert.equal(offerDate(new Date("2026-11-18T10:00:00Z"), "ar"), "18 نوفمبر 2026");
  assert.equal(scheduleDate("2027-02-12", "en"), "12 Feb 2027");
  assert.equal(scheduleDate("2027-02-12", "ar"), "12 فبراير 2027");
});
