import ar from "@/app/[lang]/dictionaries/ar.json";
import {
  AMENITIES,
  FINISHING_TYPES,
  INSTALLMENT_FREQUENCIES,
  ORIENTATIONS,
  PHOTO_GROUPS,
  PROJECT_STATUSES,
  PROPERTY_CATEGORIES,
  SUB_TYPES,
  UNIT_AVAILABILITY,
  UNIT_VIEWS,
  ZONE_KINDS,
} from "@/lib/property";

// Arabic labels for the admin dropdowns, reusing the public site's dictionary where it has them.

const opts = <T extends string>(list: readonly T[], labels: Partial<Record<T, string>>) =>
  list.map((value) => ({ value, label: labels[value] ? `${labels[value]} (${value})` : value }));

export const MEDIA_KINDS = ["IMAGE", "BROCHURE", "MASTER_PLAN", "VIDEO", "VIRTUAL_TOUR", "FLOOR_PLAN_2D", "LAYOUT_SKETCH", "MODEL_3D"] as const;
export type MediaKindValue = (typeof MEDIA_KINDS)[number];

export const options = {
  categories: opts(PROPERTY_CATEGORIES, ar.categories),
  subTypes: opts(SUB_TYPES, ar.subTypes),
  finishing: opts(FINISHING_TYPES, ar.finishing),
  status: opts(PROJECT_STATUSES, ar.status),
  frequency: opts(INSTALLMENT_FREQUENCIES, ar.frequency),
  amenities: AMENITIES.map((value) => ({ value, label: ar.amenities[value] ?? value })),
  photoGroups: opts(PHOTO_GROUPS, ar.photoGroups),
  availability: UNIT_AVAILABILITY.map((value) => ({ value, label: ar.availability[value] })),
  unitViews: UNIT_VIEWS.map((value) => ({ value, label: ar.unitViews[value] })),
  orientations: ORIENTATIONS.map((value) => ({ value, label: ar.orientations[value] })),
  zoneKinds: opts(ZONE_KINDS, {
    RESIDENTIAL: "سكني",
    VILLAS: "فيلات",
    GREEN: "مساحات خضراء",
    AMENITY: "خدمات",
    COMMERCIAL: "تجاري",
    ADMINISTRATIVE: "إداري",
  }),
  mediaKinds: opts(MEDIA_KINDS, {
    IMAGE: "صورة",
    BROCHURE: "بروشور PDF",
    MASTER_PLAN: "ماستر بلان",
    VIDEO: "فيديو",
    VIRTUAL_TOUR: "جولة افتراضية",
    FLOOR_PLAN_2D: "مسقط أفقي",
    LAYOUT_SKETCH: "رسم توزيع",
    MODEL_3D: "نموذج ثلاثي الأبعاد",
  }),
};

export const statusLabel = (s: string) => (ar.status as Record<string, string>)[s] ?? s;
