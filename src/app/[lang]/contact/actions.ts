"use server";

import { after } from "next/server";
import { db } from "@/lib/db";
import { notifyAdmin } from "@/lib/email";
import { clientIp, lockedMinutes, recordFailure } from "@/lib/throttle";

export type ContactState = { ok?: boolean; message?: string; errors?: Record<string, string> };

const KINDS = ["SUGGESTION", "COMPLAINT", "HELP", "REQUEST", "OTHER"] as const;
const KIND_AR: Record<(typeof KINDS)[number], string> = { SUGGESTION: "اقتراح", COMPLAINT: "شكوى", HELP: "طلب مساعدة", REQUEST: "طلب", OTHER: "رسالة" };

const TEXT = {
  ar: {
    required: "مطلوب",
    contact: "اكتب بريدك الإلكتروني أو رقم موبايلك عشان نقدر نرد عليك",
    email: "بريد إلكتروني غير صحيح",
    short: "اكتب رسالتك بتفصيل أكتر شوية",
    long: "الرسالة طويلة جدًا",
    fix: "راجع الحقول المظللة",
    busy: (m: number) => `بعتّ رسايل كتير. جرّب تاني بعد ${m} دقيقة.`,
    sent: "وصلتنا رسالتك ✓ هنرد عليك في أقرب وقت، غالبًا خلال يومين عمل.",
  },
  en: {
    required: "Required",
    contact: "Add your email or mobile number so we can reply",
    email: "Invalid email address",
    short: "Please add a little more detail",
    long: "The message is too long",
    fix: "Please check the highlighted fields",
    busy: (m: number) => `Too many messages. Please try again in ${m} minutes.`,
    sent: "Thanks, we got your message ✓ We usually reply within two working days.",
  },
};

/** Saves a message from the contact page and tells the admin by email when email is set up. */
export async function sendContactMessage(_: ContactState, data: FormData): Promise<ContactState> {
  const locale = data.get("locale") === "en" ? "en" : "ar";
  const t = TEXT[locale];
  // Bots fill every field; people never see this one.
  if (String(data.get("company") ?? "")) return { ok: true, message: t.sent };

  const get = (k: string, max: number) => String(data.get(k) ?? "").trim().slice(0, max);
  const kind = (KINDS as readonly string[]).includes(String(data.get("kind"))) ? (String(data.get("kind")) as (typeof KINDS)[number]) : "OTHER";
  const name = get("name", 120);
  const email = get("email", 200);
  const phone = get("phone", 40);
  const message = String(data.get("message") ?? "").trim();

  const errors: Record<string, string> = {};
  if (!name) errors.name = t.required;
  if (!email && !phone) errors.email = t.contact;
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.email = t.email;
  if (message.length < 10) errors.message = t.short;
  if (message.length > 4000) errors.message = t.long;
  if (Object.keys(errors).length) return { ok: false, message: t.fix, errors };

  // At most a few messages per address every 15 minutes.
  const keys = [`contact:${await clientIp()}`];
  const wait = await lockedMinutes(keys);
  if (wait) return { ok: false, message: t.busy(wait) };
  await recordFailure(keys);

  await db.contactMessage.create({ data: { kind, name, email: email || null, phone: phone || null, message, locale } });
  after(() =>
    notifyAdmin(
      `${KIND_AR[kind]} جديد من ${name} · AqarArena`,
      [`النوع: ${KIND_AR[kind]}`, `الاسم: ${name}`, email && `البريد: ${email}`, phone && `الموبايل: ${phone}`, "", message].filter(Boolean) as string[],
      email || undefined,
    ),
  );
  return { ok: true, message: t.sent };
}
