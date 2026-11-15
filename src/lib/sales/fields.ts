import type { FormReader } from "@/lib/admin/form";

// A salesperson's details as typed in the portal ("فريق المبيعات") or on their own profile page.
// The names and numbers here are printed on their offers, so the phone must be dialable.

export const SALES_ROLES = ["AGENT", "LEAD"] as const;
export type SalesRoleValue = (typeof SALES_ROLES)[number];

const ARABIC_INDIC = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN = "۰۱۲۳۴۵۶۷۸۹";

/** Converts Arabic-Indic and Persian digits to 0-9, turns ( ) . into spaces, collapses spaces. */
export function normalizePhone(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(PERSIAN.indexOf(d)))
    .replace(/[().]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const isDialable = (n: string) => /^\+?[\d\s-]+$/.test(n) && n.replace(/\D/g, "").length >= 8 && n.replace(/\D/g, "").length <= 15;

/** Normalises a phone field, records `message` on `name` when it is not dialable, and returns the normalised value. */
function readPhone(f: FormReader, name: "phone" | "whatsapp", raw: string | null, message: string): string | null {
  if (raw === null) return null;
  const n = normalizePhone(raw);
  if (!isDialable(n)) f.errors[name] ??= message;
  return n;
}

/** Name, phones and email of a salesperson. Used by the portal's sales team page and the salesperson's own profile. */
export function readSalesPerson(f: FormReader) {
  const phone = readPhone(f, "phone", f.text("phone", { required: true, max: 40 }), "اكتب رقم موبايل كامل");
  const whatsapp = readPhone(f, "whatsapp", f.text("whatsapp", { max: 40 }), "اكتب رقم واتساب كامل");
  const email = f.text("email", { max: 200 });
  if (email && !/^\S+@\S+\.\S+$/.test(email)) f.errors.email ??= "بريد إلكتروني غير صالح";
  return {
    nameAr: f.requiredText("nameAr", 100),
    nameEn: f.text("nameEn", { max: 100 }),
    phone: phone ?? "",
    whatsapp,
    email,
  };
}

/** A salesperson's role. Used only in the portal, where the company's account sets roles. */
export function readSalesRole(f: FormReader): SalesRoleValue {
  return f.oneOf("role", SALES_ROLES, { required: true }) ?? "AGENT";
}

export const ROLE_LABELS: Record<SalesRoleValue, string> = { AGENT: "سيلز", LEAD: "قائد فريق" };
