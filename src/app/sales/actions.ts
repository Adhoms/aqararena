"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { FormReader, type FormState } from "@/lib/admin/form";
import { MIN_PASSWORD, hashPassword, normalizeUsername, verifyPassword } from "@/lib/portal/password";
import { readSalesPerson } from "@/lib/sales/fields";
import { endSalesSession, requireSales, startSalesSession } from "@/lib/sales/session";
import { clearFailures, clientIp, lockedMessage, lockedMinutes, recordFailure } from "@/lib/throttle";

const slow = () => new Promise((r) => setTimeout(r, 800));

export async function salesLogin(_: FormState, data: FormData): Promise<FormState> {
  const username = normalizeUsername(String(data.get("username") ?? ""));
  const password = String(data.get("password") ?? "");
  // Limit wrong tries both per address and per account.
  const keys = [`sales-ip:${await clientIp()}`, ...(username ? [`sales-user:${username}`] : [])];
  const wait = await lockedMinutes(keys);
  if (wait) return { ok: false, message: lockedMessage(wait) };
  const account = username ? await db.salesAccount.findUnique({ where: { username } }) : null;
  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    await slow();
    await recordFailure(keys);
    return { ok: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" };
  }
  await clearFailures(keys);
  if (account.status !== "ACTIVE") return { ok: false, message: "الحساب ده موقوف. كلّم مدير الحساب في شركتك." };
  await db.salesAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
  await startSalesSession(account);
  redirect(account.mustChangePassword ? "/sales/password" : "/sales");
}

export async function salesLogout() {
  await endSalesSession();
  redirect("/sales/login");
}

export async function changeSalesPassword(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales({ allowTemporaryPassword: true });
  const account = await db.salesAccount.findUniqueOrThrow({ where: { id: me.id } });
  const current = String(data.get("current") ?? "");
  const next = String(data.get("password") ?? "");
  const errors: Record<string, string> = {};
  if (!(await verifyPassword(current, account.passwordHash))) errors.current = "كلمة المرور الحالية غير صحيحة";
  if (next.length < MIN_PASSWORD) errors.password = `${MIN_PASSWORD} حروف على الأقل`;
  else if (next === current) errors.password = "اختار كلمة مرور جديدة";
  if (next !== String(data.get("confirm") ?? "")) errors.confirm = "كلمتين المرور مش زي بعض";
  if (Object.keys(errors).length) {
    if (errors.current) await slow();
    return { ok: false, message: "راجع الحقول المظللة", errors };
  }
  const updated = await db.salesAccount.update({
    where: { id: account.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false, sessionVersion: { increment: 1 } },
  });
  await startSalesSession(updated);
  redirect("/sales?password=1");
}

/** A salesperson keeps their own name and numbers current; these go on their offers. The role is not theirs to change. */
export async function updateSalesProfile(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales();
  const f = new FormReader(data);
  // readSalesPerson has no role: only the company's portal account sets roles (readSalesRole).
  const values = readSalesPerson(f);
  if (!f.ok) return f.result();
  await db.salesAccount.update({ where: { id: me.id }, data: values });
  return { ok: true, message: "اتحفظ ✓ البيانات دي هتظهر على عروضك" };
}
