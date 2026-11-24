import ar from "@/app/[lang]/dictionaries/ar.json";
import en from "@/app/[lang]/dictionaries/en.json";
import { formatNumber } from "@/lib/format";
import { isSubType, type SubType } from "@/lib/property";
import { cairoDate } from "@/lib/catalog/schedule";
import { subTypeSingular } from "@/lib/sales/labels";
import { OFFER_COPY, offerDate, type OfferCopy } from "@/lib/sales/offer-copy";
import type { PublicOffer, PublicSnapshot } from "@/lib/sales/offer-service";
import type { OfferLanguage } from "@/lib/sales/offers";

/** One unit's type in English, singular (the site's dictionary names categories, in the plural). */
const SUB_TYPE_EN: Record<SubType, string> = {
  APARTMENT: "Apartment",
  STUDIO: "Studio",
  DUPLEX: "Duplex",
  PENTHOUSE: "Penthouse",
  TOWNHOUSE: "Townhouse",
  TWIN_HOUSE: "Twin house",
  VILLA: "Villa",
  MANSION: "Mansion",
  OFFICE: "Office",
  CLINIC: "Clinic",
  RETAIL: "Shop",
  FOOD_AND_BEVERAGE: "Restaurant or café",
  PHARMACY: "Pharmacy",
  BANK: "Bank",
  CHALET: "Chalet",
  CABIN: "Cabin",
  SERVICED_APARTMENT: "Serviced apartment",
};

type ListName = "finishing" | "unitViews" | "orientations" | "frequency";

/** What every sheet of an offer needs: the snapshot, its language's words, and formatters. */
export type OfferCtx = {
  snap: PublicSnapshot;
  language: OfferLanguage;
  c: OfferCopy;
  /** Western digits in both languages, as on the public site. */
  num: (n: number) => string;
  /** "12.50%". */
  pct: (n: number) => string;
  /** The issue date on Cairo's calendar, "YYYY-MM-DD": the schedule's month 0. */
  issuedIso: string;
  issued: string;
  validUntil: string;
  /** The text in the offer's language, falling back to the other one. */
  pick: (arText: string | null | undefined, enText: string | null | undefined) => string;
  /** A label from the site's dictionary (finishing, views…), or the raw value. */
  label: (list: ListName, value: string | null) => string;
  /** One unit's type, singular. */
  subType: (value: string) => string;
};

export function offerCtx(offer: Pick<PublicOffer, "snap" | "language" | "issuedAt" | "validUntil">): OfferCtx {
  const { snap, language } = offer;
  const dict = language === "ar" ? ar : en;
  const pctFormat = new Intl.NumberFormat(language === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  return {
    snap,
    language,
    c: OFFER_COPY[language],
    num: (n) => formatNumber(n, language),
    pct: (n) => `${pctFormat.format(n)}%`,
    issuedIso: cairoDate(offer.issuedAt),
    issued: offerDate(offer.issuedAt, language),
    validUntil: offerDate(offer.validUntil, language),
    pick: (a, e) => (language === "ar" ? a || e : e || a) ?? "",
    label: (list, value) => (value ? ((dict[list] as Record<string, string>)[value] ?? value) : "—"),
    subType: (value) => (language === "ar" ? subTypeSingular(value) : isSubType(value) ? SUB_TYPE_EN[value] : value),
  };
}
