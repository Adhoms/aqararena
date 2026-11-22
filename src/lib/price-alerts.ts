import "server-only";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { sendEmails, type Mail } from "@/lib/email";
import { SITE_URL } from "@/lib/site";
import { formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/property";

// Price alerts: visitors leave their name and email (phone optional) on a project, confirm by
// email, and hear from us when its prices or payment plans change. "Changed" means the figures
// below differ from the snapshot stored on the project when the last alert went out.

export type PriceSnapshot = {
  /** Cheapest unit, EGP. */
  start: number;
  /** Average price per m² across unit models, EGP. */
  perM2: number;
  /** Lowest down payment on an installment plan, % (100 when cash only). */
  down: number;
  /** Longest installment plan, years. */
  years: number;
  /** Lowest monthly equivalent for the cheapest unit, EGP. */
  monthly: number;
  /** Biggest cash discount, %. */
  cash: number;
};

export const newToken = () => randomBytes(24).toString("base64url");

/** Today's figures for a project, or null when it has no priced units yet. */
export async function priceSnapshot(projectId: string, client: Prisma.TransactionClient | typeof db = db): Promise<PriceSnapshot | null> {
  const [types, plans] = await Promise.all([
    client.typology.findMany({ where: { projectId, priceFrom: { not: null } }, select: { priceFrom: true, buaM2: true } }),
    client.paymentPlan.findMany({ where: { projectId, isActive: true }, select: { downPaymentPct: true, deliveryPaymentPct: true, years: true, cashDiscountPct: true } }),
  ]);
  if (!types.length) return null;
  const prices = types.map((t) => Number(t.priceFrom));
  const start = Math.min(...prices);
  const perM2 = types.map((t) => Number(t.priceFrom) / Number(t.buaM2)).reduce((a, b) => a + b, 0) / types.length;
  const installments = plans.filter((p) => p.years > 0);
  const monthlyFor = (p: (typeof plans)[number]) => (start * (100 - Number(p.downPaymentPct) - Number(p.deliveryPaymentPct))) / 100 / (p.years * 12);
  return {
    start: Math.round(start),
    perM2: Math.round(perM2 / 50) * 50,
    down: installments.length ? Math.min(...installments.map((p) => Number(p.downPaymentPct))) : 100,
    years: installments.length ? Math.max(...installments.map((p) => p.years)) : 0,
    monthly: installments.length ? Math.round(Math.min(...installments.map(monthlyFor)) / 100) * 100 : 0,
    cash: Math.max(0, ...plans.map((p) => Number(p.cashDiscountPct ?? 0))),
  };
}

const KEYS = ["start", "perM2", "down", "years", "monthly", "cash"] as const;

function asSnapshot(value: unknown): PriceSnapshot | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  return KEYS.every((k) => typeof v[k] === "number") ? (v as PriceSnapshot) : null;
}

/** Figures that moved between two snapshots. */
export function priceChanges(before: PriceSnapshot | null, now: PriceSnapshot | null) {
  if (!before || !now) return [];
  return KEYS.filter((k) => before[k] !== now[k]).map((key) => ({ key, from: before[key], to: now[key] }));
}

/** Stores today's figures as the starting point, if the project has none yet. */
export async function ensureSnapshot(projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId }, select: { alertSnapshot: true } });
  if (project && !asSnapshot(project.alertSnapshot)) {
    const now = await priceSnapshot(projectId);
    if (now) await db.project.update({ where: { id: projectId }, data: { alertSnapshot: now } });
  }
}

/** What changed since the last alert and how many confirmed subscribers would hear about it. */
export async function pendingAlert(projectId: string) {
  const [project, now, subscribers] = await Promise.all([
    db.project.findUnique({ where: { id: projectId }, select: { alertSnapshot: true } }),
    priceSnapshot(projectId),
    db.priceAlert.count({ where: { projectId, confirmedAt: { not: null } } }),
  ]);
  return { changes: priceChanges(asSnapshot(project?.alertSnapshot), now), subscribers, now };
}

const LABELS = {
  ar: { start: "الأسعار تبدأ من", perM2: "متوسط سعر المتر", down: "أقل مقدم", years: "أطول مدة تقسيط", monthly: "أقل قسط شهري", cash: "خصم الكاش" },
  en: { start: "Prices from", perM2: "Average price per m²", down: "Lowest down payment", years: "Longest installment plan", monthly: "Lowest monthly installment", cash: "Cash discount" },
} as const;

function show(key: (typeof KEYS)[number], value: number, locale: "ar" | "en", currency: Currency) {
  if (key === "down" || key === "cash") return `${value}%`;
  if (key === "years") return locale === "ar" ? `${value} سنين` : `${value} years`;
  return value ? formatMoney(value, locale, currency) : "-";
}

export const alertLink = (locale: string, token: string, off = false) => `${SITE_URL}/${locale === "en" ? "en" : "ar"}/alerts/${token}${off ? "?off=1" : ""}`;

/**
 * Emails every confirmed subscriber when the figures moved since the last alert, then stores the
 * new figures. Returns how many emails went out. Does nothing for unpublished projects.
 */
export async function sendPriceAlerts(projectId: string): Promise<number> {
  const project = await db.project.findUnique({ where: { id: projectId }, select: { slug: true, nameAr: true, nameEn: true, currency: true, published: true, alertSnapshot: true } });
  if (!project) return 0;
  const now = await priceSnapshot(projectId);
  if (!now) return 0;
  const before = asSnapshot(project.alertSnapshot);
  const changes = priceChanges(before, now);
  // First time: just remember today's figures.
  if (!before || !changes.length || !project.published) {
    if (!before) await db.project.update({ where: { id: projectId }, data: { alertSnapshot: now } });
    return 0;
  }

  const subscribers = await db.priceAlert.findMany({ where: { projectId, confirmedAt: { not: null } } });
  const mails: Mail[] = subscribers.map((s) => {
    const locale = s.locale === "en" ? "en" : "ar";
    const name = locale === "en" ? project.nameEn : project.nameAr;
    const lines = changes.map((c) => `${LABELS[locale][c.key]}: ${show(c.key, c.from, locale, project.currency)} ← ${show(c.key, c.to, locale, project.currency)}`);
    const page = `${SITE_URL}/${locale}/projects/${project.slug}#prices`;
    const off = alertLink(locale, s.token, true);
    const text =
      locale === "en"
        ? [`Hi ${s.name},`, "", `${name} has updated its prices or payment plans:`, "", ...lines.map((l) => l.replace(" ← ", " → ")), "", `See the details: ${page}`, "", `Stop these alerts: ${off}`].join("\n")
        : [`أهلًا ${s.name}،`, "", `${name} حدّث الأسعار أو خطط السداد:`, "", ...lines, "", `شوف التفاصيل: ${page}`, "", `لإيقاف التنبيهات: ${off}`].join("\n");
    return {
      to: s.email,
      subject: locale === "en" ? `Price update: ${name} · AqarArena` : `تحديث أسعار ${name} · AqarArena`,
      text,
      headers: { "List-Unsubscribe": `<${off}>` },
    };
  });

  const sent = await sendEmails(mails);
  // Keep the old figures when sending failed, so the next try still reports the change.
  if (sent || !mails.length) await db.project.update({ where: { id: projectId }, data: { alertSnapshot: now } });
  if (sent) await db.priceAlert.updateMany({ where: { projectId, confirmedAt: { not: null } }, data: { lastSentAt: new Date() } });
  return sent;
}
