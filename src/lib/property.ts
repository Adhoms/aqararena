// Mirrors the PropertyCategory enum in prisma/schema.prisma.
export const PROPERTY_CATEGORIES = [
  "RESIDENTIAL",
  "COMMERCIAL",
  "ADMINISTRATIVE",
  "MEDICAL",
  "COASTAL",
] as const;

export type PropertyCategory = (typeof PROPERTY_CATEGORIES)[number];

export function isPropertyCategory(value: unknown): value is PropertyCategory {
  return typeof value === "string" && (PROPERTY_CATEGORIES as readonly string[]).includes(value);
}

// Starter list of areas until they come from the database (Area table).
export const AREA_SLUGS = [
  "new-cairo",
  "new-capital",
  "sheikh-zayed",
  "6th-of-october",
  "mostakbal-city",
  "north-coast",
  "ain-sokhna",
] as const;

export type AreaSlug = (typeof AREA_SLUGS)[number];

export function isAreaSlug(value: unknown): value is AreaSlug {
  return typeof value === "string" && (AREA_SLUGS as readonly string[]).includes(value);
}
