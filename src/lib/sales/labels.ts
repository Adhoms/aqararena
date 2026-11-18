import ar from "@/app/[lang]/dictionaries/ar.json";
import { UNITS_NOUN, countAr, formatDateTimeAr } from "@/lib/format";
import type { HoldReleaseReasonValue, HoldStatusValue, SalesState } from "./holds";

// Arabic wording for the Sales screens, reusing the public site's dictionary where it has it.

export const STATE_LABELS: Record<SalesState, string> = {
  AVAILABLE: ar.availability.AVAILABLE,
  HELD: "محجوزة مؤقتًا",
  RESERVED: ar.availability.RESERVED,
  SOLD: ar.availability.SOLD,
};

export const unitLabel = (u: { building: string | null; unitNumber: string | null }) =>
  [u.building, u.unitNumber].filter(Boolean).join(" · ") || "وحدة بدون رقم";

export const floorLabel = (floor: number | null) => (floor === null ? "—" : floor === 0 ? "أرضي" : floor < 0 ? "بدروم" : String(floor));

const fromDict = (map: Record<string, string>, key: string | null | undefined) => (key ? (map[key] ?? key) : "—");
export const viewLabel = (v: string | null | undefined) => fromDict(ar.unitViews, v);
export const orientationLabel = (v: string | null | undefined) => fromDict(ar.orientations, v);
export const subTypeLabel = (v: string | null | undefined) => fromDict(ar.subTypes, v);
/** One unit's type, singular (the plural `subTypeLabel` names a category, for the filter). */
const SUB_TYPE_SINGULAR: Record<string, string> = {
  APARTMENT: "شقة",
  STUDIO: "استوديو",
  DUPLEX: "دوبلكس",
  PENTHOUSE: "بنتهاوس",
  TOWNHOUSE: "تاون هاوس",
  TWIN_HOUSE: "توين هاوس",
  VILLA: "فيلا",
  MANSION: "قصر",
  OFFICE: "مكتب",
  CLINIC: "عيادة",
  RETAIL: "محل",
  FOOD_AND_BEVERAGE: "مطعم أو كافيه",
  PHARMACY: "صيدلية",
  BANK: "بنك",
  CHALET: "شاليه",
  CABIN: "كابينة",
  SERVICED_APARTMENT: "شقة فندقية",
};
export const subTypeSingular = (v: string | null | undefined) => (v ? (SUB_TYPE_SINGULAR[v] ?? v) : "—");
export const finishingLabel = (v: string | null | undefined) => fromDict(ar.finishing, v);

const RELEASED: Record<HoldReleaseReasonValue, string> = {
  EXPIRED: "خلص وقته من غير تأكيد",
  CANCELLED: "اتلغى",
  PORTAL_STATUS_CHANGE: "اتلغى: الشركة غيّرت حالة الوحدة",
  ADMIN_STATUS_CHANGE: "اتلغى: AqarArena غيّرت حالة الوحدة",
  OUT_OF_SALES: "اتلغى: الوحدة مبقتش معروضة لفريق المبيعات",
  ACCOUNT_DISABLED: "اتلغى: الحساب اتوقف",
};

/** How a hold ended, for the holds list. */
export function holdOutcome(h: { status: HoldStatusValue; releaseReason: HoldReleaseReasonValue | null }): string {
  if (h.status === "CONVERTED") return "اتأكد: الوحدة بقت محجوزة";
  if (h.status === "RELEASED") return h.releaseReason ? RELEASED[h.releaseReason] : "اتلغى";
  return "ساري";
}

/** A live hold as the admin and portal unit pages show it: who holds the unit, and until when. */
export type HoldBadge = { expiresAt: Date; salesAccount: { nameAr: string } };
export const holdText = (hold: HoldBadge | undefined) => hold && `${hold.salesAccount.nameAr} لحد ${formatDateTimeAr(hold.expiresAt)}`;

/** An import's warning before saving, when the file takes held units out of Sales (or off the market). */
export const holdsLeavingWarning = (units: number) =>
  units ? `الملف ده هيخرّج من البيع ${countAr(units, UNITS_NOUN)} عليها حجز مؤقت لفريق المبيعات، والحجز هيتلغي.` : undefined;
