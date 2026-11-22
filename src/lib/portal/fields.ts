import { CHOICES, type Choice } from "@/lib/admin/import/columns";
import { options } from "@/lib/admin/labels";
import { SCHEDULE_HINT } from "@/lib/catalog/plan-steps";

// The fields a developer fills in the portal, with their Arabic labels. Used by the portal
// editor (to draw the form) and by the admin review page (to label the differences).
// Field keys are the same names the admin forms use, so lib/admin/readers.ts can check them.

export type FieldType = "text" | "textarea" | "number" | "date" | "url" | "image" | "choice" | "choices" | "area" | "schedule";

export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  choices?: Choice[];
  hint?: string;
  dir?: "ltr";
  /** Grid columns on wide screens (out of 4). */
  span?: 1 | 2 | 4;
};

export const PROJECT_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "البيانات الأساسية",
    fields: [
      { key: "nameAr", label: "اسم المشروع بالعربية", type: "text", required: true, span: 2 },
      { key: "nameEn", label: "اسم المشروع بالإنجليزية", type: "text", required: true, dir: "ltr", span: 2 },
      { key: "areaId", label: "المنطقة", type: "area", required: true },
      { key: "districtAr", label: "الحي بالعربية", type: "text" },
      { key: "districtEn", label: "الحي بالإنجليزية", type: "text", dir: "ltr" },
      { key: "categories", label: "أنواع المساحات", type: "choices", choices: CHOICES.categories, span: 4 },
      { key: "descriptionAr", label: "الوصف بالعربية", type: "textarea", span: 2 },
      { key: "descriptionEn", label: "الوصف بالإنجليزية", type: "textarea", dir: "ltr", span: 2 },
    ],
  },
  {
    title: "الحالة والمواعيد",
    fields: [
      { key: "status", label: "الحالة", type: "choice", required: true, choices: CHOICES.status },
      { key: "deliveryDate", label: "موعد التسليم", type: "date", required: true },
      { key: "launchDate", label: "تاريخ الإطلاق", type: "date" },
      { key: "progressPct", label: "نسبة الإنشاء %", type: "number" },
      { key: "bookingFee", label: "مبلغ الحجز (بعملة المشروع)", type: "number", hint: "مبلغ جدية الحجز عند الإطلاق" },
      { key: "currency", label: "العملة", type: "choice", required: true, choices: CHOICES.currency, hint: "كل أسعار المشروع بالعملة دي" },
    ],
  },
  {
    title: "المساحة والموقع",
    fields: [
      { key: "landFeddan", label: "مساحة الأرض (فدان)", type: "number" },
      { key: "footprintPct", label: "نسبة المباني %", type: "number", hint: "الباقي مساحات خضراء" },
      { key: "unitsCount", label: "عدد الوحدات", type: "number" },
      { key: "latitude", label: "خط العرض", type: "number", hint: "من خرائط جوجل: كليك يمين على الموقع" },
      { key: "longitude", label: "خط الطول", type: "number" },
      { key: "masterPlanUrl", label: "صورة الماستر بلان", type: "image", span: 4 },
      { key: "amenities", label: "الخدمات", type: "choices", choices: CHOICES.amenities, span: 4 },
    ],
  },
];

export const TYPOLOGY_FIELDS: FieldDef[] = [
  { key: "code", label: "الكود", type: "text", required: true, dir: "ltr", hint: "مثل A-150" },
  { key: "subType", label: "النوع", type: "choice", required: true, choices: CHOICES.subTypes },
  { key: "category", label: "الفئة", type: "choice", required: true, choices: CHOICES.categories },
  { key: "finishing", label: "التشطيب", type: "choice", required: true, choices: CHOICES.finishing },
  { key: "buaM2", label: "المساحة (م²)", type: "number", required: true },
  { key: "priceFrom", label: "السعر يبدأ من (بعملة المشروع)", type: "number", required: true },
  { key: "bedrooms", label: "غرف النوم", type: "number" },
  { key: "bathrooms", label: "الحمامات", type: "number" },
  { key: "gardenM2", label: "حديقة (م²)", type: "number" },
  { key: "roofM2", label: "روف (م²)", type: "number" },
  { key: "nameAr", label: "اسم النموذج بالعربية", type: "text" },
  { key: "nameEn", label: "اسم النموذج بالإنجليزية", type: "text", dir: "ltr" },
];

export const PLAN_FIELDS: FieldDef[] = [
  { key: "downPaymentPct", label: "المقدم %", type: "number", required: true, hint: "مش لازم لو فيه جدول مخصص" },
  { key: "years", label: "عدد السنوات", type: "number", required: true, hint: "0 = كاش، ومش لازم لو فيه جدول مخصص" },
  { key: "frequency", label: "الأقساط", type: "choice", required: true, choices: CHOICES.frequency },
  { key: "steps", label: "جدول سداد مخصص", type: "schedule", dir: "ltr", span: 4, hint: SCHEDULE_HINT },
  { key: "deliveryPaymentPct", label: "دفعة الاستلام %", type: "number" },
  { key: "cashDiscountPct", label: "خصم الكاش %", type: "number" },
  { key: "maintenancePct", label: "وديعة الصيانة %", type: "number" },
  { key: "garageFee", label: "الجراج (بعملة المشروع)", type: "number" },
  { key: "clubFee", label: "النادي (بعملة المشروع)", type: "number" },
  { key: "validUntil", label: "ساري حتى", type: "date" },
  { key: "typologyCode", label: "يخص نموذج", type: "text", dir: "ltr", hint: "كود النموذج، أو فاضي لكل النماذج" },
  { key: "nameAr", label: "اسم النظام بالعربية", type: "text" },
  { key: "nameEn", label: "اسم النظام بالإنجليزية", type: "text", dir: "ltr" },
];

export const DISTANCE_FIELDS: FieldDef[] = [
  { key: "placeAr", label: "المكان بالعربية", type: "text", required: true },
  { key: "placeEn", label: "المكان بالإنجليزية", type: "text", required: true, dir: "ltr" },
  { key: "minutes", label: "المسافة بالسيارة (دقيقة)", type: "number", required: true },
];

export const PROFILE_FIELDS: { title: string; fields: FieldDef[] }[] = [
  {
    title: "بيانات الشركة",
    fields: [
      { key: "nameAr", label: "الاسم بالعربية", type: "text", required: true, span: 2 },
      { key: "nameEn", label: "الاسم بالإنجليزية", type: "text", required: true, dir: "ltr", span: 2 },
      { key: "foundedYear", label: "سنة التأسيس", type: "number" },
      { key: "logoUrl", label: "الشعار", type: "image", span: 4 },
      { key: "aboutAr", label: "نبذة بالعربية", type: "textarea", span: 2 },
      { key: "aboutEn", label: "نبذة بالإنجليزية", type: "textarea", dir: "ltr", span: 2 },
    ],
  },
  {
    title: "أرقام التواصل الرسمية",
    fields: [
      { key: "hotline", label: "الخط الساخن", type: "text", dir: "ltr" },
      { key: "salesPhone", label: "هاتف المبيعات", type: "text", dir: "ltr" },
      { key: "whatsapp", label: "واتساب", type: "text", dir: "ltr" },
      { key: "email", label: "البريد الإلكتروني", type: "text", dir: "ltr" },
      { key: "website", label: "الموقع الإلكتروني", type: "url", span: 2 },
      { key: "hqAddressAr", label: "عنوان المقر بالعربية", type: "text", span: 2 },
      { key: "hqAddressEn", label: "عنوان المقر بالإنجليزية", type: "text", dir: "ltr", span: 2 },
    ],
  },
];

/** Media kinds a developer can upload, with Arabic labels. */
export const PORTAL_MEDIA_KINDS = options.mediaKinds
  .filter((k) => ["IMAGE", "FLOOR_PLAN_2D", "MASTER_PLAN", "LAYOUT_SKETCH", "BROCHURE", "VIDEO"].includes(k.value))
  .map((k) => ({ value: k.value, label: k.label.split(" (")[0] }));
export const PORTAL_PHOTO_GROUPS = options.photoGroups.map((g) => ({ value: g.value, label: g.label.split(" (")[0] }));

export const ALL_PROJECT_FIELDS = PROJECT_FIELDS.flatMap((s) => s.fields);
export const ALL_PROFILE_FIELDS = PROFILE_FIELDS.flatMap((s) => s.fields);
