import type { OfferLanguage } from "./offers";

// Everything the client reads on an offer (the page, the PDF, the share message and the email), in
// both languages. The Arabic is plain and polite: this is what the client sees, not the salesperson.

export const OFFER_COPY = {
  ar: {
    title: "عرض سعر",
    shareTitle: "عرض سعر: {unit}، {project}",
    preparedFor: "مقدم إلى",
    issued: "تاريخ الإصدار",
    validUntil: "ساري حتى",
    validUntilLine: "ساري لحد {date}",
    price: "السعر",
    listPrice: "سعر الوحدة",
    cashDiscount: "خصم الكاش",
    discount: "خصم خاص",
    netPrice: "السعر بعد الخصم",
    downPayment: "المقدم",
    cashPayment: "الدفع كاش",
    installment: "القسط رقم {n}",
    maintenanceOnly: "وديعة الصيانة",
    plan: "خطة السداد",
    customPlan: "جدول سداد مخصص",
    columns: { no: "الدفعة", date: "التاريخ", amount: "المبلغ", pct: "النسبة", cumulative: "النسبة التراكمية", maintenance: "الصيانة", total: "الإجمالي المستحق" },
    totals: "الإجمالي",
    cheques: "{payments} شيك للوحدة · {maintenance} شيك صيانة · {all} شيك في المجموع",
    continued: "جدول السداد (تابع)",
    schedule: "جدول السداد",
    project: { land: "مساحة الأرض", feddan: "{n} فدان", delivery: "التسليم", units: "عدد الوحدات", location: "الموقع" },
    masterPlan: "الماستر بلان",
    zoneMarked: "مكان الوحدة: {zone}",
    zoneUnknown: "مكان الوحدة هيوضّحه فريق المبيعات",
    unit: { title: "الوحدة", type: "النوع", model: "النموذج", floor: "الدور", ground: "أرضي", bedrooms: "غرف النوم", bathrooms: "الحمامات", area: "المساحة", garden: "الحديقة", roof: "الروف", terrace: "التراس", view: "الإطلالة", orientation: "الاتجاه", finishing: "التشطيب", m2: "{n} م²", floorPlan: "مسقط النموذج" },
    contact: { title: "للتواصل", salesperson: "مسؤول المبيعات", phone: "موبايل", whatsapp: "واتساب", email: "البريد الإلكتروني", hotline: "الخط الساخن", website: "الموقع" },
    disclaimer: "الأسعار وخطط السداد في العرض ده سارية لحد التاريخ المكتوب، وبعدها عرضة للتغيير. العرض ده مش عقد ولا بيحجز الوحدة.",
    by: "بواسطة AqarArena",
    print: "طباعة / حفظ PDF",
    download: "تحميل PDF",
    banners: {
      EXPIRED: "العرض ده انتهت صلاحيته. اسأل مسؤول المبيعات عن السعر الحالي.",
      CANCELLED: "العرض ده اتلغى. اسأل مسؤول المبيعات عن عرض جديد.",
      SOLD: "الوحدة دي اتباعت أو اتحجزت. اسأل مسؤول المبيعات عن وحدة تانية.",
    },
    emailSubject: "عرض سعر: {unit}، {project}",
    emailHello: "أهلًا {name}،",
    emailBody: "ده عرض السعر اللي اتكلمنا عليه. تقدر تفتحه من الرابط{attached}:",
    emailAttached: " أو من ملف الـ PDF المرفق",
  },
  en: {
    title: "Price offer",
    shareTitle: "Price offer: {unit}, {project}",
    preparedFor: "Prepared for",
    issued: "Issued",
    validUntil: "Valid until",
    validUntilLine: "Valid until {date}",
    price: "Price",
    listPrice: "Unit price",
    cashDiscount: "Cash discount",
    discount: "Special discount",
    netPrice: "Price after discount",
    downPayment: "Down payment",
    cashPayment: "Cash payment",
    installment: "Installment {n}",
    maintenanceOnly: "Maintenance deposit",
    plan: "Payment plan",
    customPlan: "Custom schedule",
    columns: { no: "Payment", date: "Date", amount: "Amount", pct: "Share", cumulative: "Cumulative", maintenance: "Maintenance", total: "Total due" },
    totals: "Total",
    cheques: "Cheques: {payments} for the unit · {maintenance} for maintenance · {all} in all",
    continued: "Payment schedule (continued)",
    schedule: "Payment schedule",
    project: { land: "Land area", feddan: "{n} feddan", delivery: "Delivery", units: "Units", location: "Location" },
    masterPlan: "Master plan",
    zoneMarked: "The unit is in: {zone}",
    zoneUnknown: "Your sales contact will show you where the unit is",
    unit: { title: "The unit", type: "Type", model: "Model", floor: "Floor", ground: "Ground", bedrooms: "Bedrooms", bathrooms: "Bathrooms", area: "Built-up area", garden: "Garden", roof: "Roof", terrace: "Terrace", view: "View", orientation: "Orientation", finishing: "Finishing", m2: "{n} m²", floorPlan: "Floor plan" },
    contact: { title: "Contact", salesperson: "Sales contact", phone: "Mobile", whatsapp: "WhatsApp", email: "Email", hotline: "Hotline", website: "Website" },
    disclaimer: "Prices and payment plans in this offer hold until the date shown and may change after it. This offer is not a contract and does not reserve the unit.",
    by: "by AqarArena",
    print: "Print / save as PDF",
    download: "Download PDF",
    banners: {
      EXPIRED: "This offer has expired. Ask your sales contact for today's price.",
      CANCELLED: "This offer was cancelled. Ask your sales contact for a new one.",
      SOLD: "This unit has been sold or reserved. Ask your sales contact about another one.",
    },
    emailSubject: "Price offer: {unit}, {project}",
    emailHello: "Hello {name},",
    emailBody: "Here is the price offer we discussed. Open it from the link{attached}:",
    emailAttached: " or the attached PDF",
  },
} satisfies Record<OfferLanguage, unknown>;

export type OfferCopy = (typeof OFFER_COPY)["ar"];

const DATE_LOCALE = { ar: "ar-EG-u-nu-latn", en: "en-GB" } as const;

/** "19 November 2026" / "19 نوفمبر 2026", on Cairo's calendar. */
export const offerDate = (d: Date, language: OfferLanguage) =>
  d.toLocaleDateString(DATE_LOCALE[language], { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" });

/** A schedule date ("2027-02-12") as "12 Feb 2027" / "12 فبراير 2027". */
export const scheduleDate = (iso: string, language: OfferLanguage) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(DATE_LOCALE[language], { day: "numeric", month: language === "ar" ? "long" : "short", year: "numeric", timeZone: "UTC" });
