// Rules for units a developer edits in the portal. Their changes go live at once, so these are
// checked on every save: the price can't undercut the unit type's published starting price.

/** A problem with a unit's price, or null. Empty price is fine: the type's price is shown. */
export function unitPriceProblem(price: number | null, typePrice: number | null): string | null {
  if (price === null || typePrice === null || typePrice <= 0) return null;
  if (price < typePrice) return `سعر الوحدة أقل من سعر «يبدأ من» للنموذج (${typePrice.toLocaleString("ar-EG")} جنيه). عدّل سعر النموذج الأول من «تعديل المشروع».`;
  return null;
}

/** How a unit is recognised inside a project: its building and number, ignoring case and spaces. */
export const unitKey = (building: string | null | undefined, number: string) => `${(building ?? "").trim().toLowerCase()}|${number.trim().toLowerCase()}`;

/** At most one email to the admin per project in this window. */
export const NOTIFY_EVERY_MS = 60 * 60 * 1000;

export const shouldNotify = (last: Date | null, now = new Date()) => !last || now.getTime() - last.getTime() >= NOTIFY_EVERY_MS;
