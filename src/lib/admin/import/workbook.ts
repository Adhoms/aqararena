import "server-only";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { FormReader } from "@/lib/admin/form";
import { readDeveloper, readPaymentPlan, readProject, readTypology, readUnit, FEDDAN_M2 } from "@/lib/admin/readers";
import { formatSteps, stepsOf, toStepRows } from "@/lib/catalog/plan-steps";
import { recordPriceHistory } from "@/lib/price-history";
import { unitKey, unitPriceProblem } from "@/lib/unit-rules";
import { HOLDS_NOUN, countAr } from "@/lib/format";
import type { Prisma } from "@/generated/prisma/client";
import { liveHoldCount, lockUnits, releaseHoldsOfUnavailable, releaseHoldsOutOfSales } from "@/lib/sales/hold-service";
import { isBusy } from "@/lib/sales/hold-errors";
import type { AvailabilityValue } from "@/lib/sales/holds";
import { holdsLeavingWarning } from "@/lib/sales/labels";
import { leavingSales, nothingLeaves, type Leaving } from "./leaving";
import { CHOICES, SHEETS, headerMatches, norm, type Column, type SheetDef, type SheetKey } from "./columns";

// Builds the Excel template (optionally filled with what is already on the site) and imports
// a filled one. An import is all or nothing: every row is checked first, and nothing is saved
// while any row has a problem.

const MAX_ROWS = 2000;

/** When a save meets another change to the same units (a deadlock, or a transaction that timed out). */
const BUSY = "فيه تعديل تاني على نفس المشروع دلوقتي، ماحدش اتحفظ. جرّب تاني بعد شوية.";

/**
 * The units a save may take out of Sales: the units it updates (one may move to a type without a
 * price), and every unit of the projects and types `leaving` names. The save locks them (in id order)
 * before writing any unit, and releases their holds that no longer belong in Sales after.
 */
const scopeOfSave = (updateIds: string[], leaving: Leaving): Prisma.UnitWhereInput | null =>
  updateIds.length || leaving.projectIds.length || leaving.typeIds.length
    ? { OR: [{ id: { in: updateIds } }, { typology: { projectId: { in: leaving.projectIds } } }, { typologyId: { in: leaving.typeIds } }] }
    : null;

// ─── Matching names typed by people ─────────────────────────────────────

class Lookup<T> {
  private map = new Map<string, T>();
  add(item: T, ...names: (string | null | undefined)[]) {
    for (const n of names) if (n) this.map.set(norm(n), item);
  }
  get(name: string) {
    return this.map.get(norm(name));
  }
}

// ─── Reading cells ──────────────────────────────────────────────────────

type Raw = string | number | boolean | Date | null;

function rawValue(cell: ExcelJS.Cell): Raw {
  const v = cell.value as unknown;
  if (v === null || v === undefined) return null;
  if (v instanceof Date || typeof v === "string" || typeof v === "number" || typeof v === "boolean") return v;
  if (typeof v === "object") {
    const o = v as { richText?: { text: string }[]; text?: unknown; hyperlink?: string; result?: unknown; error?: string };
    if (o.richText) return o.richText.map((r) => r.text).join("");
    if (o.hyperlink) return typeof o.text === "string" && /^https?:/i.test(o.text) ? o.text : o.hyperlink;
    if ("result" in o) return (o.result as Raw) ?? null;
    if (typeof o.text === "string") return o.text;
  }
  return String(v);
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Excel stores days since 1899-12-30. */
const fromSerial = (n: number) => new Date(Math.round((n - 25569) * 86400 * 1000));

function dateText(v: Raw): string {
  if (v instanceof Date) {
    // A year typed into a date-formatted cell (e.g. 2029) arrives as day 2029 after 1899-12-30.
    const serial = Math.round(v.getTime() / 86400000 + 25569);
    if (serial >= 1900 && serial <= 2100) return `${serial}-12-31`;
    return iso(v);
  }
  if (typeof v === "number") {
    if (Number.isInteger(v) && v >= 1900 && v <= 2100) return `${v}-12-31`;
    if (v > 20000 && v < 80000) return iso(fromSerial(v));
    return String(v);
  }
  const s = String(v ?? "").trim().replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
  if (/^\d{4}$/.test(s)) return `${s}-12-31`;
  const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  const ymd = s.match(/^(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, "0")}-${ymd[3].padStart(2, "0")}`;
  return s;
}

const YES = new Set(["نعم", "ايوه", "اه", "صح", "yes", "y", "true", "1", "✓", "x"]);
const NO = new Set(["لا", "no", "n", "false", "0", ""]);

type Problem = { sheet: string; row: number; column: string; message: string };

/** One row of a sheet, turned into the FormData that the shared readers expect. */
function rowToForm(def: SheetDef, cells: Map<string, ExcelJS.Cell>, problem: (column: string, message: string) => void) {
  const data = new FormData();
  const refs: Record<string, string> = {};
  for (const col of def.columns) {
    const cell = cells.get(col.key);
    if (!cell) continue;
    const v = rawValue(cell);
    const text = v instanceof Date ? iso(v) : String(v ?? "").trim();
    switch (col.type) {
      case "ref":
        refs[col.key] = text;
        break;
      case "date":
        if (v !== null && text) data.set(col.key, dateText(v));
        break;
      case "number":
        // A cell formatted as a percentage holds 0.1 for "10%".
        if (typeof v === "number" && cell.numFmt?.includes("%")) data.set(col.key, String(Math.round(v * 10000) / 100));
        else data.set(col.key, typeof v === "number" ? String(v) : text);
        break;
      case "bool": {
        const t = norm(String(v === true ? "yes" : v === false ? "no" : text));
        if (YES.has(t)) data.set(col.key, "on");
        else if (!NO.has(t)) problem(col.header, `اكتب «نعم» أو «لا»`);
        break;
      }
      case "choice":
      case "choices": {
        const parts = col.type === "choices" ? text.split(/[,،؛;\n]+/) : [text];
        for (const part of parts.map((p) => p.trim()).filter(Boolean)) {
          const hit = col.choices!.find((c) => norm(c.label) === norm(part) || c.value.toLowerCase() === part.toLowerCase());
          if (hit) data.append(col.key, hit.value);
          else problem(col.header, `«${part}» مش من القائمة`);
        }
        break;
      }
      case "url":
        // People write "www.example.com" or "example.com"; links need the https:// part.
        if (text) data.set(col.key, /^[\w-]+(\.[\w-]+)+(\/\S*)?$/i.test(text) ? `https://${text}` : text);
        break;
      default:
        if (text) data.set(col.key, text);
    }
  }
  return { data, refs };
}

type SheetRows = { def: SheetDef; present: Set<string>; rows: { row: number; cells: Map<string, ExcelJS.Cell> }[] };

function readSheet(wb: ExcelJS.Workbook, def: SheetDef, problems: Problem[]): SheetRows {
  const ws = wb.getWorksheet(def.name);
  const out: SheetRows = { def, present: new Set(), rows: [] };
  if (!ws) return out;

  // Match header cells to columns by their text (the "*" for required columns is optional).
  const byColumn = new Map<number, Column>();
  ws.getRow(1).eachCell((cell, n) => {
    const col = def.columns.find((c) => headerMatches(c, String(rawValue(cell) ?? "")));
    if (col) {
      byColumn.set(n, col);
      out.present.add(col.key);
    }
  });
  for (const col of def.columns) {
    if (col.required && !out.present.has(col.key)) problems.push({ sheet: def.name, row: 1, column: col.header, message: "العمود ده ناقص من الشيت" });
  }

  ws.eachRow({ includeEmpty: false }, (row, n) => {
    if (n === 1) return;
    const cells = new Map<string, ExcelJS.Cell>();
    let filled = false;
    byColumn.forEach((col, i) => {
      const cell = row.getCell(i);
      cells.set(col.key, cell);
      if (String(rawValue(cell) ?? "").trim()) filled = true;
    });
    if (filled) out.rows.push({ row: n, cells });
  });
  if (out.rows.length > MAX_ROWS) {
    problems.push({ sheet: def.name, row: 0, column: "", message: `أكثر من ${MAX_ROWS} صف. قسّم الملف على أكثر من مرة.` });
    out.rows = out.rows.slice(0, MAX_ROWS);
  }
  return out;
}

/** Keeps only the fields whose column is in the sheet, so a removed column never wipes data. */
function onlyPresent<T extends Record<string, unknown>>(values: T, present: Set<string>, always: string[] = []): Partial<T> {
  const source: Record<string, string> = { landAreaM2: "landFeddan", pricePerM2From: "priceFrom" };
  return Object.fromEntries(Object.entries(values).filter(([k]) => always.includes(k) || present.has(source[k] ?? k))) as Partial<T>;
}

// ─── Import ─────────────────────────────────────────────────────────────

export type ImportResult = {
  ok: boolean;
  saved: boolean;
  message: string;
  problems: Problem[];
  counts: Record<SheetKey, { create: number; update: number }>;
  /** Something to read before importing (shown apart from the success message). */
  warning?: string;
};

export async function importWorkbook(buffer: ArrayBuffer, save: boolean): Promise<ImportResult> {
  const problems: Problem[] = [];
  const counts: ImportResult["counts"] = {
    developers: { create: 0, update: 0 },
    projects: { create: 0, update: 0 },
    typologies: { create: 0, update: 0 },
    plans: { create: 0, update: 0 },
    units: { create: 0, update: 0 },
  };
  const fail = (message: string): ImportResult => ({ ok: false, saved: false, message, problems, counts });

  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    return fail("الملف مش Excel صالح (لازم يكون ‎.xlsx). لو الملف ‎.xls أو ‎.csv افتحه في Excel واحفظه بصيغة ‎.xlsx.");
  }
  const sheets = Object.fromEntries(SHEETS.map((d) => [d.key, readSheet(wb, d, problems)])) as Record<SheetKey, SheetRows>;
  if (SHEETS.every((d) => sheets[d.key].rows.length === 0)) return fail("الملف فاضي: مالقيناش صفوف في شيتات المطورين أو المشروعات أو النماذج أو أنظمة السداد أو الوحدات.");

  // What is already on the site.
  const [developers, areas, projects, typologies, plans, units] = await Promise.all([
    db.developer.findMany({ select: { id: true, slug: true, nameAr: true, nameEn: true } }),
    db.area.findMany({ select: { id: true, slug: true, nameAr: true, nameEn: true } }),
    db.project.findMany({ select: { id: true, slug: true, nameAr: true, nameEn: true, published: true, developer: { select: { slug: true } } } }),
    db.typology.findMany({ select: { id: true, code: true, projectId: true } }),
    db.paymentPlan.findMany({ select: { projectId: true, typologyId: true, downPaymentPct: true, years: true, frequency: true } }),
    db.unit.findMany({ select: { id: true, building: true, unitNumber: true, typology: { select: { projectId: true } } } }),
  ]);
  // How a unit is recognised: same project, building and unit number.
  const unitKey = (project: string, building: string | null, number: string) => `${project}|${norm(building ?? "")}|${norm(number)}`;
  const unitIdByKey = new Map(units.filter((u) => u.unitNumber).map((u) => [unitKey(u.typology.projectId, u.building, u.unitNumber!), u.id]));
  // How a plan is recognised: same project, unit type, down payment, years and frequency.
  const planKey = (projectId: string, typologyId: string | null, down: number, years: number, frequency: string) =>
    `${projectId}|${typologyId ?? ""}|${down}|${years}|${frequency}`;
  const existingPlans = new Set(plans.map((p) => planKey(p.projectId, p.typologyId, Number(p.downPaymentPct), p.years, p.frequency)));
  const typIdByCode = new Map(typologies.map((t) => [`${t.projectId}/${t.code.toLowerCase()}`, t.id]));

  // A developer or project is identified by its slug; rows in the file win over the site.
  type DevRef = { slug: string };
  type ProjRef = { slug: string; codes: Set<string>; existingId?: string };
  const devs = new Lookup<DevRef>();
  for (const d of developers) devs.add({ slug: d.slug }, d.nameAr, d.nameEn, d.slug);
  const areaLookup = new Lookup<string>();
  for (const a of areas) areaLookup.add(a.id, a.nameAr, a.nameEn, a.slug);
  const projs = new Lookup<ProjRef>();
  const projBySlug = new Map<string, ProjRef>();
  for (const p of projects) {
    const ref: ProjRef = { slug: p.slug, existingId: p.id, codes: new Set(typologies.filter((t) => t.projectId === p.id).map((t) => t.code.toLowerCase())) };
    projBySlug.set(p.slug, ref);
    projs.add(ref, p.nameAr, p.nameEn, p.slug);
  }
  const existingDevSlugs = new Set(developers.map((d) => d.slug));

  function check<T>(def: SheetDef, row: number, data: FormData, read: (f: FormReader) => T) {
    const f = new FormReader(data);
    const values = read(f);
    // A missing English name already explains the missing slug.
    if (f.errors.nameEn) delete f.errors.slug;
    for (const [key, message] of Object.entries(f.errors)) {
      const column = def.columns.find((c) => c.key === key)?.header ?? key;
      // One message per cell: keep the more specific one found while reading the cell.
      if (problems.some((p) => p.sheet === def.name && p.row === row && p.column === column)) continue;
      problems.push({ sheet: def.name, row, column, message });
    }
    return values;
  }

  // Developers
  const devRows: { slug: string; values: ReturnType<typeof readDeveloper>; present: Set<string> }[] = [];
  {
    const { def, rows, present } = sheets.developers;
    const seen = new Set<string>();
    for (const { row, cells } of rows) {
      const { data } = rowToForm(def, cells, (column, message) => problems.push({ sheet: def.name, row, column, message }));
      const values = check(def, row, data, readDeveloper);
      if (!values.slug) continue;
      if (seen.has(values.slug)) problems.push({ sheet: def.name, row, column: "الاسم بالإنجليزية", message: "المطور ده متكرر في الشيت" });
      seen.add(values.slug);
      devRows.push({ slug: values.slug, values, present });
      devs.add({ slug: values.slug }, values.nameAr, values.nameEn, values.slug);
      counts.developers[existingDevSlugs.has(values.slug) ? "update" : "create"]++;
    }
  }

  // Projects
  const projRows: { slug: string; devSlug: string; areaId: string; values: ReturnType<typeof readProject>; present: Set<string> }[] = [];
  {
    const { def, rows, present } = sheets.projects;
    const seen = new Set<string>();
    for (const { row, cells } of rows) {
      const say = (column: string, message: string) => problems.push({ sheet: def.name, row, column, message });
      const { data, refs } = rowToForm(def, cells, say);
      const values = check(def, row, data, readProject);
      const dev = refs.developer ? devs.get(refs.developer) : undefined;
      if (!refs.developer) say("المطور", "هذا الحقل مطلوب");
      else if (!dev) say("المطور", `مالقيناش مطور اسمه «${refs.developer}». ضيفه في شيت المطورين`);
      const areaId = refs.area ? areaLookup.get(refs.area) : undefined;
      if (!refs.area) say("المنطقة", "هذا الحقل مطلوب");
      else if (!areaId) say("المنطقة", `مالقيناش منطقة اسمها «${refs.area}». اختار من القائمة أو ضيفها من لوحة التحكم`);
      if (!values.slug) continue;
      if (seen.has(values.slug)) say("اسم المشروع بالإنجليزية", "المشروع ده متكرر في الشيت");
      seen.add(values.slug);
      const ref: ProjRef = projBySlug.get(values.slug) ?? { slug: values.slug, codes: new Set() };
      projBySlug.set(values.slug, ref);
      projs.add(ref, values.nameAr, values.nameEn, values.slug);
      counts.projects[ref.existingId ? "update" : "create"]++;
      if (dev && areaId) projRows.push({ slug: values.slug, devSlug: dev.slug, areaId, values, present });
    }
  }

  // Unit types
  const typRows: { projSlug: string; values: ReturnType<typeof readTypology>; present: Set<string> }[] = [];
  {
    const { def, rows, present } = sheets.typologies;
    const seen = new Set<string>();
    for (const { row, cells } of rows) {
      const say = (column: string, message: string) => problems.push({ sheet: def.name, row, column, message });
      const { data, refs } = rowToForm(def, cells, say);
      const values = check(def, row, data, readTypology);
      const proj = refs.project ? projs.get(refs.project) : undefined;
      if (!refs.project) say("المشروع", "هذا الحقل مطلوب");
      else if (!proj) say("المشروع", `مالقيناش مشروع اسمه «${refs.project}». ضيفه في شيت المشروعات`);
      if (!proj || !values.code) continue;
      const key = `${proj.slug}/${values.code.toLowerCase()}`;
      if (seen.has(key)) say("الكود", "الكود ده متكرر لنفس المشروع في الشيت");
      seen.add(key);
      counts.typologies[proj.codes.has(values.code.toLowerCase()) ? "update" : "create"]++;
      proj.codes.add(values.code.toLowerCase());
      typRows.push({ projSlug: proj.slug, values, present });
    }
  }

  // Payment plans
  const planRows: { projSlug: string; code: string | null; values: ReturnType<typeof readPaymentPlan>; stepsPresent: boolean }[] = [];
  {
    const { def, rows, present } = sheets.plans;
    for (const { row, cells } of rows) {
      const say = (column: string, message: string) => problems.push({ sheet: def.name, row, column, message });
      const { data, refs } = rowToForm(def, cells, say);
      // A blank "active" cell means active.
      if (!present.has("isActive") || !String(rawValue(cells.get("isActive")!) ?? "").trim()) data.set("isActive", "on");
      const values = check(def, row, data, readPaymentPlan);
      const proj = refs.project ? projs.get(refs.project) : undefined;
      if (!refs.project) say("المشروع", "هذا الحقل مطلوب");
      else if (!proj) say("المشروع", `مالقيناش مشروع اسمه «${refs.project}». ضيفه في شيت المشروعات`);
      const code = refs.typology || null;
      if (proj && code && !proj.codes.has(code.toLowerCase())) say("كود النموذج", `مالقيناش نموذج بالكود «${code}» في المشروع ده`);
      if (!proj) continue;
      planRows.push({ projSlug: proj.slug, code, values, stepsPresent: present.has("steps") });
      const typologyId = code && proj.existingId ? (typIdByCode.get(`${proj.existingId}/${code.toLowerCase()}`) ?? "new") : null;
      const known = proj.existingId && typologyId !== "new" && existingPlans.has(planKey(proj.existingId, typologyId, values.downPaymentPct, values.years, values.frequency));
      counts.plans[known ? "update" : "create"]++;
    }
  }

  // Units
  const unitRows: { projSlug: string; code: string; values: ReturnType<typeof readUnit>; present: Set<string> }[] = [];
  // Existing units and the status the sheet gives them (one taken off the market loses its Sales hold).
  const unitStatuses: { existingId?: string; availability: AvailabilityValue }[] = [];
  {
    const { def, rows, present } = sheets.units;
    const seen = new Set<string>();
    for (const { row, cells } of rows) {
      const say = (column: string, message: string) => problems.push({ sheet: def.name, row, column, message });
      const { data, refs } = rowToForm(def, cells, say);
      // A blank status means available; the ground floor may be written as a word.
      if (!data.get("availability")) data.set("availability", "AVAILABLE");
      if (["ارضي", "الارضي", "ground", "g"].includes(norm(String(data.get("floor") ?? "")))) data.set("floor", "0");
      const values = check(def, row, data, readUnit);
      const proj = refs.project ? projs.get(refs.project) : undefined;
      if (!refs.project) say("المشروع", "هذا الحقل مطلوب");
      else if (!proj) say("المشروع", `مالقيناش مشروع اسمه «${refs.project}». ضيفه في شيت المشروعات`);
      const code = refs.typology;
      if (!code) say("كود النموذج", "هذا الحقل مطلوب");
      else if (proj && !proj.codes.has(code.toLowerCase())) say("كود النموذج", `مالقيناش نموذج بالكود «${code}» في المشروع ده`);
      if (!proj || !code || !values.unitNumber) continue;
      const key = unitKey(proj.slug, values.building, values.unitNumber);
      if (seen.has(key)) say("رقم الوحدة", "الوحدة دي متكررة في الشيت (نفس المشروع والمبنى والرقم)");
      seen.add(key);
      const knownId = proj.existingId ? unitIdByKey.get(unitKey(proj.existingId, values.building, values.unitNumber)) : undefined;
      const known = Boolean(knownId);
      unitStatuses.push({ existingId: knownId, availability: values.availability });
      counts.units[known ? "update" : "create"]++;
      unitRows.push({ projSlug: proj.slug, code, values, present });
    }
  }

  const summary = (lead: string) => {
    const parts: string[] = [];
    const add = (n: number, word: string) => n > 0 && parts.push(`${n} ${word}`);
    add(counts.developers.create + counts.developers.update, "مطور");
    add(counts.projects.create + counts.projects.update, "مشروع");
    add(counts.typologies.create + counts.typologies.update, "نموذج");
    add(counts.plans.create + counts.plans.update, "نظام سداد");
    add(counts.units.create + counts.units.update, "وحدة");
    return lead + parts.join("، ");
  };

  if (problems.length) return fail(`فيه ${problems.length} مشكلة لازم تتصلّح قبل الاستيراد. ماحدش اتحفظ.`);
  // What saving takes out of Sales: projects moved to another developer or unpublished, unit types
  // left without a price, units taken off the market. Their live holds are released.
  const before = new Map(projects.map((p) => [p.slug, { id: p.id, developer: p.developer.slug, published: p.published }]));
  const leaving = leavingSales({
    projects: projRows.map((p) => ({ before: before.get(p.slug), developer: p.devSlug, published: p.present.has("published") ? p.values.published : undefined })),
    types: typRows.map((t) => {
      const projectId = projBySlug.get(t.projSlug)?.existingId;
      return { existingId: projectId && typIdByCode.get(`${projectId}/${t.values.code.toLowerCase()}`), priceFrom: t.values.priceFrom };
    }),
    units: unitStatuses,
  });
  if (!save) {
    const warning = holdsLeavingWarning(await heldLeaving(leaving));
    return { ok: true, saved: false, message: summary("الملف سليم وجاهز: "), problems, counts, warning };
  }
  const scope = scopeOfSave(unitStatuses.flatMap((u) => (u.existingId ? [u.existingId] : [])), leaving);

  // Save everything in one transaction: all rows or none.
  let released: number;
  try {
    released = await db.$transaction(
      async (tx) => {
        const devId = new Map(developers.map((d) => [d.slug, d.id]));
        for (const d of devRows) {
          const data = onlyPresent(d.values, d.present, ["nameAr", "nameEn", "slug"]);
          const saved = await tx.developer.upsert({ where: { slug: d.slug }, create: d.values, update: data, select: { id: true } });
          devId.set(d.slug, saved.id);
        }

        const projId = new Map(projects.map((p) => [p.slug, p.id]));
        for (const p of projRows) {
          // The price date is set below from the unit types and plans, never from the sheet.
          const values: Omit<typeof p.values, "pricesUpdatedAt"> & { pricesUpdatedAt?: Date | null } = { ...p.values };
          delete values.pricesUpdatedAt;
          const relations = { developer: { connect: { id: devId.get(p.devSlug)! } }, area: { connect: { id: p.areaId } } };
          const update = onlyPresent(values, p.present, ["nameAr", "nameEn", "slug", "status", "deliveryDate"]);
          const saved = await tx.project.upsert({
            where: { slug: p.slug },
            create: { ...values, ...relations },
            update: { ...update, ...relations },
            select: { id: true },
          });
          projId.set(p.slug, saved.id);
        }

        const typId = new Map(typIdByCode);
        const touched = new Set<string>();
        for (const t of typRows) {
          const projectId = projId.get(t.projSlug)!;
          const update = onlyPresent(t.values, t.present, ["code", "category", "subType", "finishing", "buaM2", "priceFrom", "pricePerM2From"]);
          const saved = await tx.typology.upsert({
            where: { projectId_code: { projectId, code: t.values.code } },
            create: { ...t.values, projectId },
            update,
            select: { id: true },
          });
          typId.set(`${projectId}/${t.values.code.toLowerCase()}`, saved.id);
          touched.add(projectId);
        }

        for (const p of planRows) {
          const projectId = projId.get(p.projSlug)!;
          const typologyId = p.code ? typId.get(`${projectId}/${p.code.toLowerCase()}`) ?? null : null;
          const { steps, ...plan } = p.values;
          const values = { ...plan, typologyId };
          const rows = toStepRows(steps);
          // The same plan (down payment, years, frequency, unit type) is updated rather than duplicated.
          // Its steps change only when the sheet has the column, so an old template never wipes them.
          const same = await tx.paymentPlan.findFirst({
            where: { projectId, typologyId, downPaymentPct: values.downPaymentPct, years: values.years, frequency: values.frequency },
            select: { id: true },
          });
          if (same) await tx.paymentPlan.update({ where: { id: same.id }, data: { ...values, ...(p.stepsPresent && { steps: { deleteMany: {}, create: rows } }) } });
          else await tx.paymentPlan.create({ data: { ...values, projectId, steps: { create: rows } } });
          touched.add(projectId);
        }

        const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
        if (touched.size) await tx.project.updateMany({ where: { id: { in: [...touched] } }, data: { pricesUpdatedAt: today } });
        await recordPriceHistory([...touched], tx);

        // Lock the units this save may take out of Sales before writing any unit, in id order, as every
        // other write that changes many units does (after the project and type rows, as they do too).
        if (scope) await lockUnits(tx, scope);
        const offMarket: { id: string; availability: AvailabilityValue }[] = [];
        for (const u of unitRows) {
          const projectId = projId.get(u.projSlug)!;
          const typologyId = typId.get(`${projectId}/${u.code.toLowerCase()}`)!;
          const existing = unitIdByKey.get(unitKey(projectId, u.values.building, u.values.unitNumber));
          if (existing) await tx.unit.update({ where: { id: existing }, data: { ...onlyPresent(u.values, u.present, ["unitNumber", "availability"]), typologyId } });
          else await tx.unit.create({ data: { ...u.values, typologyId } });
          if (existing && u.values.availability !== "AVAILABLE") offMarket.push({ id: existing, availability: u.values.availability });
        }
        // Units taken off the market lose their Sales holds (spec section 6), and so do units that left
        // their developer's Sales inventory (all of them already locked above).
        return (await releaseHoldsOfUnavailable(tx, offMarket, "ADMIN_STATUS_CHANGE")) + (scope ? await releaseHoldsOutOfSales(tx, scope) : 0);
      },
      { timeout: 120_000, maxWait: 20_000 },
    );
  } catch (e) {
    if (isBusy(e)) return fail(BUSY);
    throw e;
  }

  return { ok: true, saved: true, message: summary("تم الاستيراد ✓ ") + (released ? ` · اتلغى ${countAr(released, HOLDS_NOUN)} في AqarArena Sales` : ""), problems, counts };
}

/** How many of the units an import takes out of Sales have a live hold. */
function heldLeaving(l: Leaving) {
  if (nothingLeaves(l)) return Promise.resolve(0);
  return liveHoldCount({ OR: [{ id: { in: l.unitIds } }, { typology: { projectId: { in: l.projectIds } } }, { typologyId: { in: l.typeIds } }] });
}

// ─── Template ───────────────────────────────────────────────────────────

const label = (list: { value: string; label: string }[], value: string | null | undefined) => list.find((c) => c.value === value)?.label ?? value ?? "";
const yesNo = (b: boolean) => (b ? "نعم" : "لا");
const num = (v: { toString(): string } | null | undefined) => (v === null || v === undefined ? null : Number(v.toString()));

/** The template workbook. With `withData`, every sheet is filled with what is on the site now. */
export async function buildTemplate(withData: boolean): Promise<ArrayBuffer> {
  const areas = await db.area.findMany({ select: { nameAr: true }, orderBy: { nameAr: "asc" } });
  const devNames = await db.developer.findMany({ select: { nameEn: true }, orderBy: { nameEn: "asc" } });

  const wb = new ExcelJS.Workbook();
  wb.creator = "AqarArena";
  wb.created = new Date();

  // Instructions first, so it is what opens.
  const help = wb.addWorksheet("تعليمات", { views: [{ rightToLeft: true }] });
  help.columns = [{ width: 28 }, { width: 90 }];
  const lines: [string, string][] = [
    ["استيراد بيانات AqarArena", ""],
    ["", ""],
    ["الخطوات", "1) املا الشيتات بالترتيب: المطورين ← المشروعات ← النماذج ← أنظمة السداد ← الوحدات (اختياري)."],
    ["", "2) الأعمدة اللي فيها * لازم تتملي. الباقي اختياري."],
    ["", "3) الخانات اللي فيها قائمة اختار منها، أو اكتب نفس الكلمة بالظبط."],
    ["", "4) ارفع الملف من لوحة التحكم ← استيراد Excel، واضغط «افحص الملف» الأول."],
    ["", "5) لو فيه أخطاء هتظهرلك برقم الصف والعمود، ومش هيتحفظ أي حاجة لحد ما تتصلّح كلها."],
    ["", ""],
    ["الربط بين الشيتات", "المشروع بيتربط بالمطور بالاسم، والنموذج ونظام السداد بيتربطوا بالمشروع بالاسم."],
    ["", "لو المطور أو المشروع موجود على الموقع بنفس الاسم أو الرابط المختصر، بياناته بتتحدّث بدل ما يتكرر."],
    ["", "العمود اللي تمسحه من الشيت مابيمسحش البيانات الموجودة."],
    ["", "نظام السداد بيتحدّث لو ليه نفس المقدم وعدد السنين ونوع الأقساط والنموذج."],
    ["", "الوحدة بتتحدّث لو ليها نفس الرقم والمبنى في نفس المشروع. لتغيير حالة وحدات (متاحة / محجوزة / مباعة) عدّل العمود وارفع الملف تاني."],
    ["", ""],
    ["الصور", "الصور والبروشورات بترفعها من صفحة المشروع في لوحة التحكم (رفع عدة ملفات مرة واحدة)."],
    ["", ""],
  ];
  for (const s of SHEETS) {
    lines.push([s.name, ""]);
    for (const c of s.columns) lines.push([`   ${c.header}${c.required ? " *" : ""}`, c.help ?? ""]);
    lines.push(["", ""]);
  }
  lines.forEach((l) => help.addRow(l));
  help.getRow(1).font = { bold: true, size: 16 };
  help.getColumn(1).font = { bold: true };
  help.getColumn(2).alignment = { wrapText: true, vertical: "top" };

  // Lists behind the dropdowns.
  const lists = wb.addWorksheet("القوائم", { views: [{ rightToLeft: true }] });
  const listCols: { title: string; values: string[] }[] = [
    { title: "الحالة", values: CHOICES.status.map((c) => c.label) },
    { title: "النوع", values: CHOICES.subTypes.map((c) => c.label) },
    { title: "الفئة", values: CHOICES.categories.map((c) => c.label) },
    { title: "التشطيب", values: CHOICES.finishing.map((c) => c.label) },
    { title: "الأقساط", values: CHOICES.frequency.map((c) => c.label) },
    { title: "نعم / لا", values: ["نعم", "لا"] },
    { title: "المناطق", values: areas.map((a) => a.nameAr) },
    { title: "الخدمات", values: CHOICES.amenities.map((c) => c.label) },
    { title: "المطورين على الموقع", values: devNames.map((d) => d.nameEn) },
    { title: "حالة الوحدة", values: CHOICES.availability.map((c) => c.label) },
    { title: "الإطلالة", values: CHOICES.unitViews.map((c) => c.label) },
    { title: "الاتجاه", values: CHOICES.orientations.map((c) => c.label) },
    { title: "العملة", values: CHOICES.currency.map((c) => c.label) },
  ];
  const listRange = new Map<string, string>();
  listCols.forEach((l, i) => {
    const letter = String.fromCharCode(65 + i);
    lists.getCell(`${letter}1`).value = l.title;
    lists.getCell(`${letter}1`).font = { bold: true };
    l.values.forEach((v, j) => (lists.getCell(`${letter}${j + 2}`).value = v));
    lists.getColumn(i + 1).width = 26;
    listRange.set(l.title, `'القوائم'!$${letter}$2:$${letter}$${Math.max(2, l.values.length + 1)}`);
  });
  const listFor = (col: Column): { range: string; strict: boolean } | null => {
    if (col.type === "bool") return { range: listRange.get("نعم / لا")!, strict: true };
    if (col.key === "area") return { range: listRange.get("المناطق")!, strict: true };
    if (col.key === "developer") return { range: listRange.get("المطورين على الموقع")!, strict: false };
    if (col.type !== "choice") return null;
    const title = {
      status: "الحالة",
      subType: "النوع",
      category: "الفئة",
      finishing: "التشطيب",
      frequency: "الأقساط",
      availability: "حالة الوحدة",
      view: "الإطلالة",
      orientation: "الاتجاه",
      currency: "العملة",
    }[col.key];
    return title ? { range: listRange.get(title)!, strict: true } : null;
  };

  const data = withData ? await currentData() : null;

  for (const def of SHEETS) {
    const ws = wb.addWorksheet(def.name, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
    ws.columns = def.columns.map((c) => ({ header: c.header + (c.required ? " *" : ""), key: c.key, width: c.width ?? 16 }));
    const head = ws.getRow(1);
    head.font = { bold: true, color: { argb: "FFFFFFFF" } };
    head.height = 22;
    def.columns.forEach((c, i) => {
      const cell = head.getCell(i + 1);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: c.required ? "FF1F5C4A" : "FF5B6B66" } };
      cell.alignment = { vertical: "middle" };
      if (c.help) cell.note = c.help;
      if (c.type === "date") ws.getColumn(i + 1).numFmt = "dd/mm/yyyy";
      // Text, so Excel doesn't read a typed "0:100" as a time of day.
      if (c.key === "steps") ws.getColumn(i + 1).numFmt = "@";
      if (c.type === "number" && /price|Fee|bookingFee/i.test(c.key)) ws.getColumn(i + 1).numFmt = "#,##0";
      const list = listFor(c);
      if (list) {
        // exceljs supports range validations at runtime; its types only describe per-cell ones.
        (ws as unknown as { dataValidations: { add(range: string, v: ExcelJS.DataValidation): void } }).dataValidations.add(
          `${ws.getColumn(i + 1).letter}2:${ws.getColumn(i + 1).letter}${MAX_ROWS + 1}`,
          {
            type: "list",
            allowBlank: true,
            formulae: [list.range],
            showErrorMessage: list.strict,
            errorStyle: "stop",
            errorTitle: "قيمة غير معروفة",
            error: "اختار من القائمة",
          },
        );
      }
    });
    for (const row of data?.[def.key] ?? []) ws.addRow(row);
  }

  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

/** Everything on the site, as template rows keyed by column key. */
async function currentData(): Promise<Record<SheetKey, Record<string, unknown>[]>> {
  const [developers, projects] = await Promise.all([
    db.developer.findMany({ orderBy: { nameEn: "asc" } }),
    db.project.findMany({
      orderBy: { nameEn: "asc" },
      include: {
        developer: { select: { nameEn: true } },
        area: { select: { nameAr: true } },
        typologies: {
          orderBy: { code: "asc" },
          include: { units: { orderBy: [{ building: "asc" }, { floor: "asc" }, { unitNumber: "asc" }] } },
        },
        paymentPlans: { orderBy: { createdAt: "asc" }, include: { typology: { select: { code: true } }, steps: { orderBy: { sortOrder: "asc" } } } },
      },
    }),
  ]);
  const date = (d: Date | null) => (d ? new Date(d.toISOString().slice(0, 10) + "T00:00:00Z") : null);
  const many = (list: { value: string; label: string }[], values: string[]) => values.map((v) => label(list, v)).join("، ");

  return {
    developers: developers.map((d) => ({ ...d, verified: yesNo(d.verified) })),
    projects: projects.map((p) => ({
      developer: p.developer.nameEn,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      slug: p.slug,
      area: p.area.nameAr,
      districtAr: p.districtAr,
      districtEn: p.districtEn,
      status: label(CHOICES.status, p.status),
      deliveryDate: date(p.deliveryDate),
      launchDate: date(p.launchDate),
      categories: many(CHOICES.categories, p.categories),
      bookingFee: num(p.bookingFee),
      currency: label(CHOICES.currency, p.currency),
      landFeddan: p.landAreaM2 ? Math.round((Number(p.landAreaM2) / FEDDAN_M2) * 100) / 100 : null,
      footprintPct: num(p.footprintPct),
      unitsCount: p.unitsCount,
      progressPct: p.progressPct,
      latitude: num(p.latitude),
      longitude: num(p.longitude),
      amenities: many(CHOICES.amenities, p.amenities),
      descriptionAr: p.descriptionAr,
      descriptionEn: p.descriptionEn,
      masterPlanUrl: p.masterPlanUrl,
      published: yesNo(p.published),
      isFeatured: yesNo(p.isFeatured),
    })),
    typologies: projects.flatMap((p) =>
      p.typologies.map((t) => ({
        project: p.nameEn,
        code: t.code,
        subType: label(CHOICES.subTypes, t.subType),
        category: label(CHOICES.categories, t.category),
        finishing: label(CHOICES.finishing, t.finishing),
        buaM2: num(t.buaM2),
        priceFrom: num(t.priceFrom),
        bedrooms: t.bedrooms,
        bathrooms: t.bathrooms,
        gardenM2: num(t.gardenM2),
        roofM2: num(t.roofM2),
        nameAr: t.nameAr,
        nameEn: t.nameEn,
      })),
    ),
    plans: projects.flatMap((p) =>
      p.paymentPlans.map((pl) => ({
        project: p.nameEn,
        typology: pl.typology?.code ?? null,
        downPaymentPct: num(pl.downPaymentPct),
        years: pl.years,
        frequency: label(CHOICES.frequency, pl.frequency),
        steps: pl.steps.length ? formatSteps(stepsOf(pl.steps)) : null,
        deliveryPaymentPct: num(pl.deliveryPaymentPct),
        cashDiscountPct: num(pl.cashDiscountPct),
        maintenancePct: num(pl.maintenancePct),
        garageFee: num(pl.garageFee),
        clubFee: num(pl.clubFee),
        validUntil: date(pl.validUntil),
        nameAr: pl.nameAr,
        nameEn: pl.nameEn,
        isActive: yesNo(pl.isActive),
      })),
    ),
    units: projects.flatMap((p) =>
      p.typologies.flatMap((t) =>
        t.units.map((u) => ({
          project: p.nameEn,
          typology: t.code,
          unitNumber: u.unitNumber,
          building: u.building,
          floor: u.floor,
          availability: label(CHOICES.availability, u.availability),
          price: num(u.price),
          view: label(CHOICES.unitViews, u.view),
          orientation: label(CHOICES.orientations, u.orientation),
        })),
      ),
    ),
  };
}


// ─── One project's units (developer portal) ─────────────────────────────

/** The units sheet without the project column: in the portal the project is already chosen. */
const projectUnitsDef = (): SheetDef => {
  const def = SHEETS.find((s) => s.key === "units")!;
  return { ...def, columns: def.columns.filter((c) => c.key !== "project") };
};

export type UnitsImportResult = { ok: boolean; saved: boolean; message: string; problems: Problem[]; create: number; update: number; warning?: string };

/**
 * Checks, and with `save` applies, a units sheet for one project. A unit with the same building
 * and number is updated. Unit type codes must be the project's own, and a unit's price can't be
 * under its type's starting price. All rows or none.
 */
export async function importProjectUnits(buffer: ArrayBuffer, projectId: string, save: boolean): Promise<UnitsImportResult> {
  const problems: Problem[] = [];
  const fail = (message: string): UnitsImportResult => ({ ok: false, saved: false, message, problems, create: 0, update: 0 });
  const wb = new ExcelJS.Workbook();
  try {
    await wb.xlsx.load(buffer);
  } catch {
    return fail("الملف مش Excel صالح (لازم يكون ‎.xlsx).");
  }
  const def = projectUnitsDef();
  if (!wb.getWorksheet(def.name)) return fail(`مالقيناش شيت اسمه «${def.name}». نزّل الملف من الصفحة دي وعدّل عليه.`);
  const { rows, present } = readSheet(wb, def, problems);
  if (!rows.length && !problems.length) return fail("الشيت فاضي.");

  const [types, existing] = await Promise.all([
    db.typology.findMany({ where: { projectId, priceFrom: { not: null } }, select: { id: true, code: true, priceFrom: true } }),
    db.unit.findMany({ where: { typology: { projectId } }, select: { id: true, building: true, unitNumber: true } }),
  ]);
  const typeByCode = new Map(types.map((t) => [t.code.toLowerCase(), t]));
  const idByKey = new Map(existing.filter((u) => u.unitNumber).map((u) => [unitKey(u.building, u.unitNumber!), u.id]));

  const seen = new Set<string>();
  const out: { id?: string; typologyId: string; values: ReturnType<typeof readUnit> }[] = [];
  for (const { row, cells } of rows) {
    const say = (column: string, message: string) => problems.push({ sheet: def.name, row, column, message });
    const { data, refs } = rowToForm(def, cells, say);
    if (!data.get("availability")) data.set("availability", "AVAILABLE");
    if (["ارضي", "الارضي", "ground", "g"].includes(norm(String(data.get("floor") ?? "")))) data.set("floor", "0");
    const f = new FormReader(data);
    const values = readUnit(f);
    for (const [key, message] of Object.entries(f.errors)) say(def.columns.find((c) => c.key === key)?.header ?? key, message);
    const type = refs.typology ? typeByCode.get(refs.typology.toLowerCase()) : undefined;
    if (!refs.typology) say("كود النموذج", "هذا الحقل مطلوب");
    else if (!type) say("كود النموذج", `مالقيناش نموذج بالكود «${refs.typology}» في المشروع ده`);
    const priceProblem = type ? unitPriceProblem(values.price, Number(type.priceFrom)) : null;
    if (priceProblem) say(def.columns.find((c) => c.key === "price")?.header ?? "price", priceProblem);
    if (!type || !values.unitNumber) continue;
    const key = unitKey(values.building, values.unitNumber);
    if (seen.has(key)) say("رقم الوحدة", "الوحدة دي متكررة في الشيت (نفس المبنى والرقم)");
    seen.add(key);
    out.push({ id: idByKey.get(key), typologyId: type.id, values });
  }

  const create = out.filter((u) => !u.id).length;
  const update = out.length - create;
  if (problems.length) return fail(`فيه ${problems.length} مشكلة لازم تتصلّح. ماحدش اتحفظ.`);
  // Units this sheet takes off the market lose their Sales holds when it is saved (spec section 6).
  const leaving = out.flatMap((u) => (u.id && u.values.availability !== "AVAILABLE" ? [{ id: u.id, availability: u.values.availability }] : []));
  if (!save) {
    const warning = holdsLeavingWarning(await heldLeaving(leavingSales({ units: leaving.map((u) => ({ existingId: u.id, availability: u.availability })) })));
    return { ok: true, saved: false, message: `الملف سليم: ${create} وحدة جديدة و${update} تحديث.`, problems, create, update, warning };
  }

  const updateIds = out.flatMap((u) => (u.id ? [u.id] : []));
  let released: number;
  try {
    released = await db.$transaction(
      async (tx) => {
        // The units being updated are locked first, in id order, like every write that changes many
        // units, so this never deadlocks with an admin save or import of the same project.
        if (updateIds.length) await lockUnits(tx, { id: { in: updateIds } });
        for (const u of out) {
          if (u.id) await tx.unit.update({ where: { id: u.id }, data: { ...onlyPresent(u.values, present, ["unitNumber", "availability"]), typologyId: u.typologyId } });
          else await tx.unit.create({ data: { ...u.values, typologyId: u.typologyId } });
        }
        return releaseHoldsOfUnavailable(tx, leaving, "PORTAL_STATUS_CHANGE");
      },
      { timeout: 120_000, maxWait: 20_000 },
    );
  } catch (e) {
    if (isBusy(e)) return fail(BUSY);
    throw e;
  }
  const holds = released ? `، واتلغى ${countAr(released, HOLDS_NOUN)} لفريق المبيعات` : "";
  return { ok: true, saved: true, message: `تم ✓ ${create} وحدة جديدة و${update} تحديث${holds}.`, problems, create, update };
}

/** One project's units as a workbook the developer edits and uploads back. */
export async function buildProjectUnitsWorkbook(projectId: string): Promise<ArrayBuffer> {
  const def = projectUnitsDef();
  const [types, units] = await Promise.all([
    db.typology.findMany({ where: { projectId, priceFrom: { not: null } }, select: { code: true }, orderBy: { code: "asc" } }),
    db.unit.findMany({
      where: { typology: { projectId } },
      include: { typology: { select: { code: true } } },
      orderBy: [{ building: "asc" }, { floor: "asc" }, { unitNumber: "asc" }],
    }),
  ]);
  const wb = new ExcelJS.Workbook();
  wb.creator = "AqarArena";
  const ws = wb.addWorksheet(def.name, { views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }] });
  const lists = wb.addWorksheet("القوائم", { views: [{ rightToLeft: true }] });
  const listCols: [string, string[]][] = [
    ["كود النموذج", types.map((t) => t.code)],
    ["حالة الوحدة", CHOICES.availability.map((c) => c.label)],
    ["الإطلالة", CHOICES.unitViews.map((c) => c.label)],
    ["الاتجاه", CHOICES.orientations.map((c) => c.label)],
  ];
  const range = new Map<string, string>();
  listCols.forEach(([title, values], i) => {
    const letter = String.fromCharCode(65 + i);
    lists.getCell(`${letter}1`).value = title;
    lists.getCell(`${letter}1`).font = { bold: true };
    values.forEach((v, j) => (lists.getCell(`${letter}${j + 2}`).value = v));
    lists.getColumn(i + 1).width = 24;
    range.set(title, `'القوائم'!$${letter}$2:$${letter}$${Math.max(2, values.length + 1)}`);
  });

  ws.columns = def.columns.map((c) => ({ header: c.header + (c.required ? " *" : ""), key: c.key, width: c.width ?? 16 }));
  ws.getRow(1).font = { bold: true };
  const listOf: Record<string, string> = { typology: "كود النموذج", availability: "حالة الوحدة", view: "الإطلالة", orientation: "الاتجاه" };
  def.columns.forEach((c, i) => {
    if (c.help) ws.getRow(1).getCell(i + 1).note = c.help;
    if (c.key === "price") ws.getColumn(i + 1).numFmt = "#,##0";
    const title = listOf[c.key];
    if (!title) return;
    const letter = ws.getColumn(i + 1).letter;
    // exceljs supports range validations at runtime; its types only describe per-cell ones.
    (ws as unknown as { dataValidations: { add(range: string, v: ExcelJS.DataValidation): void } }).dataValidations.add(`${letter}2:${letter}${MAX_ROWS + 1}`, {
      type: "list",
      allowBlank: true,
      formulae: [range.get(title)!],
      showErrorMessage: true,
      errorStyle: "stop",
      errorTitle: "قيمة غير معروفة",
      error: "اختار من القائمة",
    });
  });
  for (const u of units) {
    ws.addRow({
      typology: u.typology.code,
      unitNumber: u.unitNumber,
      building: u.building,
      floor: u.floor,
      availability: label(CHOICES.availability, u.availability),
      price: num(u.price),
      view: label(CHOICES.unitViews, u.view),
      orientation: label(CHOICES.orientations, u.orientation),
    });
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}
