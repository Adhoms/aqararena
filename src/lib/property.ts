// Lookup lists shared by pages and data. They mirror the enums in prisma/schema.prisma;
// the visible labels live in the dictionaries (ar.json / en.json).

export const PROPERTY_CATEGORIES = [
  "RESIDENTIAL",
  "COMMERCIAL",
  "ADMINISTRATIVE",
  "MEDICAL",
  "COASTAL",
] as const;
export type PropertyCategory = (typeof PROPERTY_CATEGORIES)[number];

export const SUB_TYPES = [
  "APARTMENT",
  "STUDIO",
  "DUPLEX",
  "PENTHOUSE",
  "TOWNHOUSE",
  "TWIN_HOUSE",
  "VILLA",
  "MANSION",
  "OFFICE",
  "CLINIC",
  "RETAIL",
  "FOOD_AND_BEVERAGE",
  "PHARMACY",
  "BANK",
  "CHALET",
  "CABIN",
  "SERVICED_APARTMENT",
] as const;
export type SubType = (typeof SUB_TYPES)[number];

export const FINISHING_TYPES = [
  "CORE_AND_SHELL",
  "SEMI_FINISHED",
  "FULLY_FINISHED",
  "FULLY_FINISHED_WITH_AC",
  "FURNISHED",
] as const;
export type Finishing = (typeof FINISHING_TYPES)[number];

export const PROJECT_STATUSES = ["LAUNCH", "UNDER_CONSTRUCTION", "READY", "DELIVERED"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const ZONE_KINDS = ["RESIDENTIAL", "VILLAS", "GREEN", "AMENITY", "COMMERCIAL", "ADMINISTRATIVE"] as const;
export type ZoneKind = (typeof ZONE_KINDS)[number];

export const INSTALLMENT_FREQUENCIES = ["MONTHLY", "QUARTERLY", "SEMI_ANNUAL", "ANNUAL"] as const;
export type InstallmentFrequency = (typeof INSTALLMENT_FREQUENCIES)[number];

export const PHOTO_GROUPS = ["EXTERIOR", "INTERIOR", "CONSTRUCTION"] as const;
export type PhotoGroup = (typeof PHOTO_GROUPS)[number];

export const AMENITIES = [
  "clubhouse",
  "lake",
  "lagoon",
  "beach",
  "underground_parking",
  "security",
  "mall",
  "school",
  "medical",
  "gym",
  "running_track",
  "kids_area",
  "mosque",
  "hotel",
] as const;
export type Amenity = (typeof AMENITIES)[number];

// Starter list of areas until they come from the database (Area table).
export const AREA_SLUGS = [
  "new-cairo",
  "sheikh-zayed",
  "new-capital",
  "north-coast",
  "ain-sokhna",
  "mostakbal-city",
  "6th-of-october",
] as const;
export type AreaSlug = (typeof AREA_SLUGS)[number];

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

export const isPropertyCategory = (v: unknown): v is PropertyCategory => isOneOf(PROPERTY_CATEGORIES, v);
export const isAreaSlug = (v: unknown): v is AreaSlug => isOneOf(AREA_SLUGS, v);
export const isProjectStatus = (v: unknown): v is ProjectStatus => isOneOf(PROJECT_STATUSES, v);

/** How many installments a plan has in a year. */
export const INSTALLMENTS_PER_YEAR: Record<InstallmentFrequency, number> = {
  MONTHLY: 12,
  QUARTERLY: 4,
  SEMI_ANNUAL: 2,
  ANNUAL: 1,
};

export const isSubType = (v: unknown): v is SubType => isOneOf(SUB_TYPES, v);
export const isAmenity = (v: unknown): v is Amenity => isOneOf(AMENITIES, v);
