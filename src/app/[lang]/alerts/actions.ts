"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { alertLink, ensureSnapshot, newToken } from "@/lib/price-alerts";
import { clientIp, lockedMinutes, recordFailure } from "@/lib/throttle";

export type AlertState = { ok?: boolean; message?: string; errors?: Record<string, string> };

const TEXT = {
  ar: {
    required: "مطلوب",
    email: "بريد إلكتروني غير صحيح",
    phone: "رقم موبايل غير صحيح",
    fix: "راجع الحقول المظللة",
    busy: (m: number) => `طلبات كتير. جرّب تاني بعد ${m} دقيقة.`,
    gone: "المشروع ده مش متاح دلوقتي",
    sent: "تمام ✓ بعتنالك إيميل فيه رابط تأكيد. افتحه عشان التنبيهات تشتغل.",
  },
  en: {
    required: "Required",
    email: "Invalid email address",
    phone: "Invalid mobile number",
    fix: "Please check the highlighted fields",
    busy: (m: number) => `Too many requests. Please try again in ${m} minutes.`,
    gone: "This project isn't available right now",
    sent: "Done ✓ We emailed you a confirmation link. Open it to start the alerts.",
  },
};

/** Signs a visitor up for a project's price alerts and emails them a confirmation link. */
export async function subscribePriceAlert(_: AlertState, data: FormData): Promise<AlertState> {
  const locale = data.get("locale") === "en" ? "en" : "ar";
  const t = TEXT[locale];
  // Bots fill every field; people never see this one.
  if (String(data.get("company") ?? "")) return { ok: true, message: t.sent };

  const get = (k: string, max: number) => String(data.get(k) ?? "").trim().slice(0, max);
  const slug = get("project", 200);
  const name = get("name", 120);
  const email = get("email", 200).toLowerCase();
  const phone = get("phone", 30);

  const errors: Record<string, string> = {};
  if (!name) errors.name = t.required;
  if (!email) errors.email = t.required;
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = t.email;
  if (phone && !/^\+?[\d\s()-]{7,20}$/.test(phone)) errors.phone = t.phone;
  if (Object.keys(errors).length) return { ok: false, message: t.fix, errors };

  const keys = [`alert:${await clientIp()}`];
  const wait = await lockedMinutes(keys);
  if (wait) return { ok: false, message: t.busy(wait) };
  await recordFailure(keys);

  const project = await db.project.findFirst({ where: { slug, published: true }, select: { id: true, nameAr: true, nameEn: true } });
  if (!project) return { ok: false, message: t.gone };

  // Unconfirmed sign-ups older than a week are dropped.
  await db.priceAlert.deleteMany({ where: { confirmedAt: null, createdAt: { lt: new Date(Date.now() - 7 * 86_400_000) } } });

  const existing = await db.priceAlert.findUnique({ where: { projectId_email: { projectId: project.id, email } } });
  if (existing?.confirmedAt) {
    // Already on the list: keep the details fresh and say the same thing, without another email.
    await db.priceAlert.update({ where: { id: existing.id }, data: { name, phone: phone || existing.phone, locale } });
    return { ok: true, message: t.sent };
  }
  const alert = existing
    ? await db.priceAlert.update({ where: { id: existing.id }, data: { name, phone: phone || null, locale } })
    : await db.priceAlert.create({ data: { projectId: project.id, name, email, phone: phone || null, locale, token: newToken() } });
  await ensureSnapshot(project.id);

  const projectName = locale === "en" ? project.nameEn : project.nameAr;
  const link = alertLink(locale, alert.token);
  after(() =>
    sendEmail({
      to: email,
      subject: locale === "en" ? `Confirm price alerts for ${projectName} · AqarArena` : `أكّد تنبيهات أسعار ${projectName} · AqarArena`,
      text:
        locale === "en"
          ? [`Hi ${name},`, "", `Confirm that you'd like an email whenever ${projectName} changes its prices or payment plans:`, link, "", "If you didn't ask for this, just ignore this email."].join("\n")
          : [`أهلًا ${name}،`, "", `أكّد إنك عايز يوصلك إيميل كل ما ${projectName} يغيّر أسعاره أو خطط السداد:`, link, "", "لو مش انت اللي طلبت ده، تجاهل الإيميل."].join("\n"),
    }),
  );
  return { ok: true, message: t.sent };
}

/** Confirms the address behind a token. */
export async function confirmAlert(data: FormData) {
  const token = String(data.get("token") ?? "");
  const locale = data.get("locale") === "en" ? "en" : "ar";
  await db.priceAlert.updateMany({ where: { token, confirmedAt: null }, data: { confirmedAt: new Date() } });
  redirect(`/${locale}/alerts/${encodeURIComponent(token)}`);
}

/** Stops the alerts and forgets the subscriber. */
export async function unsubscribeAlert(data: FormData) {
  const token = String(data.get("token") ?? "");
  const locale = data.get("locale") === "en" ? "en" : "ar";
  await db.priceAlert.deleteMany({ where: { token } });
  redirect(`/${locale}/alerts/${encodeURIComponent(token)}?bye=1`);
}
