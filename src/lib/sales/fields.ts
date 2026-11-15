import type { FormReader } from "@/lib/admin/form";

// A salesperson's details as typed in the portal ("فريق المبيعات") or on their own profile page.
// The names and numbers here are printed on their offers, so the phone must be dialable.

export const SALES_ROLES = ["AGENT", "LEAD"] as const;
export type SalesRoleValue = (typeof SALES_ROLES)[number];

const digits = (s: string | null) => (s ?? "").replace(/\D/g, "").length;

export function readSalesPerson(f: FormReader) {
  const phone = f.text("phone", { required: true, max: 40 });
  if (phone && digits(phone) < 8) f.errors.phone = "اكتب رقم موبايل كامل";
  const whatsapp = f.text("whatsapp", { max: 40 });
  if (whatsapp && digits(whatsapp) < 8) f.errors.whatsapp = "اكتب رقم واتساب كامل";
  const email = f.text("email", { max: 200 });
  if (email && !/^\S+@\S+\.\S+$/.test(email)) f.errors.email = "بريد إلكتروني غير صالح";
  const rawRole = String(f.text("role") ?? "");
  const role: SalesRoleValue = (SALES_ROLES as readonly string[]).includes(rawRole) ? (rawRole as SalesRoleValue) : "AGENT";
  return {
    nameAr: f.requiredText("nameAr", 100),
    nameEn: f.text("nameEn", { max: 100 }),
    phone: phone ?? "",
    whatsapp,
    email,
    role,
  };
}

export const ROLE_LABELS: Record<SalesRoleValue, string> = { AGENT: "سيلز", LEAD: "قائد فريق" };
