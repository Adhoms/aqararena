import type { FormReader } from "./form";
import {
  AMENITIES,
  CURRENCIES,
  FINISHING_TYPES,
  INSTALLMENT_FREQUENCIES,
  ORIENTATIONS,
  PROJECT_STATUSES,
  PROPERTY_CATEGORIES,
  SUB_TYPES,
  UNIT_AVAILABILITY,
  UNIT_VIEWS,
} from "@/lib/property";
import { MAX_SCHEDULE_LENGTH, parseSteps, termsFromSteps } from "@/lib/catalog/plan-steps";

// The fields of each record, read and checked from a form. Shared by the admin forms
// (app/admin/actions.ts) and the Excel import (lib/admin/import), so both accept exactly
// the same values and give the same messages. Links to other records (developer, area,
// project, unit type) are resolved by the caller.

export const FEDDAN_M2 = 4200.83;

export function readDeveloper(f: FormReader) {
  const nameEn = f.requiredText("nameEn", 200);
  return {
    nameAr: f.requiredText("nameAr", 200),
    nameEn,
    slug: f.slug("slug", nameEn),
    foundedYear: f.int("foundedYear", { min: 1900, max: 2100 }),
    aboutAr: f.text("aboutAr"),
    aboutEn: f.text("aboutEn"),
    logoUrl: f.url("logoUrl"),
    website: f.url("website"),
    hotline: f.text("hotline", { max: 40 }),
    salesPhone: f.text("salesPhone", { max: 40 }),
    whatsapp: f.text("whatsapp", { max: 40 }),
    email: f.text("email", { max: 200 }),
    hqAddressAr: f.text("hqAddressAr", { max: 500 }),
    hqAddressEn: f.text("hqAddressEn", { max: 500 }),
    verified: f.bool("verified"),
  };
}

export function readProject(f: FormReader) {
  const nameEn = f.requiredText("nameEn", 200);
  const landFeddan = f.number("landFeddan", { min: 0 });
  const lat = f.number("latitude", { min: 21, max: 32 });
  const lng = f.number("longitude", { min: 24, max: 37 });
  if ((lat === null) !== (lng === null)) f.errors.longitude = "أدخل خط العرض وخط الطول معًا";
  return {
    nameAr: f.requiredText("nameAr", 200),
    nameEn,
    slug: f.slug("slug", nameEn),
    descriptionAr: f.text("descriptionAr"),
    descriptionEn: f.text("descriptionEn"),
    districtAr: f.text("districtAr", { max: 200 }),
    districtEn: f.text("districtEn", { max: 200 }),
    categories: f.many("categories", PROPERTY_CATEGORIES),
    status: f.oneOf("status", PROJECT_STATUSES, { required: true }) ?? "LAUNCH",
    launchDate: f.date("launchDate"),
    deliveryDate: f.date("deliveryDate", { required: true }) ?? new Date(),
    progressPct: f.int("progressPct", { min: 0, max: 100 }),
    pricesUpdatedAt: f.date("pricesUpdatedAt"),
    bookingFee: f.number("bookingFee", { min: 0 }),
    // Not required: an Excel sheet without the column, or with a blank cell, still creates projects in
    // pounds. An existing project keeps its currency then (the import leaves the column out of that
    // row's update: lib/admin/import/workbook.ts, and a portal draft saved before the setting existed
    // keeps the live one: lib/portal/drafts.ts).
    currency: f.oneOf("currency", CURRENCIES) ?? "EGP",
    landAreaM2: landFeddan === null ? null : Math.round(landFeddan * FEDDAN_M2 * 100) / 100,
    footprintPct: f.pct("footprintPct"),
    unitsCount: f.int("unitsCount", { min: 0 }),
    amenities: f.many("amenities", AMENITIES),
    latitude: lat,
    longitude: lng,
    masterPlanUrl: f.url("masterPlanUrl"),
    isFeatured: f.bool("isFeatured"),
    published: f.bool("published"),
  };
}

export function readTypology(f: FormReader) {
  const bua = f.number("buaM2", { required: true, min: 1 });
  const price = f.number("priceFrom", { required: true, min: 0 });
  return {
    code: f.requiredText("code", 40),
    nameAr: f.text("nameAr", { max: 200 }),
    nameEn: f.text("nameEn", { max: 200 }),
    category: f.oneOf("category", PROPERTY_CATEGORIES, { required: true }) ?? "RESIDENTIAL",
    subType: f.oneOf("subType", SUB_TYPES, { required: true }) ?? "APARTMENT",
    buaM2: bua ?? 0,
    bedrooms: f.int("bedrooms", { min: 0, max: 20 }),
    bathrooms: f.int("bathrooms", { min: 0, max: 20 }),
    gardenM2: f.number("gardenM2", { min: 0 }),
    roofM2: f.number("roofM2", { min: 0 }),
    finishing: f.oneOf("finishing", FINISHING_TYPES, { required: true }) ?? "CORE_AND_SHELL",
    priceFrom: price,
    pricePerM2From: price && bua ? Math.round(price / bua) : null,
  };
}

/**
 * A payment plan. With a custom schedule in `steps` (the notation in catalog/plan-steps.ts), the down
 * payment, years, frequency and delivery payment are taken from the steps, so they needn't be typed.
 */
export function readPaymentPlan(f: FormReader) {
  const parsed = parseSteps(f.text("steps", { max: MAX_SCHEDULE_LENGTH }) ?? "");
  if (parsed.error) f.errors.steps ??= parsed.error;
  const terms = parsed.steps.length ? termsFromSteps(parsed.steps) : null;
  // The terms are needed only for a plan without a schedule; a schedule with a mistake shows that mistake alone.
  const needTerms = !terms && f.raw("steps") === "";
  const down = f.pct("downPaymentPct", { required: needTerms });
  const delivery = f.pct("deliveryPaymentPct") ?? 0;
  if (!terms && down !== null && down + delivery > 100) f.errors.deliveryPaymentPct = "المقدم + دفعة الاستلام أكثر من 100%";
  const years = f.int("years", { required: needTerms, min: 0, max: 30 });
  const frequency = f.oneOf("frequency", INSTALLMENT_FREQUENCIES, { required: needTerms });
  const maintenancePct = f.pct("maintenancePct");
  if (parsed.steps.some((s) => s.kind === "MAINTENANCE") && !maintenancePct) f.errors.maintenancePct ??= "فيه دفعات صيانة، اكتب وديعة الصيانة %";
  return {
    nameAr: f.text("nameAr", { max: 200 }),
    nameEn: f.text("nameEn", { max: 200 }),
    downPaymentPct: terms?.downPaymentPct ?? down ?? 0,
    deliveryPaymentPct: terms ? terms.deliveryPaymentPct : delivery,
    years: terms?.years ?? years ?? 0,
    frequency: terms?.frequency ?? frequency ?? "QUARTERLY",
    cashDiscountPct: f.pct("cashDiscountPct"),
    maintenancePct,
    garageFee: f.number("garageFee", { min: 0 }),
    clubFee: f.number("clubFee", { min: 0 }),
    validUntil: f.date("validUntil"),
    isActive: f.bool("isActive"),
    /** The custom schedule; empty for a plan paid by its terms. Written as nested PlanStep rows by the caller. */
    steps: parsed.steps,
  };
}

/** One unit of a unit type. The type itself (and its project) is resolved by the caller. */
export function readUnit(f: FormReader) {
  return {
    unitNumber: f.requiredText("unitNumber", 40),
    building: f.text("building", { max: 40 }),
    floor: f.int("floor", { min: -5, max: 200 }),
    view: f.oneOf("view", UNIT_VIEWS),
    orientation: f.oneOf("orientation", ORIENTATIONS),
    price: f.number("price", { min: 0 }),
    availability: f.oneOf("availability", UNIT_AVAILABILITY, { required: true }) ?? "AVAILABLE",
    /** Checked against the unit's project by the caller (zoneOfProject). */
    zoneId: f.id("zoneId"),
  };
}
