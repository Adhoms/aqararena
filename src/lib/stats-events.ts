// What visitors do on a project that is counted for the developer's statistics. Shared by the
// browser (which reports an action once per session) and the server (which keeps daily totals).

export const STAT_EVENTS = ["VIEW", "FAVORITE", "COMPARE", "OFFER", "CALL", "WHATSAPP", "WEBSITE", "EMAIL", "BROCHURE", "SHARE"] as const;
export type StatEvent = (typeof STAT_EVENTS)[number];

/** Events the public site no longer records (offer sheets and WhatsApp shares moved to Sales); hidden from the stats screens. */
export const RETIRED_STAT_EVENTS: StatEvent[] = ["OFFER", "SHARE"];
/** What the stats screens list. */
export const SHOWN_STAT_EVENTS = STAT_EVENTS.filter((e) => !RETIRED_STAT_EVENTS.includes(e));

export const isStatEvent = (v: unknown): v is StatEvent => typeof v === "string" && (STAT_EVENTS as readonly string[]).includes(v);

/** Arabic names for the admin and the developer portal. */
export const STAT_LABELS: Record<StatEvent, string> = {
  VIEW: "مشاهدات الصفحة",
  FAVORITE: "إضافة للمفضلة",
  COMPARE: "إضافة للمقارنة",
  OFFER: "فتح ورقة العرض",
  CALL: "ضغطات الاتصال",
  WHATSAPP: "ضغطات واتساب المطور",
  WEBSITE: "زيارة موقع المطور",
  EMAIL: "ضغطات البريد",
  BROCHURE: "تحميل البروشور",
  SHARE: "مشاركة على واتساب",
};

/** Contact actions: what a developer most wants to know. */
export const CONTACT_EVENTS: StatEvent[] = ["CALL", "WHATSAPP", "WEBSITE", "EMAIL"];

/** The value for a `data-track` attribute: "EVENT:slug". */
export const trackAttr = (event: StatEvent, slug: string) => `${event}:${slug}`;

export function parseTrackAttr(value: string | null | undefined): { event: StatEvent; slug: string } | null {
  if (!value) return null;
  const at = value.indexOf(":");
  const event = value.slice(0, at);
  const slug = value.slice(at + 1);
  return at > 0 && isStatEvent(event) && /^[a-z0-9-]{1,80}$/.test(slug) ? { event, slug } : null;
}

export type DayCount = { day: string; event: StatEvent; count: number };
export type PeriodTotals = Record<StatEvent, { now: number; before: number }>;

/**
 * Totals for the last `days` days (ending `today`, inclusive) and the same number of days
 * before that, from daily rows. Days are ISO dates (yyyy-mm-dd).
 */
export function periodTotals(rows: DayCount[], today: string, days: number): PeriodTotals {
  const end = Date.parse(`${today}T00:00:00Z`);
  const dayMs = 86_400_000;
  const startNow = end - (days - 1) * dayMs;
  const startBefore = startNow - days * dayMs;
  const totals = Object.fromEntries(STAT_EVENTS.map((e) => [e, { now: 0, before: 0 }])) as PeriodTotals;
  for (const r of rows) {
    const t = Date.parse(`${r.day}T00:00:00Z`);
    if (t >= startNow && t <= end) totals[r.event].now += r.count;
    else if (t >= startBefore && t < startNow) totals[r.event].before += r.count;
  }
  return totals;
}

/** Change from the earlier period, in whole percent; null when there is nothing to compare with. */
export function changePct({ now, before }: { now: number; before: number }): number | null {
  return before > 0 ? Math.round(((now - before) / before) * 100) : null;
}

/** Crawlers and link previews: never counted. */
export const BOT_PATTERN = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|curl|wget|python|axios|node-fetch/i;
