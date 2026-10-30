import { locales, type Locale } from "@/i18n/config";

/** The public address of the site (set NEXT_PUBLIC_SITE_URL once the domain is live). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://aqararena.vercel.app").replace(/\/$/, "");

/** Canonical link + the same page in every language, for a path without the locale (e.g. "/projects/x"). */
export function pageAlternates(locale: Locale, path = "") {
  return {
    canonical: `/${locale}${path}`,
    languages: Object.fromEntries([...locales.map((l) => [l, `/${l}${path}`]), ["x-default", `/ar${path}`]]),
  };
}
