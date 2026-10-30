import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { hasLocale, type Locale } from "@/i18n/config";
import type ar from "./dictionaries/ar.json";

// Arabic is the source of truth: en.json must have exactly the same keys.
export type Dictionary = typeof ar;

const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  ar: () => import("./dictionaries/ar.json").then((m) => m.default),
  en: () => import("./dictionaries/en.json").then((m) => m.default),
};

/** Current locale from the URL; 404s on anything other than ar/en. */
export async function getLocale(): Promise<Locale> {
  // `lang` is undefined under the /admin root layout, which has no locale.
  const locale = await lang();
  if (!locale || !hasLocale(locale)) notFound();
  return locale;
}

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()]();
}
