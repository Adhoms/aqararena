import type { Locale } from "@/i18n/config";
import type { Text } from "@/lib/catalog/types";
import type { Currency } from "@/lib/property";

// Western digits in both languages, matching how prices are written in Egypt's market.
const numberLocale = (locale: Locale) => (locale === "ar" ? "ar-EG-u-nu-latn" : "en-EG");

export const pick = (text: Text, locale: Locale) => text[locale];

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(numberLocale(locale), { maximumFractionDigits: 0 }).format(value);
}

/** The currency's name in Arabic form labels: "جنيه" or "دولار". */
export const CURRENCY_NAMES_AR: Record<Currency, string> = { EGP: "جنيه", USD: "دولار" };

/** The sign of an amount on the Arabic screens: "ج.م" after the figure, "$" before it. */
export const currencyAr = (currency: Currency) => (currency === "USD" ? "$" : "ج.م");

// A left-to-right mark keeps "$250,000" in one piece, sign first, inside an Arabic line.
const LRM = "\u200E";

/**
 * An amount, Western digits in both languages: "4,850,000 ج.م" / "EGP 4,850,000" in pounds, "$250,000" in
 * dollars (the sign before the figure in Arabic too, as dollar prices are written).
 */
export function formatMoney(value: number, locale: Locale, currency: Currency) {
  const n = formatNumber(value, locale);
  if (currency === "USD") return locale === "ar" ? `${LRM}$${n}` : `$${n}`;
  return locale === "ar" ? `${n} ج.م` : `EGP ${n}`;
}

/** "4.85 مليون" / "EGP 4.85M" for cards; dollars say so: "$1.20 مليون" / "$1.20M". */
export function formatMillions(value: number, locale: Locale, currency: Currency) {
  const m = new Intl.NumberFormat(numberLocale(locale), { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(
    value / 1_000_000,
  );
  if (currency === "USD") return locale === "ar" ? `${LRM}$${m} مليون` : `$${m}M`;
  return locale === "ar" ? `${m} مليون` : `EGP ${m}M`;
}

/**
 * Pounds in millions, the currency named in Arabic too ("4.85 مليون ج.م" / "EGP 4.85M"): for market figures
 * that count only the projects priced in pounds, shown beside projects in other currencies.
 */
export function formatMillionsEgp(value: number, locale: Locale) {
  const m = formatMillions(value, locale, "EGP");
  return locale === "ar" ? `${m} ج.م` : m;
}

/**
 * An amount on the Arabic admin and portal screens: pounds in Arabic digits like the rest of those screens
 * ("٤٬٨٥٠٬٠٠٠ ج.م"), dollars the way they are written ("$250,000").
 */
export function moneyAr(value: number, currency: Currency) {
  return currency === "USD" ? formatMoney(value, "ar", "USD") : `${value.toLocaleString("ar-EG")} ج.م`;
}

/** A count on the Arabic admin, portal and Sales screens, in Arabic digits: "١٢٣". */
export function formatCountAr(n: number) {
  return n.toLocaleString("ar-EG");
}

/** An Arabic noun's forms for counting: one, two (dual), and 3 to 10 (plural). */
export type CountNoun = { one: string; two: string; few: string };
export const HOURS_NOUN: CountNoun = { one: "ساعة", two: "ساعتين", few: "ساعات" };
export const UNITS_NOUN: CountNoun = { one: "وحدة", two: "وحدتين", few: "وحدات" };
export const HOLDS_NOUN: CountNoun = { one: "حجز", two: "حجزين", few: "حجوزات" };
export const OFFERS_NOUN: CountNoun = { one: "عرض", two: "عرضين", few: "عروض" };

/**
 * A number with its noun, by the Arabic rule: 1 alone ("ساعة"), 2 as the dual ("ساعتين"), 3 to 10
 * with the plural ("٣ ساعات"), 11 and up with the singular ("١١ ساعة"). Past 100 the last two digits
 * decide ("١٠٣ ساعات", "١٠٢ ساعة"); 0 takes the singular too.
 */
export function countAr(n: number, noun: CountNoun) {
  if (n === 1) return noun.one;
  if (n === 2) return noun.two;
  const lastTwo = n % 100;
  return `${formatCountAr(n)} ${lastTwo >= 3 && lastTwo <= 10 ? noun.few : noun.one}`;
}

/** A date for the Arabic admin, portal and Sales screens, on Cairo's calendar (servers run on UTC). */
export function formatDateAr(date: Date, month: "short" | "long" = "short") {
  return date.toLocaleDateString("ar-EG", { day: "numeric", month, year: "numeric", timeZone: "Africa/Cairo" });
}

/** A day and time for the Sales and portal screens (when a hold ends), on Cairo's clock. */
export function formatDateTimeAr(date: Date) {
  return date.toLocaleString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Cairo",
  });
}

/** A link target for a phone number, or undefined while the number is still a placeholder like "[19XXX]". */
export function telHref(phone: string | undefined) {
  if (!phone || !/^\+?[\d\s-]+$/.test(phone)) return undefined;
  return `tel:${phone.replace(/[\s-]/g, "")}`;
}

export function whatsappHref(phone: string | undefined) {
  const tel = telHref(phone);
  return tel ? `https://wa.me/${tel.replace(/\D/g, "")}` : undefined;
}

export function websiteHref(site: string | undefined) {
  if (!site || site.startsWith("[")) return undefined;
  return site.startsWith("http") ? site : `https://${site}`;
}

/** Fills "{n} مشروع" style templates from the dictionaries. */
export function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}
