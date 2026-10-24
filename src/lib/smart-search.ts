// Understands a search typed as a sentence, in Egyptian Arabic or English, e.g.
//   "عايز شقة 3 غرف في التجمع تسليم 2027 مقدم 10% تحت 6 مليون"
//   "3 bed apartment in new cairo, 10% down, under 6M"
// and turns it into the same filters the projects page uses. Runs in the browser
// (live chips as you type) and on the server (the results). No AI service involved.

import type { AreaSlug, PropertyCategory, ProjectStatus, SubType } from "@/lib/property";

export type SmartFilters = {
  q?: string;
  category?: PropertyCategory;
  subTypes?: SubType[];
  areas?: AreaSlug[];
  statuses?: ProjectStatus[];
  deliveryBy?: number;
  maxDownPct?: number;
  minYears?: number;
  minBedrooms?: number;
  maxPrice?: number;
};

/** One understood piece of the sentence, shown as a removable chip. */
export type Chip =
  | { key: "subType"; value: SubType }
  | { key: "category"; value: PropertyCategory }
  | { key: "area"; value: AreaSlug }
  | { key: "ready" }
  | { key: "deliveryBy"; value: number }
  | { key: "maxDownPct"; value: number }
  | { key: "minYears"; value: number }
  | { key: "minBedrooms"; value: number }
  | { key: "maxPrice"; value: number }
  | { key: "q"; value: string };

/** Letters that are written several ways in Arabic are folded to one form before matching. */
export function normalize(input: string) {
  return input
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/٪/g, "%")
    .replace(/[ً-ْـ]/g, "") // diacritics and tatweel
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .replace(/[،,؛;:!?؟()"'«»]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    // "بالتجمع" / "فالساحل" / "والعاصمه" → "التجمع" / "الساحل" / "العاصمه"
    .map((w) => w.replace(/^(?:و|ف|ب|ل|وب|وف|ول)(ال)/, "$1"))
    .join(" ");
}

const SUB_TYPE_WORDS: [SubType, string[]][] = [
  ["PENTHOUSE", ["بنتهاوس", "بنت هاوس", "penthouse", "penthouses"]],
  ["TOWNHOUSE", ["تاون هاوس", "تاونهاوس", "تاون", "townhouse", "townhouses", "town house"]],
  ["TWIN_HOUSE", ["توين هاوس", "توينهاوس", "توين", "twin house", "twin houses", "twinhouse"]],
  ["DUPLEX", ["دوبلكس", "دوبليكس", "duplex", "duplexes"]],
  ["STUDIO", ["استوديو", "ستوديو", "studio", "studios"]],
  ["VILLA", ["فيلا", "فيلات", "فلل", "فيله", "villa", "villas"]],
  ["APARTMENT", ["شقه", "شقق", "apartment", "apartments", "flat", "flats"]],
  ["CLINIC", ["عياده", "عيادات", "clinic", "clinics"]],
  ["OFFICE", ["مكتب", "مكاتب", "office", "offices"]],
  ["RETAIL", ["محل", "محلات", "shop", "shops", "retail", "store"]],
  ["FOOD_AND_BEVERAGE", ["مطعم", "كافيه", "restaurant", "cafe"]],
  ["CHALET", ["شاليه", "شاليهات", "chalet", "chalets"]],
];

const CATEGORY_WORDS: [PropertyCategory, string[]][] = [
  ["COASTAL", ["ساحلي", "مصيف", "صيفي", "coastal", "beach", "summer"]],
  ["MEDICAL", ["طبي", "medical"]],
  ["ADMINISTRATIVE", ["اداري", "administrative", "admin"]],
  ["COMMERCIAL", ["تجاري", "commercial"]],
  ["RESIDENTIAL", ["سكني", "residential"]],
];

const AREA_WORDS: [AreaSlug, string[]][] = [
  ["new-cairo", ["التجمع الخامس", "التجمع", "القاهره الجديده", "new cairo", "fifth settlement", "tagamoa"]],
  ["sheikh-zayed", ["الشيخ زايد", "زايد", "sheikh zayed", "zayed"]],
  ["new-capital", ["العاصمه الاداريه", "العاصمه", "new capital", "administrative capital", "capital"]],
  ["north-coast", ["الساحل الشمالي", "الساحل", "north coast", "sahel"]],
  ["ain-sokhna", ["العين السخنه", "السخنه", "ain sokhna", "sokhna"]],
  ["mostakbal-city", ["مدينه المستقبل", "المستقبل سيتي", "المستقبل", "mostakbal city", "mostakbal", "future city"]],
  ["6th-of-october", ["6 اكتوبر", "سته اكتوبر", "اكتوبر", "6th of october", "october"]],
];

// Words that carry no meaning for the search ("I want", "in", "with", …).
const FILLER = new Set(
  (
    "عايز عاوز عايزه عاوزه محتاج محتاجه نفسي ابحث دور دورلي هات وريني اريد ابغي ابي في فى من على عن مع او و ب بس لو سمحت ممكن " +
    "حاجه يكون تكون فيها فيه اللي الي ده دي بتاع بتاعه وحده واحد واحده جديد جديده كويس كويسه حلو حلوه قريب جنب " +
    "i want need looking for find show me a an the in at on with and or near some please"
  ).split(" "),
);

const wordRe = (phrase: string) => new RegExp(`(^| )${phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?= |$)`);

/** Reads the sentence into filters plus the chips that explain what was understood. */
export function parseSmartQuery(input: string): { filters: SmartFilters; chips: Chip[] } {
  let text = ` ${normalize(input)} `;
  const filters: SmartFilters = {};
  const chips: Chip[] = [];
  const take = (re: RegExp) => {
    const m = text.match(re);
    if (m) text = text.replace(m[0], " ");
    return m;
  };

  // Price ceiling: "تحت 6 مليون", "اقل من 6.5 مليون", "under 6m", "6 مليون"
  const price = take(/(?:(?:اقل من|اقل|تحت|حتي|حتى|لحد|في حدود|بحد اقصي|under|below|max|up to|less than)\s*)?(\d+(?:\.\d+)?)\s*(?:مليون|ملايين|million|mil|m)(?= |$)/);
  if (price) {
    filters.maxPrice = Math.round(Number(price[1]) * 1_000_000);
    chips.push({ key: "maxPrice", value: filters.maxPrice });
  }

  // Down payment: "مقدم 10%", "10% مقدم", "10% down", "down 10"
  const down = take(/(?:مقدم|down(?: payment)?)\s*(\d{1,2})\s*%?|(\d{1,2})\s*%\s*(?:مقدم|down(?: payment)?)/);
  if (down) {
    const n = Number(down[1] ?? down[2]);
    if (n > 0) {
      filters.maxDownPct = n;
      chips.push({ key: "maxDownPct", value: n });
    }
  }

  // Installment term: "تقسيط 10 سنين", "على 8 سنوات", "10 years"
  const years = take(/(?:تقسيط|قسط|اقساط|على|علي|installments?|over)?\s*(\d{1,2})\s*(?:سنين|سنوات|سنه|سنة|years?|yrs?)(?= |$)/);
  if (years) {
    filters.minYears = Number(years[1]);
    chips.push({ key: "minYears", value: filters.minYears });
  }

  // Bedrooms: "3 غرف", "3 اوض", "غرفتين", "3 bed"
  const beds = take(/(\d)\s*(?:غرف|غرفه|اوض|اوضه|نوم|bed(?:room)?s?|br)(?= |$)/);
  const twoBeds = beds ? null : take(/(?:غرفتين|اوضتين|two bed(?:room)?s?)/);
  const bedrooms = beds ? Number(beds[1]) : twoBeds ? 2 : undefined;
  if (bedrooms) {
    filters.minBedrooms = bedrooms;
    chips.push({ key: "minBedrooms", value: bedrooms });
  }

  // Ready to move
  if (take(/(?:استلام فوري|تسليم فوري|جاهز(?:ه)? للاستلام|جاهز(?:ه)?|فوري|ready to move|ready|immediate delivery)/)) {
    filters.statuses = ["READY", "DELIVERED"];
    chips.push({ key: "ready" });
  }

  // Delivery year: "تسليم 2027", "استلام 2028", "by 2027", or a bare year
  const year = take(/(?:تسليم|استلام|delivery|deliver(?:ed)?|by|قبل)?\s*(20[2-4]\d)(?= |$)/);
  if (year) {
    filters.deliveryBy = Number(year[1]);
    chips.push({ key: "deliveryBy", value: filters.deliveryBy });
  }

  for (const [area, words] of AREA_WORDS) {
    if (words.some((w) => wordRe(w).test(text))) {
      words.forEach((w) => (text = text.replace(wordRe(w), " ")));
      (filters.areas ??= []).push(area);
      chips.push({ key: "area", value: area });
    }
  }

  for (const [subType, words] of SUB_TYPE_WORDS) {
    if (words.some((w) => wordRe(w).test(text))) {
      words.forEach((w) => (text = text.replace(wordRe(w), " ")));
      (filters.subTypes ??= []).push(subType);
      chips.push({ key: "subType", value: subType });
    }
  }

  for (const [category, words] of CATEGORY_WORDS) {
    if (!filters.category && words.some((w) => wordRe(w).test(text))) {
      words.forEach((w) => (text = text.replace(wordRe(w), " ")));
      filters.category = category;
      chips.push({ key: "category", value: category });
    }
  }

  // Whatever is left (e.g. a project or developer name) becomes a name search.
  const rest = text
    .split(" ")
    .filter((w) => w && !FILLER.has(w) && !/^(?:مشروع|مشاريع|project|projects|compound|كمبوند)$/.test(w))
    .join(" ")
    .trim();
  // Nothing understood at all (e.g. "مشروع A"): search names with the whole text.
  const nameSearch = rest || (chips.length === 0 ? input.trim() : "");
  if (nameSearch) {
    filters.q = nameSearch;
    chips.push({ key: "q", value: nameSearch });
  }

  return { filters, chips };
}

/** Removing a chip removes its filter. */
export function withoutChip(filters: SmartFilters, chip: Chip): SmartFilters {
  const next: SmartFilters = { ...filters };
  switch (chip.key) {
    case "subType":
      next.subTypes = next.subTypes?.filter((s) => s !== chip.value);
      break;
    case "area":
      next.areas = next.areas?.filter((a) => a !== chip.value);
      break;
    case "ready":
      delete next.statuses;
      break;
    case "category":
      delete next.category;
      break;
    default:
      delete next[chip.key];
  }
  return next;
}

/** Projects-page URL for a set of filters (the same parameters the filter sidebar uses). */
export function filtersToSearchParams(f: SmartFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.category) p.set("category", f.category);
  f.subTypes?.forEach((s) => p.append("type", s));
  f.areas?.forEach((a) => p.append("area", a));
  f.statuses?.forEach((s) => p.append("status", s));
  if (f.deliveryBy) p.set("delivery", String(f.deliveryBy));
  if (f.maxDownPct) p.set("down", String(f.maxDownPct));
  if (f.minYears) p.set("years", String(f.minYears));
  if (f.minBedrooms) p.set("beds", String(f.minBedrooms));
  if (f.maxPrice) p.set("max", String(f.maxPrice));
  return p;
}
