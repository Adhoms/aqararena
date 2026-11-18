"use server";

import { revalidatePath } from "next/cache";
import { FormReader, type FormState } from "@/lib/admin/form";
import { cancelHold, convertHold, createHold } from "@/lib/sales/hold-service";
import type { HoldActor } from "@/lib/sales/holds";
import { requireSales, type SalesUser } from "@/lib/sales/session";

// Each action re-reads the session (requireSales signs out a disabled account) and hands the hold
// service the salesperson's own developer, which scopes every query: another company's id is "not found".
// The page is refreshed either way, so a lost race shows who won.

const actor = (me: SalesUser): HoldActor => ({ id: me.id, role: me.role, developerId: me.developer.id });
const NOT_FOUND: FormState = { ok: false, message: "الوحدة أو الحجز ده مش موجود" };

export async function holdUnit(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales();
  const f = new FormReader(data);
  const unitId = f.id("unitId");
  const clientNote = f.text("clientNote", { max: 200 });
  if (!f.ok) return f.result();
  if (!unitId) return NOT_FOUND;
  const result = await createHold({ account: actor(me), unitId, clientNote });
  revalidatePath("/sales", "layout");
  return result;
}

export async function convertUnitHold(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales();
  const holdId = new FormReader(data).id("holdId");
  if (!holdId) return NOT_FOUND;
  const result = await convertHold(actor(me), holdId);
  revalidatePath("/sales", "layout");
  return result;
}

export async function cancelUnitHold(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales();
  const holdId = new FormReader(data).id("holdId");
  if (!holdId) return NOT_FOUND;
  const result = await cancelHold(actor(me), holdId);
  revalidatePath("/sales", "layout");
  return result;
}
