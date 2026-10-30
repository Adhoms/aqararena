"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { CATALOG_TAG } from "@/lib/catalog";
import { endSession, passwordMatches, requireAdmin, startSession } from "@/lib/admin/auth";
import { FormReader, type FormState } from "@/lib/admin/form";
import { MEDIA_KINDS } from "@/lib/admin/labels";
import {
  AMENITIES,
  FINISHING_TYPES,
  INSTALLMENT_FREQUENCIES,
  PHOTO_GROUPS,
  PROJECT_STATUSES,
  PROPERTY_CATEGORIES,
  SUB_TYPES,
  ZONE_KINDS,
} from "@/lib/property";

// Every admin write goes through here. Each action checks the session first and refreshes
// the public catalog cache ("catalog" tag) after saving, so the site shows the change at once.

const FEDDAN_M2 = 4200.83;
const SAVED: FormState = { ok: true, message: "تم الحفظ ✓" };

function published() {
  updateTag(CATALOG_TAG);
}

/** Turns known database errors into a form message; rethrows anything else. */
function dbError(e: unknown, uniqueField: string, uniqueMessage: string): FormState {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return { ok: false, message: uniqueMessage, errors: { [uniqueField]: uniqueMessage } };
  }
  throw e;
}

const today = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

// ─── Session ────────────────────────────────────────────────────────────

export async function login(_: FormState, data: FormData): Promise<FormState> {
  const password = data.get("password");
  if (typeof password !== "string" || !passwordMatches(password)) {
    // Slow down guessing a little.
    await new Promise((r) => setTimeout(r, 800));
    return { ok: false, message: "كلمة المرور غير صحيحة" };
  }
  await startSession();
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

// ─── Developers ─────────────────────────────────────────────────────────

export async function saveDeveloper(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const f = new FormReader(data);
  const id = f.id("id");
  const nameEn = f.requiredText("nameEn", 200);
  const values = {
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
  if (!f.ok) return f.result();

  let newId: string | undefined;
  try {
    if (id) await db.developer.update({ where: { id }, data: values });
    else newId = (await db.developer.create({ data: values })).id;
  } catch (e) {
    return dbError(e, "slug", "هذا الرابط المختصر مستخدم لمطور آخر");
  }
  published();
  if (newId) redirect(`/admin/developers/${newId}?created=1`);
  return SAVED;
}

export async function deleteDeveloper(data: FormData) {
  await requireAdmin();
  const id = new FormReader(data).id("id");
  if (id) await db.developer.delete({ where: { id } });
  published();
  redirect("/admin");
}

// ─── Areas ──────────────────────────────────────────────────────────────

export async function saveArea(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const f = new FormReader(data);
  const nameEn = f.requiredText("nameEn", 200);
  const values = { nameAr: f.requiredText("nameAr", 200), nameEn, slug: f.slug("slug", nameEn) };
  if (!f.ok) return f.result();
  try {
    await db.area.create({ data: values });
  } catch (e) {
    return dbError(e, "slug", "هذه المنطقة موجودة بالفعل");
  }
  published();
  return { ok: true, message: "تمت إضافة المنطقة ✓" };
}

// ─── Projects ───────────────────────────────────────────────────────────

export async function saveProject(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const f = new FormReader(data);
  const id = f.id("id");
  const nameEn = f.requiredText("nameEn", 200);
  const developerId = f.id("developerId");
  const areaId = f.id("areaId");
  if (!developerId) f.errors.developerId = "اختر المطور";
  if (!areaId) f.errors.areaId = "اختر المنطقة";
  const landFeddan = f.number("landFeddan", { min: 0 });
  const lat = f.number("latitude", { min: 21, max: 32 });
  const lng = f.number("longitude", { min: 24, max: 37 });
  if ((lat === null) !== (lng === null)) f.errors.longitude = "أدخل خط العرض وخط الطول معًا";

  const values = {
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
  if (!f.ok || !developerId || !areaId) return f.result();

  const relations = { developer: { connect: { id: developerId } }, area: { connect: { id: areaId } } };
  let newId: string | undefined;
  try {
    if (id) await db.project.update({ where: { id }, data: { ...values, ...relations } });
    else newId = (await db.project.create({ data: { ...values, ...relations } })).id;
  } catch (e) {
    return dbError(e, "slug", "هذا الرابط المختصر مستخدم لمشروع آخر");
  }
  published();
  if (newId) redirect(`/admin/projects/${newId}?created=1`);
  return SAVED;
}

export async function deleteProject(data: FormData) {
  await requireAdmin();
  const id = new FormReader(data).id("id");
  if (id) await db.project.delete({ where: { id } });
  published();
  redirect("/admin");
}

/** Marks the project's prices as confirmed today (called when unit types or plans change). */
async function touchPrices(projectId: string) {
  await db.project.update({ where: { id: projectId }, data: { pricesUpdatedAt: today() } });
}

// ─── Unit types ─────────────────────────────────────────────────────────

export async function saveTypology(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const f = new FormReader(data);
  const id = f.id("id");
  const projectId = f.id("projectId");
  const bua = f.number("buaM2", { required: true, min: 1 });
  const price = f.number("priceFrom", { required: true, min: 0 });
  const values = {
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
  if (!f.ok || !projectId) return f.result();
  try {
    if (id) await db.typology.update({ where: { id, projectId }, data: values });
    else await db.typology.create({ data: { ...values, projectId } });
  } catch (e) {
    return dbError(e, "code", "هذا الكود مستخدم لنموذج آخر في نفس المشروع");
  }
  await touchPrices(projectId);
  published();
  return id ? SAVED : { ok: true, message: "تمت الإضافة ✓" };
}

// ─── Payment plans ──────────────────────────────────────────────────────

export async function savePaymentPlan(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const f = new FormReader(data);
  const id = f.id("id");
  const projectId = f.id("projectId");
  const down = f.pct("downPaymentPct", { required: true });
  const delivery = f.pct("deliveryPaymentPct") ?? 0;
  if (down !== null && down + delivery > 100) f.errors.deliveryPaymentPct = "المقدم + دفعة الاستلام أكثر من 100%";
  const values = {
    nameAr: f.text("nameAr", { max: 200 }),
    nameEn: f.text("nameEn", { max: 200 }),
    typologyId: f.id("typologyId"),
    downPaymentPct: down ?? 0,
    deliveryPaymentPct: delivery,
    years: f.int("years", { required: true, min: 0, max: 30 }) ?? 0,
    frequency: f.oneOf("frequency", INSTALLMENT_FREQUENCIES, { required: true }) ?? "QUARTERLY",
    cashDiscountPct: f.pct("cashDiscountPct"),
    maintenancePct: f.pct("maintenancePct"),
    garageFee: f.number("garageFee", { min: 0 }),
    clubFee: f.number("clubFee", { min: 0 }),
    validUntil: f.date("validUntil"),
    isActive: f.bool("isActive"),
  };
  if (!f.ok || !projectId) return f.result();
  if (id) await db.paymentPlan.update({ where: { id, projectId }, data: values });
  else await db.paymentPlan.create({ data: { ...values, projectId } });
  await touchPrices(projectId);
  published();
  return id ? SAVED : { ok: true, message: "تمت الإضافة ✓" };
}

// ─── Master-plan zones ──────────────────────────────────────────────────

export async function saveZone(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const f = new FormReader(data);
  const id = f.id("id");
  const projectId = f.id("projectId");
  const values = {
    kind: f.oneOf("kind", ZONE_KINDS, { required: true }) ?? "RESIDENTIAL",
    shortAr: f.requiredText("shortAr", 20),
    shortEn: f.requiredText("shortEn", 20),
    nameAr: f.requiredText("nameAr", 200),
    nameEn: f.requiredText("nameEn", 200),
    phaseAr: f.text("phaseAr", { max: 100 }),
    phaseEn: f.text("phaseEn", { max: 100 }),
    descriptionAr: f.text("descriptionAr"),
    descriptionEn: f.text("descriptionEn"),
    areaFeddan: f.number("areaFeddan", { min: 0 }),
    buildingsCount: f.int("buildingsCount", { min: 0 }),
    unitsCount: f.int("unitsCount", { min: 0 }),
    unitSubTypes: f.many("unitSubTypes", SUB_TYPES),
    xPct: f.pct("xPct", { required: true }) ?? 0,
    yPct: f.pct("yPct", { required: true }) ?? 0,
    widthPct: f.pct("widthPct", { required: true }) ?? 0,
    heightPct: f.pct("heightPct", { required: true }) ?? 0,
    sortOrder: f.int("sortOrder") ?? 0,
  };
  if (!f.ok || !projectId) return f.result();
  if (id) await db.masterPlanZone.update({ where: { id, projectId }, data: values });
  else await db.masterPlanZone.create({ data: { ...values, projectId } });
  published();
  return id ? SAVED : { ok: true, message: "تمت الإضافة ✓" };
}

// ─── Media ──────────────────────────────────────────────────────────────

export async function saveMedia(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const f = new FormReader(data);
  const id = f.id("id");
  const projectId = f.id("projectId");
  const kind = f.oneOf("kind", MEDIA_KINDS, { required: true }) ?? "IMAGE";
  const group = f.oneOf("group", PHOTO_GROUPS);
  if (kind === "IMAGE" && !group) f.errors.group = "اختر تبويب الصورة";
  const values = {
    kind,
    group: kind === "IMAGE" ? group : null,
    url: f.url("url", { required: true }) ?? "",
    captionAr: f.text("captionAr", { max: 300 }),
    captionEn: f.text("captionEn", { max: 300 }),
    sortOrder: f.int("sortOrder") ?? 0,
  };
  if (!f.ok || !projectId) return f.result();
  if (id) await db.media.update({ where: { id, projectId }, data: values });
  else await db.media.create({ data: { ...values, projectId } });
  published();
  return id ? SAVED : { ok: true, message: "تمت الإضافة ✓" };
}

// ─── Distances ──────────────────────────────────────────────────────────

export async function saveDistance(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const f = new FormReader(data);
  const id = f.id("id");
  const projectId = f.id("projectId");
  const values = {
    placeAr: f.requiredText("placeAr", 200),
    placeEn: f.requiredText("placeEn", 200),
    minutes: f.int("minutes", { required: true, min: 0, max: 600 }) ?? 0,
    sortOrder: f.int("sortOrder") ?? 0,
  };
  if (!f.ok || !projectId) return f.result();
  if (id) await db.projectDistance.update({ where: { id, projectId }, data: values });
  else await db.projectDistance.create({ data: { ...values, projectId } });
  published();
  return id ? SAVED : { ok: true, message: "تمت الإضافة ✓" };
}

// ─── Deleting project parts ─────────────────────────────────────────────

const PARTS = {
  typology: (id: string, projectId: string) => db.typology.delete({ where: { id, projectId } }),
  plan: (id: string, projectId: string) => db.paymentPlan.delete({ where: { id, projectId } }),
  zone: (id: string, projectId: string) => db.masterPlanZone.delete({ where: { id, projectId } }),
  media: (id: string, projectId: string) => db.media.delete({ where: { id, projectId } }),
  distance: (id: string, projectId: string) => db.projectDistance.delete({ where: { id, projectId } }),
} as const;

export async function deleteProjectPart(data: FormData) {
  await requireAdmin();
  const f = new FormReader(data);
  const id = f.id("id");
  const projectId = f.id("projectId");
  const part = data.get("part");
  if (!id || !projectId || typeof part !== "string" || !(part in PARTS)) return;
  await PARTS[part as keyof typeof PARTS](id, projectId);
  if (part === "typology" || part === "plan") await touchPrices(projectId);
  published();
}
