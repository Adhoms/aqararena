// Shared by server and client code for the comparison feature.

export const MAX_COMPARE = 4;

/** Comparison page URL for a list of project slugs: /ar/compare?p=project-a,project-b */
export function compareHref(locale: string, slugs: string[]) {
  return slugs.length ? `/${locale}/compare?p=${slugs.map(encodeURIComponent).join(",")}` : `/${locale}/compare`;
}

/** Reads ?p=a,b,c into a clean, de-duplicated list of at most MAX_COMPARE slugs. */
export function parseCompareParam(value: string | string[] | undefined): string[] {
  const raw = Array.isArray(value) ? value.join(",") : (value ?? "");
  return [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))].slice(0, MAX_COMPARE);
}
