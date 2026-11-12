"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { importWorkbook, type ImportResult } from "@/lib/admin/import/workbook";

const EMPTY: ImportResult["counts"] = {
  developers: { create: 0, update: 0 },
  projects: { create: 0, update: 0 },
  typologies: { create: 0, update: 0 },
  plans: { create: 0, update: 0 },
  units: { create: 0, update: 0 },
};

const refuse = (message: string): ImportResult => ({ ok: false, saved: false, message, problems: [], counts: EMPTY });

/** Checks an uploaded workbook, and saves it when the "import" button was pressed. */
export async function runImport(_: ImportResult | null, data: FormData): Promise<ImportResult> {
  await requireAdmin();
  const file = data.get("file");
  const save = data.get("mode") === "save";
  if (!(file instanceof File) || file.size === 0) return refuse("اختار ملف Excel الأول.");
  if (!/\.xlsx$/i.test(file.name)) return refuse("لازم الملف يكون بصيغة xlsx (من Excel: حفظ باسم ← Excel Workbook).");
  const result = await importWorkbook(await file.arrayBuffer(), save);
  if (result.saved) updateTag(CATALOG_TAG);
  return result;
}
