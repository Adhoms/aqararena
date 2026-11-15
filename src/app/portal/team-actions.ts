"use server";

import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import { FormReader, type FormState } from "@/lib/admin/form";
import { generatePassword, hashPassword, normalizeUsername } from "@/lib/portal/password";
import { requireAccount } from "@/lib/portal/session";
import { readSalesPerson, readSalesRole } from "@/lib/sales/fields";

// The developer's portal account manages its own sales team. Temporary passwords are shown once,
// in the form's reply, to be handed to the salesperson, who must choose their own at first sign-in.
// Only the hash is stored; the password is never logged or put in a URL.

const TAKEN: FormState = { ok: false, message: "اسم المستخدم مستخدم", errors: { username: "اختار اسم تاني" } };

/** A sales account that belongs to the signed-in developer, or null. */
async function ownMember(developerId: string, id: string | null) {
  return id ? db.salesAccount.findFirst({ where: { id, developerId }, select: { id: true, username: true } }) : null;
}

export async function createSalesAccount(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireAccount();
  const f = new FormReader(data);
  const values = { ...readSalesPerson(f), role: readSalesRole(f) };
  const username = normalizeUsername(String(data.get("username") ?? ""));
  if (!username) f.errors.username = "حروف إنجليزية صغيرة وأرقام و . _ - (3 لـ 32)";
  if (!f.ok || !username) return f.result();
  // Usernames are unique across every developer's sales accounts.
  if (await db.salesAccount.findUnique({ where: { username }, select: { id: true } })) return TAKEN;
  const password = generatePassword();
  try {
    await db.salesAccount.create({ data: { ...values, username, developerId: me.developerId, passwordHash: await hashPassword(password) } });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return TAKEN;
    throw e;
  }
  return {
    ok: true,
    message: `اتعمل الحساب ✓ اسم المستخدم: ${username} · كلمة المرور المؤقتة: ${password} (انسخها دلوقتي، مش هتظهر تاني). الدخول من aqararena.com/sales`,
  };
}

export async function updateSalesAccount(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireAccount();
  const f = new FormReader(data);
  const member = await ownMember(me.developerId, f.id("id"));
  if (!member) return { ok: false, message: "الحساب ده مش في فريقك" };
  const values = { ...readSalesPerson(f), role: readSalesRole(f) };
  if (!f.ok) return f.result();
  await db.salesAccount.update({ where: { id: member.id }, data: values });
  return { ok: true, message: "اتحفظ ✓" };
}

export async function resetSalesPassword(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireAccount();
  const member = await ownMember(me.developerId, new FormReader(data).id("id"));
  if (!member) return { ok: false, message: "الحساب ده مش في فريقك" };
  const password = generatePassword();
  await db.salesAccount.update({
    where: { id: member.id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true, sessionVersion: { increment: 1 } },
  });
  return { ok: true, message: `كلمة المرور المؤقتة لـ ${member.username}: ${password} (انسخها دلوقتي، مش هتظهر تاني)` };
}

export async function setSalesStatus(data: FormData) {
  const me = await requireAccount();
  const member = await ownMember(me.developerId, new FormReader(data).id("id"));
  if (!member) notFound();
  const status = data.get("status") === "ACTIVE" ? "ACTIVE" : "DISABLED";
  await db.salesAccount.update({ where: { id: member.id }, data: { status, sessionVersion: { increment: 1 } } });
  redirect("/portal/team");
}
