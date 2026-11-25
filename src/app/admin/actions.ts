"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { CATALOG_TAG } from "@/lib/catalog";
import { passwordMatches, requireAdmin, startSession } from "@/lib/admin/auth";
import { FormReader, type FormState } from "@/lib/admin/form";
import { MEDIA_KINDS } from "@/lib/admin/labels";
import { deleteIfUnused } from "@/lib/admin/blob";
import { clearFailures, clientIp, lockedMessage, lockedMinutes, recordFailure } from "@/lib/throttle";
import { readDeveloper, readPaymentPlan, readProject, readTypology, readUnit } from "@/lib/admin/readers";
import { toStepRows } from "@/lib/catalog/plan-steps";
import { recordPriceHistory, restartPriceTracking } from "@/lib/price-history";
import { findTwinUnit, zoneOfProject } from "@/lib/units";
import { HOLDS_NOUN, countAr } from "@/lib/format";
import { releaseHoldsOfUnavailable, releaseHoldsOutOfSales } from "@/lib/sales/hold-service";
import { projectLeavesSales } from "@/lib/sales/scope";
import { PHOTO_GROUPS, SUB_TYPES, ZONE_KINDS } from "@/lib/property";

// Every admin write goes through here. Each action checks the session first and refreshes
// the public catalog cache ("catalog" tag) after saving, so the site shows the change at once.

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

/** "تم الحفظ ✓" and, when the save released Sales holds, how many. */
const savedReleasing = (released: number): FormState =>
  released ? { ok: true, message: `تم الحفظ ✓ واتلغى ${countAr(released, HOLDS_NOUN)} في AqarArena Sales` } : SAVED;

// ─── Session ────────────────────────────────────────────────────────────

export async function login(_: FormState, data: FormData): Promise<FormState> {
  const password = data.get("password");
  const keys = [`admin:${await clientIp()}`];
  const wait = await lockedMinutes(keys);
  if (wait) return { ok: false, message: lockedMessage(wait) };
  if (typeof password !== "string" || !passwordMatches(password)) {
    // Slow down guessing a little.
    await new Promise((r) => setTimeout(r, 800));
    await recordFailure(keys);
    return { ok: false, message: "كلمة المرور غير صحيحة" };
  }
  await clearFailures(keys);
  await startSession();
  redirect("/admin");
}

// ─── Developers ─────────────────────────────────────────────────────────

export async function saveDeveloper(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const f = new FormReader(data);
  const id = f.id("id");
  const values = readDeveloper(f);
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
  if (id) {
    await db.$transaction([
      // Holds point at sales accounts with ON DELETE RESTRICT; clear them before the cascade removes the accounts.
      db.unitHold.deleteMany({ where: { salesAccount: { developerId: id } } }),
      db.developer.delete({ where: { id } }),
    ]);
  }
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
  const developerId = f.id("developerId");
  const areaId = f.id("areaId");
  if (!developerId) f.errors.developerId = "اختر المطور";
  if (!areaId) f.errors.areaId = "اختر المنطقة";
  const values = readProject(f);
  if (!f.ok || !developerId || !areaId) return f.result();

  const relations = { developer: { connect: { id: developerId } }, area: { connect: { id: areaId } } };
  let newId: string | undefined;
  let released = 0;
  try {
    if (id) {
      released = await db.$transaction(async (tx) => {
        const before = await tx.project.findUnique({ where: { id }, select: { developerId: true, published: true, currency: true } });
        await tx.project.update({ where: { id }, data: { ...values, ...relations } });
        // Prices in another currency: the price history and the alert figures start again.
        if (before && before.currency !== values.currency) await restartPriceTracking([id], tx);
        // Moved to another developer or unpublished: its units leave that developer's Sales, and lose their holds.
        const leaves = before && projectLeavesSales({ developer: before.developerId, published: before.published }, { developer: developerId, published: values.published });
        return leaves ? releaseHoldsOutOfSales(tx, { typology: { projectId: id } }) : 0;
      });
    } else newId = (await db.project.create({ data: { ...values, ...relations } })).id;
  } catch (e) {
    return dbError(e, "slug", "هذا الرابط المختصر مستخدم لمشروع آخر");
  }
  published();
  if (newId) redirect(`/admin/projects/${newId}?created=1`);
  return savedReleasing(released);
}

export async function deleteProject(data: FormData) {
  await requireAdmin();
  const id = new FormReader(data).id("id");
  if (id) await db.project.delete({ where: { id } });
  published();
  redirect("/admin");
}

/** Marks the project's prices as confirmed today and records any change (called when unit types or plans change). */
async function touchPrices(projectId: string) {
  await db.project.update({ where: { id: projectId }, data: { pricesUpdatedAt: today() } });
  await recordPriceHistory([projectId]);
}

// ─── Unit types ─────────────────────────────────────────────────────────

export async function saveTypology(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const f = new FormReader(data);
  const id = f.id("id");
  const projectId = f.id("projectId");
  const values = readTypology(f);
  if (!f.ok || !projectId) return f.result();
  let released = 0;
  try {
    if (id) {
      released = await db.$transaction(async (tx) => {
        await tx.typology.update({ where: { id, projectId }, data: values });
        // A type without a starting price isn't sold in Sales: its units lose their holds.
        return values.priceFrom === null ? releaseHoldsOutOfSales(tx, { typologyId: id }) : 0;
      });
    } else await db.typology.create({ data: { ...values, projectId } });
  } catch (e) {
    return dbError(e, "code", "هذا الكود مستخدم لنموذج آخر في نفس المشروع");
  }
  await touchPrices(projectId);
  published();
  return id ? savedReleasing(released) : { ok: true, message: "تمت الإضافة ✓" };
}

// ─── Units ──────────────────────────────────────────────────────────────

export async function saveUnit(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const f = new FormReader(data);
  const id = f.id("id");
  const projectId = f.id("projectId");
  const typologyId = f.id("typologyId");
  const values = readUnit(f);
  if (!typologyId) f.errors.typologyId = "اختر النموذج";
  if (projectId && (await zoneOfProject(projectId, values.zoneId)) === false) f.errors.zoneId = "المنطقة دي مش في الماستر بلان بتاع المشروع";
  if (!f.ok || !projectId || !typologyId) return f.result();
  // The unit type must be one of this project's.
  const typology = await db.typology.findFirst({ where: { id: typologyId, projectId }, select: { id: true } });
  if (!typology) return { ok: false, message: "النموذج ده مش في المشروع", errors: { typologyId: "اختر النموذج" } };
  if (await findTwinUnit(projectId, values.building, values.unitNumber, id)) return { ok: false, message: "فيه وحدة بنفس الرقم في نفس المبنى", errors: { unitNumber: "الرقم ده مستخدم في نفس المبنى" } };
  let released = 0;
  if (id) {
    released = await db.$transaction(async (tx) => {
      await tx.unit.update({ where: { id, typology: { projectId } }, data: { ...values, typologyId } });
      // A unit that stops being available loses its Sales hold (spec section 6), and so does one
      // moved to a unit type without a starting price.
      return (
        (await releaseHoldsOfUnavailable(tx, [{ id, availability: values.availability }], "ADMIN_STATUS_CHANGE")) +
        (await releaseHoldsOutOfSales(tx, { id }))
      );
    });
  } else await db.unit.create({ data: { ...values, typologyId } });
  published();
  if (!id) return { ok: true, message: "تمت الإضافة ✓" };
  return released ? { ok: true, message: "تم الحفظ ✓ والحجز المؤقت على الوحدة اتلغى" } : SAVED;
}

/** Removes every unit of a project, e.g. before importing a fresh list from Excel. */
export async function deleteProjectUnits(data: FormData) {
  await requireAdmin();
  const projectId = new FormReader(data).id("id");
  if (!projectId) return;
  await db.unit.deleteMany({ where: { typology: { projectId } } });
  published();
}

// ─── Payment plans ──────────────────────────────────────────────────────

export async function savePaymentPlan(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const f = new FormReader(data);
  const id = f.id("id");
  const projectId = f.id("projectId");
  const { steps, ...plan } = readPaymentPlan(f);
  const values = { ...plan, typologyId: f.id("typologyId") };
  if (!f.ok || !projectId) return f.result();
  const rows = toStepRows(steps);
  // One statement: the plan and its steps change together.
  if (id) await db.paymentPlan.update({ where: { id, projectId }, data: { ...values, steps: { deleteMany: {}, createMany: { data: rows } } } });
  else await db.paymentPlan.create({ data: { ...values, projectId, steps: { createMany: { data: rows } } } });
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

/** Saves many uploaded files of one kind at once (from the "upload several files" box). */
export async function addMediaBatch(input: {
  projectId: string;
  kind: string;
  group: string | null;
  items: { url: string; width?: number; height?: number }[];
}): Promise<FormState> {
  await requireAdmin();
  const kind = (MEDIA_KINDS as readonly string[]).includes(input.kind) ? (input.kind as (typeof MEDIA_KINDS)[number]) : null;
  const group = kind === "IMAGE" && (PHOTO_GROUPS as readonly string[]).includes(input.group ?? "") ? (input.group as (typeof PHOTO_GROUPS)[number]) : null;
  if (!kind || (kind === "IMAGE" && !group)) return { ok: false, message: "اختر النوع والتبويب" };
  const items = input.items.filter((i) => typeof i.url === "string" && /^https:\/\/\S+$/.test(i.url) && i.url.length <= 2000).slice(0, 200);
  if (!items.length) return { ok: false, message: "لا توجد ملفات صالحة" };

  const project = await db.project.findUnique({ where: { id: input.projectId }, select: { id: true } });
  if (!project) return { ok: false, message: "المشروع غير موجود" };
  const last = await db.media.aggregate({ where: { projectId: project.id, kind }, _max: { sortOrder: true } });
  const start = (last._max.sortOrder ?? -1) + 1;
  const size = (n: unknown) => (typeof n === "number" && Number.isInteger(n) && n > 0 && n < 100000 ? n : null);

  await db.media.createMany({
    data: items.map((i, n) => ({
      projectId: project.id,
      kind,
      group,
      url: i.url,
      width: size(i.width),
      height: size(i.height),
      sortOrder: start + n,
    })),
  });
  published();
  return { ok: true, message: `تمت إضافة ${items.length} ملف ✓` };
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
  unit: (id: string, projectId: string) => db.unit.delete({ where: { id, typology: { projectId } } }),
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
  const removed = await PARTS[part as keyof typeof PARTS](id, projectId);
  if (part === "media" && "url" in removed) await deleteIfUnused([removed.url]);
  if (part === "typology" || part === "plan") await touchPrices(projectId);
  published();
}
