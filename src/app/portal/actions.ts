"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { FormReader, type FormState } from "@/lib/admin/form";
import { deleteIfUnused } from "@/lib/admin/blob";
import { hashPassword, MIN_PASSWORD, normalizeUsername, verifyPassword } from "@/lib/portal/password";
import { endPortalSession, requireAccount, startPortalSession } from "@/lib/portal/session";
import { emptyProjectDraft, type DraftErrors } from "@/lib/portal/draft-types";
import {
  checkProfileDraft,
  checkProjectDraft,
  draftFromDeveloper,
  draftFromProject,
  parseProfileDraft,
  parseProjectDraft,
  projectInclude,
} from "@/lib/portal/drafts";

const slow = () => new Promise((r) => setTimeout(r, 800));

// ─── Signing in ─────────────────────────────────────────────────────────

export async function portalLogin(_: FormState, data: FormData): Promise<FormState> {
  const username = normalizeUsername(String(data.get("username") ?? ""));
  const password = String(data.get("password") ?? "");
  const account = username ? await db.developerAccount.findUnique({ where: { username } }) : null;
  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    await slow();
    return { ok: false, message: "اسم المستخدم أو كلمة المرور غير صحيحة" };
  }
  if (account.status === "PENDING") return { ok: false, message: "طلبك لسه قيد المراجعة. هنبلغك أول ما الحساب يتفعّل." };
  if (account.status === "DISABLED" || !account.developerId) return { ok: false, message: "الحساب ده موقوف. تواصل معانا." };
  await db.developerAccount.update({ where: { id: account.id }, data: { lastLoginAt: new Date() } });
  await startPortalSession(account);
  redirect(account.mustChangePassword ? "/portal/password" : "/portal");
}

export async function portalLogout() {
  await endPortalSession();
  redirect("/portal/login");
}

export async function requestAccount(_: FormState, data: FormData): Promise<FormState> {
  // Bots fill every field; people never see this one.
  if (String(data.get("website") ?? "")) return { ok: true, message: "تم إرسال طلبك ✓" };
  const f = new FormReader(data);
  const values = {
    companyNameAr: f.requiredText("companyNameAr", 200),
    companyNameEn: f.text("companyNameEn", { max: 200 }),
    contactName: f.requiredText("contactName", 200),
    phone: f.requiredText("phone", 40),
    email: f.text("email", { max: 200 }),
    note: f.text("note", { max: 1000 }),
  };
  const username = normalizeUsername(String(data.get("username") ?? ""));
  if (!username) f.errors.username = "من 3 لـ 32 حرف: حروف إنجليزية صغيرة وأرقام و . _ -";
  const password = String(data.get("password") ?? "");
  if (password.length < MIN_PASSWORD) f.errors.password = `كلمة المرور ${MIN_PASSWORD} حروف على الأقل`;
  if (password !== String(data.get("confirm") ?? "")) f.errors.confirm = "كلمتين المرور مش زي بعض";
  if (values.email && !/^\S+@\S+\.\S+$/.test(values.email)) f.errors.email = "بريد إلكتروني غير صالح";
  if (!f.ok || !username) return f.result();
  if (await db.developerAccount.findUnique({ where: { username }, select: { id: true } })) {
    return { ok: false, message: "اسم المستخدم ده مستخدم", errors: { username: "اختار اسم تاني" } };
  }
  await db.developerAccount.create({ data: { ...values, username, passwordHash: await hashPassword(password), status: "PENDING" } });
  return { ok: true, message: "تم إرسال طلبك ✓ هنراجعه ونفعّل حسابك، وبعدها تقدر تدخل باسم المستخدم وكلمة المرور اللي اخترتهم." };
}

export async function changePassword(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireAccount({ allowTemporaryPassword: true });
  const account = await db.developerAccount.findUniqueOrThrow({ where: { id: me.id } });
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
  const updated = await db.developerAccount.update({
    where: { id: account.id },
    data: { passwordHash: await hashPassword(next), mustChangePassword: false, sessionVersion: { increment: 1 } },
  });
  await startPortalSession(updated);
  redirect("/portal?password=1");
}

// ─── Drafts ─────────────────────────────────────────────────────────────

const OPEN = ["DRAFT", "PENDING", "REJECTED"] as const;

/** Opens the developer's draft for a project (continuing an open one, or starting from the live version). */
export async function editProject(data: FormData) {
  const me = await requireAccount();
  const projectId = String(data.get("projectId") ?? "");
  const project = await db.project.findFirst({ where: { id: projectId, developerId: me.developerId }, include: projectInclude });
  if (!project) redirect("/portal");
  const open = await db.submission.findFirst({ where: { projectId, developerId: me.developerId, status: { in: [...OPEN] } }, select: { id: true } });
  if (open) redirect(`/portal/submissions/${open.id}`);
  const created = await db.submission.create({
    data: { kind: "PROJECT", accountId: me.id, developerId: me.developerId, projectId, title: project.nameAr, data: draftFromProject(project) },
  });
  redirect(`/portal/submissions/${created.id}`);
}

export async function newProject() {
  const me = await requireAccount();
  const created = await db.submission.create({
    data: { kind: "PROJECT", accountId: me.id, developerId: me.developerId, title: "مشروع جديد", data: emptyProjectDraft() },
  });
  redirect(`/portal/submissions/${created.id}`);
}

export async function editProfile() {
  const me = await requireAccount();
  const open = await db.submission.findFirst({
    where: { kind: "DEVELOPER_PROFILE", developerId: me.developerId, status: { in: [...OPEN] } },
    select: { id: true },
  });
  if (open) redirect(`/portal/submissions/${open.id}`);
  const developer = await db.developer.findUniqueOrThrow({ where: { id: me.developerId } });
  const created = await db.submission.create({
    data: { kind: "DEVELOPER_PROFILE", accountId: me.id, developerId: me.developerId, title: developer.nameAr, data: draftFromDeveloper(developer) },
  });
  redirect(`/portal/submissions/${created.id}`);
}

export type SaveResult = { ok: boolean; message: string; errors?: DraftErrors; status?: string };

/** Saves a draft, and with `send` checks it and sends it to the admin. */
export async function saveSubmission(id: string, raw: unknown, send: boolean): Promise<SaveResult> {
  const me = await requireAccount();
  const sub = await db.submission.findFirst({ where: { id, developerId: me.developerId } });
  if (!sub) return { ok: false, message: "الطلب غير موجود" };
  if (sub.status === "PENDING") return { ok: false, message: "الطلب قيد المراجعة. اسحبه الأول عشان تعدّل." };
  if (sub.status === "APPROVED") return { ok: false, message: "الطلب ده اتوافق عليه خلاص. افتح تعديل جديد من الصفحة الرئيسية." };

  let title = sub.title;
  let data: object;
  let errors: DraftErrors = {};
  if (sub.kind === "PROJECT") {
    const draft = parseProjectDraft(raw);
    data = draft;
    title = (typeof draft.project.nameAr === "string" && draft.project.nameAr.trim()) || "مشروع جديد";
    if (send) errors = (await checkProjectDraft(draft)).errors;
  } else {
    const draft = parseProfileDraft(raw);
    data = draft;
    title = (typeof draft.profile.nameAr === "string" && draft.profile.nameAr.trim()) || sub.title;
    if (send) errors = checkProfileDraft(draft).errors;
  }

  const ready = send && Object.keys(errors).length === 0;
  await db.submission.update({
    where: { id },
    data: {
      data,
      title: title.slice(0, 200),
      status: ready ? "PENDING" : "DRAFT",
      ...(ready && { submittedAt: new Date(), reviewNote: null }),
    },
  });
  if (send && !ready) return { ok: false, message: `فيه ${Object.keys(errors).length} حاجة محتاجة تتصلّح قبل الإرسال. اتحفظت كمسودة.`, errors, status: "DRAFT" };
  return ready
    ? { ok: true, message: "اتبعت للمراجعة ✓ هيظهر على الموقع بعد الموافقة.", status: "PENDING" }
    : { ok: true, message: "اتحفظت المسودة ✓", status: "DRAFT" };
}

/** Takes a sent request back to keep editing it. */
export async function withdrawSubmission(data: FormData) {
  const me = await requireAccount();
  const id = String(data.get("id") ?? "");
  await db.submission.updateMany({ where: { id, developerId: me.developerId, status: "PENDING" }, data: { status: "DRAFT", submittedAt: null } });
  redirect(`/portal/submissions/${id}`);
}

/** Throws away a draft (never a live project). Files uploaded only for it are deleted. */
export async function discardSubmission(data: FormData) {
  const me = await requireAccount();
  const id = String(data.get("id") ?? "");
  const sub = await db.submission.findFirst({ where: { id, developerId: me.developerId, status: { in: ["DRAFT", "REJECTED"] } } });
  if (sub) {
    await db.submission.delete({ where: { id } });
    const urls = JSON.stringify(sub.data).match(/https:\/\/[^"\s]+/g) ?? [];
    await deleteIfUnused(urls);
  }
  redirect("/portal");
}
