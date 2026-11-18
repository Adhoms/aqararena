"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/lib/db";
import { notifyAdmin } from "@/lib/email";
import { CATALOG_TAG } from "@/lib/catalog";
import { FormReader, type FormState } from "@/lib/admin/form";
import { readUnit } from "@/lib/admin/readers";
import { importProjectUnits, type UnitsImportResult } from "@/lib/admin/import/workbook";
import { requireAccount, type PortalAccount } from "@/lib/portal/session";
import { UNIT_AVAILABILITY } from "@/lib/property";
import { shouldNotify, unitPriceProblem } from "@/lib/unit-rules";
import { findTwinUnit } from "@/lib/units";
import { releaseHoldsOfUnavailable } from "@/lib/sales/hold-service";
import { HOURS_NOUN, countAr } from "@/lib/format";
import { readHoldHours } from "@/lib/sales/holds";

// A developer's own inventory. Unlike everything else in the portal, these changes go live at
// once (statuses change daily), within limits: only the project's approved unit types, and no
// unit priced under its type's published starting price. The admin hears about changes by
// email, at most once an hour per project.

async function ownProject(me: PortalAccount, projectId: string | null) {
  if (!projectId) return null;
  return db.project.findFirst({ where: { id: projectId, developerId: me.developerId }, select: { id: true, nameAr: true, unitsNotifiedAt: true } });
}

/** Refreshes the public pages and tells the admin (at most hourly per project). */
async function changed(me: PortalAccount, project: { id: string; nameAr: string; unitsNotifiedAt: Date | null }, what: string) {
  updateTag(CATALOG_TAG);
  if (!shouldNotify(project.unitsNotifiedAt)) return;
  await db.project.update({ where: { id: project.id }, data: { unitsNotifiedAt: new Date() } });
  after(() =>
    notifyAdmin(`تحديث مخزون: ${project.nameAr} · AqarArena`, [
      `${me.developer.nameAr} عدّل وحدات «${project.nameAr}»: ${what}`,
      "التعديلات دي بتوصل لفريق مبيعات الشركة في AqarArena Sales على طول. الإيميل ده بيوصل مرة واحدة في الساعة بالكتير لكل مشروع.",
      "",
      `راجع الوحدات: /admin/projects/${project.id}#units`,
    ]),
  );
}

export async function savePortalUnit(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireAccount();
  const f = new FormReader(data);
  const id = f.id("id");
  const project = await ownProject(me, f.id("projectId"));
  if (!project) return { ok: false, message: "المشروع ده مش من مشروعاتك" };
  const values = readUnit(f);
  const typologyId = f.id("typologyId");
  const type = typologyId ? await db.typology.findFirst({ where: { id: typologyId, projectId: project.id, priceFrom: { not: null } }, select: { id: true, priceFrom: true } }) : null;
  if (!type) f.errors.typologyId = "اختار نموذج من نماذج المشروع";
  const priceProblem = type ? unitPriceProblem(values.price, Number(type.priceFrom)) : null;
  if (priceProblem) f.errors.price = priceProblem;
  if (!f.ok || !type) return f.result();
  if (id && !(await db.unit.findFirst({ where: { id, typology: { projectId: project.id } }, select: { id: true } }))) {
    return { ok: false, message: "الوحدة دي مش في المشروع" };
  }
  if (await findTwinUnit(project.id, values.building, values.unitNumber, id)) {
    return { ok: false, message: "فيه وحدة بنفس الرقم في نفس المبنى", errors: { unitNumber: "الرقم ده مستخدم في نفس المبنى" } };
  }
  let released = 0;
  if (id) {
    released = await db.$transaction(async (tx) => {
      await tx.unit.update({ where: { id }, data: { ...values, typologyId: type.id } });
      // A unit that stops being available loses its Sales hold (spec section 6).
      return releaseHoldsOfUnavailable(tx, [{ id, availability: values.availability }], "PORTAL_STATUS_CHANGE");
    });
  } else await db.unit.create({ data: { ...values, typologyId: type.id } });
  await changed(me, project, id ? `تعديل الوحدة ${values.unitNumber}` : `إضافة الوحدة ${values.unitNumber}`);
  return { ok: true, message: id ? (released ? "اتحفظ ✓ والحجز المؤقت على الوحدة اتلغى" : "اتحفظ ✓") : "اتضافت ✓" };
}

/** The quick status switch in the units table. A unit taken off the market loses its Sales hold. */
export async function setPortalUnitStatus(unitId: string, status: string): Promise<{ ok: boolean; released?: boolean }> {
  const me = await requireAccount();
  if (!(UNIT_AVAILABILITY as readonly string[]).includes(status)) return { ok: false };
  const next = status as (typeof UNIT_AVAILABILITY)[number];
  const unit = await db.unit.findFirst({
    where: { id: unitId, typology: { project: { developerId: me.developerId } } },
    select: { id: true, unitNumber: true, typology: { select: { project: { select: { id: true, nameAr: true, unitsNotifiedAt: true } } } } },
  });
  if (!unit) return { ok: false };
  const released = await db.$transaction(async (tx) => {
    await tx.unit.update({ where: { id: unit.id }, data: { availability: next } });
    return releaseHoldsOfUnavailable(tx, [{ id: unit.id, availability: next }], "PORTAL_STATUS_CHANGE");
  });
  await changed(me, unit.typology.project, `تغيير حالة الوحدة ${unit.unitNumber ?? ""}`);
  return { ok: true, released: released > 0 };
}

export async function deletePortalUnit(data: FormData) {
  const me = await requireAccount();
  const f = new FormReader(data);
  const project = await ownProject(me, f.id("projectId"));
  const id = f.id("id");
  if (!project || !id) return;
  const gone = await db.unit.deleteMany({ where: { id, typology: { projectId: project.id } } });
  if (gone.count) await changed(me, project, "حذف وحدة");
  redirect(`/portal/projects/${project.id}/units`);
}

const EMPTY: UnitsImportResult = { ok: false, saved: false, message: "", problems: [], create: 0, update: 0 };

/** Checks an uploaded units sheet, and saves it when "import" was pressed. */
export async function importPortalUnits(_: UnitsImportResult | null, data: FormData): Promise<UnitsImportResult> {
  const me = await requireAccount();
  const project = await ownProject(me, String(data.get("projectId") ?? "") || null);
  if (!project) return { ...EMPTY, message: "المشروع ده مش من مشروعاتك" };
  const file = data.get("file");
  if (!(file instanceof File) || file.size === 0) return { ...EMPTY, message: "اختار ملف Excel الأول." };
  if (!/\.xlsx$/i.test(file.name)) return { ...EMPTY, message: "لازم الملف يكون بصيغة xlsx." };
  if (file.size > 4 * 1024 * 1024) return { ...EMPTY, message: "الملف أكبر من 4 ميجا." };
  const result = await importProjectUnits(await file.arrayBuffer(), project.id, data.get("mode") === "save");
  if (result.saved) await changed(me, project, `رفع ملف Excel: ${result.create} وحدة جديدة و${result.update} تحديث`);
  return result;
}

/** How long Sales holds last in this project (empty = the company's setting). Applies to new holds. */
export async function saveProjectHoldHours(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireAccount();
  const f = new FormReader(data);
  const project = await ownProject(me, f.id("projectId"));
  if (!project) return { ok: false, message: "المشروع ده مش من مشروعاتك" };
  const holdHours = readHoldHours(f, "holdHours");
  if (!f.ok) return f.result();
  await db.project.update({ where: { id: project.id }, data: { holdHours } });
  revalidatePath(`/portal/projects/${project.id}/units`);
  return { ok: true, message: holdHours ? `اتحفظ ✓ الحجز في المشروع ده ${countAr(holdHours, HOURS_NOUN)}` : "اتحفظ ✓ المشروع بياخد مدة الشركة" };
}
