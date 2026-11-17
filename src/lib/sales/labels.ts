// src/lib/sales/labels.ts
import ar from "@/app/[lang]/dictionaries/ar.json";
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
export const finishingLabel = (v: string | null | undefined) => fromDict(ar.finishing, v);

const RELEASED: Record<HoldReleaseReasonValue, string> = {
  EXPIRED: "خلص وقته من غير تأكيد",
  CANCELLED: "اتلغى",
  PORTAL_STATUS_CHANGE: "اتلغى: الشركة غيّرت حالة الوحدة",
  ADMIN_STATUS_CHANGE: "اتلغى: AqarArena غيّرت حالة الوحدة",
};

/** How a hold ended, for the holds list. */
export function holdOutcome(h: { status: HoldStatusValue; releaseReason: HoldReleaseReasonValue | null }): string {
  if (h.status === "CONVERTED") return "اتأكد: الوحدة بقت محجوزة";
  if (h.status === "RELEASED") return h.releaseReason ? RELEASED[h.releaseReason] : "اتلغى";
  return "سارية";
}
