import type { Schedule } from "@/lib/catalog/schedule";
import type { Currency, InstallmentFrequency } from "@/lib/property";

// Everything an offer prints, as of issue (spec 7: "the offer keeps its numbers"). Stored as JSON on
// SalesOffer.snapshot; /o/[token], the PDF, the share message and the email read only this. Dates of
// the schedule are not stored: they follow the offer's issue date (an approval re-issues it).

export const SNAPSHOT_VERSION = 1;

export type ZoneBoxSnapshot = { x: number; y: number; w: number; h: number; nameAr: string; nameEn: string };

export type OfferSnapshot = {
  v: typeof SNAPSHOT_VERSION;
  currency: Currency;
  validityDays: number;
  developer: { nameAr: string; nameEn: string; logoUrl: string | null; hotline: string | null; website: string | null };
  project: {
    id: string;
    slug: string;
    nameAr: string;
    nameEn: string;
    descriptionAr: string | null;
    descriptionEn: string | null;
    placeAr: string;
    placeEn: string;
    /** "YYYY-MM-DD". */
    deliveryDate: string;
    landFeddan: number | null;
    unitsCount: number | null;
    photo: string | null;
    masterPlan: string | null;
    zone: ZoneBoxSnapshot | null;
  };
  unit: {
    id: string;
    /** Building, then number: "B1 · 101". */
    label: string;
    floor: number | null;
    view: string | null;
    orientation: string | null;
    typeCode: string;
    typeNameAr: string | null;
    typeNameEn: string | null;
    subType: string;
    finishing: string;
    buaM2: number;
    gardenM2: number | null;
    roofM2: number | null;
    terraceM2: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    floorPlan: string | null;
  };
  plan: {
    nameAr: string | null;
    nameEn: string | null;
    frequency: InstallmentFrequency;
    years: number;
    cash: boolean;
    custom: boolean;
    cashDiscountPct: number | null;
    maintenancePct: number | null;
    /** catalog/schedule.ts planFingerprint: compared with the current plans for «السعر اتغيّر». */
    fingerprint: string;
  };
  /** The unit's price at issue, whole; the offer's discount; the price the schedule is paid on. */
  listPrice: number;
  discountPct: number;
  price: number;
  schedule: Schedule;
  client: { name: string; phone: string | null };
  salesperson: { nameAr: string; nameEn: string | null; phone: string; whatsapp: string | null; email: string | null };
};

/** A stored snapshot, or null when it isn't one this code can read. */
export function asSnapshot(json: unknown): OfferSnapshot | null {
  if (!json || typeof json !== "object") return null;
  const s = json as Partial<OfferSnapshot>;
  if (s.v !== SNAPSHOT_VERSION || typeof s.listPrice !== "number" || typeof s.price !== "number") return null;
  if (!s.schedule || !Array.isArray(s.schedule.rows) || !s.plan || typeof s.plan.fingerprint !== "string") return null;
  return s as OfferSnapshot;
}
