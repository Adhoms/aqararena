import ar from "@/app/[lang]/dictionaries/ar.json";
import {
  AMENITIES,
  CURRENCIES,
  FINISHING_TYPES,
  INSTALLMENT_FREQUENCIES,
  ORIENTATIONS,
  PROJECT_STATUSES,
  PROPERTY_CATEGORIES,
  SUB_TYPES,
  UNIT_AVAILABILITY,
  UNIT_VIEWS,
} from "@/lib/property";

// The Excel template: one sheet per record type, one column per field. The same list drives
// the downloadable template and the import, so they can't drift apart. `key` is the form field
// name read by lib/admin/readers.ts; `header` is what the admin sees in Excel.

export type Choice = { value: string; label: string };

export type Column = {
  key: string;
  header: string;
  required?: boolean;
  /** How the cell is read. "ref" columns name another record (developer, area, project, unit type). */
  type: "text" | "number" | "date" | "bool" | "choice" | "choices" | "ref" | "url";
  choices?: Choice[];
  /** Short help shown as a note on the header cell and on the instructions sheet. */
  help?: string;
  width?: number;
  /** Older header texts still accepted on import. */
  aliases?: string[];
};

export type SheetDef = { key: SheetKey; name: string; columns: Column[] };
export type SheetKey = "developers" | "projects" | "typologies" | "plans" | "units";

const choices = <T extends string>(list: readonly T[], labels: Partial<Record<T, string>>): Choice[] =>
  list.map((value) => ({ value, label: labels[value] ?? value }));

export const CHOICES = {
  categories: choices(PROPERTY_CATEGORIES, ar.categories),
  subTypes: choices(SUB_TYPES, ar.subTypes),
  finishing: choices(FINISHING_TYPES, ar.finishing),
  status: choices(PROJECT_STATUSES, ar.status),
  frequency: choices(INSTALLMENT_FREQUENCIES, ar.frequency),
  amenities: choices(AMENITIES, ar.amenities),
  availability: choices(UNIT_AVAILABILITY, ar.availability),
  unitViews: choices(UNIT_VIEWS, ar.unitViews),
  orientations: choices(ORIENTATIONS, ar.orientations),
  currency: choices(CURRENCIES, { EGP: "جنيه", USD: "دولار" }),
  yesNo: [
    { value: "on", label: "نعم" },
    { value: "", label: "لا" },
  ],
} satisfies Record<string, Choice[]>;

export const SHEETS: SheetDef[] = [
  {
    key: "developers",
    name: "المطورين",
    columns: [
      { key: "nameAr", header: "الاسم بالعربية", required: true, type: "text", width: 26 },
      { key: "nameEn", header: "الاسم بالإنجليزية", required: true, type: "text", width: 26, help: "يُستخدم للربط مع شيت المشروعات" },
      { key: "slug", header: "الرابط المختصر", type: "text", help: "اختياري. يُنشأ من الاسم الإنجليزي. لو موجود مطور بنفس الرابط تتحدّث بياناته" },
      { key: "hotline", header: "الخط الساخن", type: "text" },
      { key: "salesPhone", header: "هاتف المبيعات", type: "text" },
      { key: "whatsapp", header: "واتساب", type: "text" },
      { key: "website", header: "الموقع الإلكتروني", type: "url", width: 30 },
      { key: "email", header: "البريد الإلكتروني", type: "text", width: 26 },
      { key: "foundedYear", header: "سنة التأسيس", type: "number" },
      { key: "hqAddressAr", header: "عنوان المقر بالعربية", type: "text", width: 30 },
      { key: "hqAddressEn", header: "عنوان المقر بالإنجليزية", type: "text", width: 30 },
      { key: "aboutAr", header: "نبذة بالعربية", type: "text", width: 40 },
      { key: "aboutEn", header: "نبذة بالإنجليزية", type: "text", width: 40 },
      { key: "logoUrl", header: "رابط الشعار", type: "url", width: 30 },
      { key: "verified", header: "أرقام موثّقة", type: "bool", choices: CHOICES.yesNo, help: "نعم = اتأكدت من الأرقام مع المطور" },
    ],
  },
  {
    key: "projects",
    name: "المشروعات",
    columns: [
      { key: "developer", header: "المطور", required: true, type: "ref", width: 24, help: "اسم المطور بالعربي أو الإنجليزي، من شيت المطورين أو الموجود على الموقع" },
      { key: "nameAr", header: "اسم المشروع بالعربية", required: true, type: "text", width: 26 },
      { key: "nameEn", header: "اسم المشروع بالإنجليزية", required: true, type: "text", width: 26, help: "يُستخدم للربط مع شيت النماذج وأنظمة السداد" },
      { key: "slug", header: "الرابط المختصر", type: "text", help: "اختياري. لو موجود مشروع بنفس الرابط تتحدّث بياناته" },
      { key: "area", header: "المنطقة", required: true, type: "ref", width: 20, help: "من القائمة. منطقة جديدة؟ أضفها من لوحة التحكم أولًا" },
      { key: "districtAr", header: "الحي بالعربية", type: "text" },
      { key: "districtEn", header: "الحي بالإنجليزية", type: "text" },
      { key: "status", header: "الحالة", required: true, type: "choice", choices: CHOICES.status },
      { key: "deliveryDate", header: "موعد التسليم", required: true, type: "date", help: "تاريخ (31/12/2028) أو سنة فقط (2028)" },
      { key: "launchDate", header: "تاريخ الإطلاق", type: "date" },
      { key: "categories", header: "أنواع المساحات", type: "choices", choices: CHOICES.categories, width: 24, help: "أكثر من نوع؟ افصل بفاصلة: سكني، تجاري" },
      { key: "bookingFee", header: "مبلغ الحجز (بعملة المشروع)", aliases: ["مبلغ الحجز (جنيه)"], type: "number" },
      { key: "currency", header: "العملة", type: "choice", choices: CHOICES.currency, help: "فاضي = جنيه. كل أسعار المشروع وخططه وعروضه بالعملة دي، ومفيش تحويل" },
      { key: "landFeddan", header: "مساحة الأرض (فدان)", type: "number" },
      { key: "footprintPct", header: "نسبة المباني %", type: "number" },
      { key: "unitsCount", header: "عدد الوحدات", type: "number" },
      { key: "progressPct", header: "نسبة الإنشاء %", type: "number" },
      { key: "latitude", header: "خط العرض", type: "number", help: "من خرائط جوجل: كليك يمين على الموقع" },
      { key: "longitude", header: "خط الطول", type: "number" },
      { key: "amenities", header: "الخدمات", type: "choices", choices: CHOICES.amenities, width: 30, help: "افصل بفاصلة: كلوب هاوس، مدارس، مسجد" },
      { key: "descriptionAr", header: "الوصف بالعربية", type: "text", width: 40 },
      { key: "descriptionEn", header: "الوصف بالإنجليزية", type: "text", width: 40 },
      { key: "masterPlanUrl", header: "رابط صورة الماستر بلان", type: "url", width: 30 },
      { key: "published", header: "منشور", type: "bool", choices: CHOICES.yesNo, help: "نعم = يظهر على الموقع (لازم يكون له نموذج بسعر)" },
      { key: "isFeatured", header: "مميز", type: "bool", choices: CHOICES.yesNo, help: "نعم = يظهر في الصفحة الرئيسية" },
    ],
  },
  {
    key: "typologies",
    name: "النماذج",
    columns: [
      { key: "project", header: "المشروع", required: true, type: "ref", width: 26, help: "اسم المشروع بالإنجليزي أو العربي" },
      { key: "code", header: "الكود", required: true, type: "text", help: "مختلف لكل نموذج في نفس المشروع، مثل A-150" },
      { key: "subType", header: "النوع", required: true, type: "choice", choices: CHOICES.subTypes },
      { key: "category", header: "الفئة", required: true, type: "choice", choices: CHOICES.categories },
      { key: "finishing", header: "التشطيب", required: true, type: "choice", choices: CHOICES.finishing, width: 26 },
      { key: "buaM2", header: "المساحة (م²)", required: true, type: "number" },
      { key: "priceFrom", header: "السعر يبدأ من (بعملة المشروع)", aliases: ["السعر يبدأ من (جنيه)"], required: true, type: "number", width: 20 },
      { key: "bedrooms", header: "غرف النوم", type: "number" },
      { key: "bathrooms", header: "الحمامات", type: "number" },
      { key: "gardenM2", header: "حديقة (م²)", type: "number" },
      { key: "roofM2", header: "روف (م²)", type: "number" },
      { key: "nameAr", header: "اسم النموذج بالعربية", type: "text" },
      { key: "nameEn", header: "اسم النموذج بالإنجليزية", type: "text" },
    ],
  },
  {
    key: "plans",
    name: "أنظمة السداد",
    columns: [
      { key: "project", header: "المشروع", required: true, type: "ref", width: 26 },
      { key: "typology", header: "كود النموذج", type: "ref", help: "اتركه فاضي لو النظام لكل النماذج" },
      { key: "downPaymentPct", header: "المقدم %", required: true, type: "number" },
      { key: "years", header: "عدد السنوات", required: true, type: "number", help: "0 = كاش" },
      { key: "frequency", header: "الأقساط", required: true, type: "choice", choices: CHOICES.frequency },
      { key: "deliveryPaymentPct", header: "دفعة الاستلام %", type: "number" },
      { key: "cashDiscountPct", header: "خصم الكاش %", type: "number" },
      { key: "maintenancePct", header: "وديعة الصيانة %", type: "number" },
      { key: "garageFee", header: "الجراج (بعملة المشروع)", aliases: ["الجراج (جنيه)"], type: "number" },
      { key: "clubFee", header: "النادي (بعملة المشروع)", aliases: ["النادي (جنيه)"], type: "number" },
      { key: "validUntil", header: "ساري حتى", type: "date" },
      { key: "nameAr", header: "اسم النظام بالعربية", type: "text", width: 24 },
      { key: "nameEn", header: "اسم النظام بالإنجليزية", type: "text", width: 24 },
      { key: "isActive", header: "فعّال", type: "bool", choices: CHOICES.yesNo, help: "فاضي = نعم" },
    ],
  },
  {
    key: "units",
    name: "الوحدات",
    columns: [
      { key: "project", header: "المشروع", required: true, type: "ref", width: 26 },
      { key: "typology", header: "كود النموذج", required: true, type: "ref", help: "كود النموذج اللي الوحدة تبعه، من شيت النماذج" },
      { key: "unitNumber", header: "رقم الوحدة", required: true, type: "text", help: "مختلف لكل وحدة في نفس المبنى. الوحدة الموجودة بنفس الرقم والمبنى بتتحدّث" },
      { key: "building", header: "المبنى", type: "text" },
      { key: "floor", header: "الدور", type: "number", help: "0 أو «أرضي» للدور الأرضي" },
      { key: "availability", header: "حالة الوحدة", type: "choice", choices: CHOICES.availability, help: "فاضي = متاحة" },
      { key: "price", header: "سعر الوحدة (بعملة المشروع)", aliases: ["سعر الوحدة (جنيه)"], type: "number", width: 20, help: "اختياري. فاضي = يظهر سعر النموذج بس" },
      { key: "view", header: "الإطلالة", type: "choice", choices: CHOICES.unitViews },
      { key: "orientation", header: "الاتجاه", type: "choice", choices: CHOICES.orientations },
    ],
  },
];

export const sheetByKey = (key: SheetKey) => SHEETS.find((s) => s.key === key)!;

/** Loose form of a name for matching: case, spaces and common Arabic spelling variants ignored. */
export function norm(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[ً-ْـ]/g, "") // diacritics and tatweel
    .replace(/\s+/g, " ");
}

/** Whether a header cell names this column: its header, an older header, or its field key ("*" ignored). */
export const headerMatches = (col: Column, cell: string) => {
  const h = norm(cell.replace(/\*/g, ""));
  return [col.header, ...(col.aliases ?? [])].some((x) => norm(x) === h) || col.key.toLowerCase() === h;
};
