"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { sendPriceAlerts } from "@/lib/price-alerts";
import { db } from "@/lib/db";
import { CATALOG_TAG } from "@/lib/catalog";
import { requireAdmin } from "@/lib/admin/auth";
import { deleteIfUnused } from "@/lib/admin/blob";
import { FormReader, type FormState } from "@/lib/admin/form";
import { generatePassword, hashPassword, normalizeUsername } from "@/lib/portal/password";
import { applyProfileDraft, applyProjectDraft, checkProfileDraft, checkProjectDraft, parseProfileDraft, parseProjectDraft } from "@/lib/portal/drafts";

// The admin's side of the developer portal: approving or sending back developer changes, and
// managing developer accounts.

// ─── Submissions ────────────────────────────────────────────────────────

export async function approveSubmission(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(data.get("id") ?? "");
  const publish = data.get("publish") === "on";
  const sub = await db.submission.findUnique({ where: { id } });
  if (!sub || sub.status !== "PENDING") return { ok: false, message: "الطلب ده مش مستني موافقة" };

  let removed: string[] = [];
  let alertProject: string | undefined;
  if (sub.kind === "PROJECT") {
    const { errors, values } = await checkProjectDraft(parseProjectDraft(sub.data));
    if (Object.keys(errors).length) return { ok: false, message: `البيانات فيها ${Object.keys(errors).length} مشكلة (مثلًا: ${Object.values(errors)[0]}). ابعتها للمطور يصلّحها.` };
    if (sub.projectId && !(await db.project.findFirst({ where: { id: sub.projectId, developerId: sub.developerId }, select: { id: true } }))) {
      return { ok: false, message: "المشروع ده اتمسح أو اتنقل لمطور تاني" };
    }
    await db.$transaction(
      async (tx) => {
        const res = await applyProjectDraft(tx, { developerId: sub.developerId, projectId: sub.projectId, values, publish });
        removed = res.removedUrls;
        alertProject = res.projectId;
        await tx.submission.update({ where: { id }, data: { status: "APPROVED", reviewedAt: new Date(), projectId: res.projectId, reviewNote: null } });
      },
      { timeout: 60_000 },
    );
  } else {
    const { errors, values } = checkProfileDraft(parseProfileDraft(sub.data));
    if (Object.keys(errors).length) return { ok: false, message: `البيانات فيها مشكلة: ${Object.values(errors)[0]}` };
    await db.$transaction(async (tx) => {
      removed = await applyProfileDraft(tx, sub.developerId, values);
      await tx.submission.update({ where: { id }, data: { status: "APPROVED", reviewedAt: new Date(), reviewNote: null } });
    });
  }
  updateTag(CATALOG_TAG);
  await deleteIfUnused(removed);
  // Subscribers hear about new prices or plans right away.
  if (alertProject) after(() => sendPriceAlerts(alertProject!).then(() => undefined));
  const account = await db.developerAccount.findUnique({ where: { id: sub.accountId }, select: { email: true } });
  if (account?.email) {
    after(() =>
      sendEmail({
        to: account.email!,
        subject: `اتوافق على "${sub.title}" ✓ · AqarArena`,
        text: [`أهلًا،`, "", `راجعنا "${sub.title}" ووافقنا عليه، والتغييرات ظاهرة دلوقتي على AqarArena.`, "", `${SITE_URL}/portal`].join("\n"),
      }),
    );
  }
  redirect("/admin/review?done=approved");
}

export async function rejectSubmission(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const f = new FormReader(data);
  const id = String(data.get("id") ?? "");
  const note = f.requiredText("note", 2000);
  if (!f.ok) return f.result("اكتب للمطور إيه اللي محتاج يتعدّل");
  const res = await db.submission.updateMany({ where: { id, status: "PENDING" }, data: { status: "REJECTED", reviewNote: note, reviewedAt: new Date() } });
  if (!res.count) return { ok: false, message: "الطلب ده مش مستني موافقة" };
  const sub = await db.submission.findUnique({ where: { id }, select: { title: true, account: { select: { email: true } } } });
  if (sub?.account.email) {
    after(() =>
      sendEmail({
        to: sub.account.email!,
        subject: `"${sub.title}" محتاج تعديل · AqarArena`,
        text: [`أهلًا،`, "", `راجعنا "${sub.title}" ومحتاج تعديل قبل النشر:`, "", note, "", `عدّل وابعته تاني من البوابة: ${SITE_URL}/portal`].join("\n"),
      }),
    );
  }
  redirect("/admin/review?done=returned");
}

// ─── Accounts ───────────────────────────────────────────────────────────

/** Activates a requested account, linking it to an existing developer or creating one from the request. */
export async function approveAccount(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(data.get("id") ?? "");
  const choice = String(data.get("developerId") ?? "");
  const account = await db.developerAccount.findUnique({ where: { id } });
  if (!account || account.status !== "PENDING") return { ok: false, message: "الطلب غير موجود" };

  let developerId = choice;
  if (choice === "new") {
    const f = new FormReader(data);
    const nameAr = f.requiredText("nameAr", 200);
    const nameEn = f.requiredText("nameEn", 200);
    const slug = f.slug("slug", nameEn);
    if (!f.ok) return f.result();
    if (await db.developer.findUnique({ where: { slug }, select: { id: true } })) {
      return { ok: false, message: "فيه مطور بنفس الاسم الإنجليزي. اختاره من القائمة بدل ما تعمل واحد جديد.", errors: { nameEn: "موجود" } };
    }
    developerId = (
      await db.developer.create({
        data: { nameAr, nameEn, slug, salesPhone: account.phone, email: account.email },
        select: { id: true },
      })
    ).id;
    updateTag(CATALOG_TAG);
  } else if (!(await db.developer.findUnique({ where: { id: choice }, select: { id: true } }))) {
    return { ok: false, message: "اختار المطور", errors: { developerId: "اختار المطور" } };
  }
  await db.developerAccount.update({ where: { id }, data: { status: "ACTIVE", developerId } });
  if (account.email) {
    after(() =>
      sendEmail({
        to: account.email!,
        subject: "حسابك على AqarArena اتفعّل ✓",
        text: [`أهلًا ${account.contactName ?? ""}،`, "", `حساب شركتك على بوابة المطورين اتفعّل. تقدر تدخل باسم المستخدم ${account.username} وكلمة المرور اللي اخترتها:`, `${SITE_URL}/portal/login`].join("\n"),
      }),
    );
  }
  return { ok: true, message: `اتفعّل ✓ بلّغ ${account.contactName ?? "المطور"} إنه يقدر يدخل باسم المستخدم ${account.username}.` };
}

/** Creates an account for a developer. The temporary password is shown once to the admin. */
export async function createAccount(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const developerId = String(data.get("developerId") ?? "");
  const username = normalizeUsername(String(data.get("username") ?? ""));
  if (!username) return { ok: false, message: "اسم مستخدم غير صالح", errors: { username: "حروف إنجليزية صغيرة وأرقام و . _ - (3 لـ 32)" } };
  if (!(await db.developer.findUnique({ where: { id: developerId }, select: { id: true } }))) return { ok: false, message: "اختار المطور", errors: { developerId: "اختار المطور" } };
  if (await db.developerAccount.findUnique({ where: { username }, select: { id: true } })) return { ok: false, message: "اسم المستخدم مستخدم", errors: { username: "اختار اسم تاني" } };
  const password = generatePassword();
  await db.developerAccount.create({
    data: { username, developerId, status: "ACTIVE", mustChangePassword: true, passwordHash: await hashPassword(password) },
  });
  return { ok: true, message: `اتعمل الحساب ✓ اسم المستخدم: ${username}. انسخ كلمة المرور المؤقتة دلوقتي، مش هتظهر تاني. المطور هيغيّرها أول ما يدخل.`, secret: password };
}

export async function resetPassword(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const id = String(data.get("id") ?? "");
  const password = generatePassword();
  const account = await db.developerAccount.update({
    where: { id },
    data: { passwordHash: await hashPassword(password), mustChangePassword: true, sessionVersion: { increment: 1 }, resetRequestedAt: null },
  });
  return { ok: true, message: `كلمة المرور المؤقتة لـ ${account.username}: انسخها دلوقتي، مش هتظهر تاني.`, secret: password };
}

export async function setAccountStatus(data: FormData) {
  await requireAdmin();
  const id = String(data.get("id") ?? "");
  const status = data.get("status") === "ACTIVE" ? "ACTIVE" : "DISABLED";
  const account = await db.developerAccount.findUnique({ where: { id }, select: { developerId: true } });
  if (!account?.developerId && status === "ACTIVE") return;
  await db.developerAccount.update({ where: { id }, data: { status, sessionVersion: { increment: 1 } } });
  redirect("/admin/accounts");
}

/** Deletes an account and its requests. Live projects and developers are never touched. */
export async function deleteAccount(data: FormData) {
  await requireAdmin();
  const id = String(data.get("id") ?? "");
  await db.developerAccount.delete({ where: { id } }).catch(() => null);
  redirect("/admin/accounts");
}

// ─── Visitor messages ───────────────────────────────────────────────────

export async function setMessageStatus(data: FormData) {
  await requireAdmin();
  const id = String(data.get("id") ?? "");
  const status = data.get("status") === "DONE" ? "DONE" : "NEW";
  await db.contactMessage.updateMany({ where: { id }, data: { status } });
  redirect(status === "DONE" ? "/admin/messages" : "/admin/messages?show=done");
}

export async function deleteMessage(data: FormData) {
  await requireAdmin();
  await db.contactMessage.deleteMany({ where: { id: String(data.get("id") ?? "") } });
  redirect("/admin/messages");
}

// ─── Price alerts ───────────────────────────────────────────────────────

/** Sends the price alert for a project after the admin's own edits. */
export async function sendProjectAlerts(data: FormData) {
  await requireAdmin();
  const id = String(data.get("id") ?? "");
  const sent = await sendPriceAlerts(id);
  redirect(`/admin/projects/${id}?alerts=${sent}`);
}

export async function deletePriceAlert(data: FormData) {
  await requireAdmin();
  await db.priceAlert.deleteMany({ where: { id: String(data.get("id") ?? "") } });
  redirect("/admin/alerts");
}
