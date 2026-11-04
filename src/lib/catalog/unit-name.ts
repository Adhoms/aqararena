import type { Locale } from "@/i18n/config";
import { formatNumber } from "@/lib/format";
import type { Typology } from "./types";

/** A unit type's name, or "شقق · 130 م²" when the developer didn't name it. */
export function unitName(t: Pick<Typology, "name" | "subType" | "buaM2">, subTypes: Record<string, string>, locale: Locale) {
  return t.name[locale] || `${subTypes[t.subType] ?? t.subType} · ${formatNumber(t.buaM2, locale)} ${locale === "ar" ? "م²" : "m²"}`;
}
