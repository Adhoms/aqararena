import "server-only";
import { del, put } from "@vercel/blob";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { pdfEnabled, renderPdf } from "./pdf";

// An issued offer's PDF (spec 7): /o/[token] printed by headless Chromium, stored once in Vercel Blob
// and reused. Off (null) unless OFFER_PDF=on and Blob is set up; then sharing sends the link and the
// page's own «طباعة / حفظ PDF» button makes the PDF.

/** The client's link, on the site's public address. */
export const offerUrl = (token: string) => `${SITE_URL}/o/${token}`;

/**
 * This deployment's own address, so the PDF browser opens this deployment's page: the deployment's URL
 * on a Vercel preview, otherwise the site's address (NEXT_PUBLIC_SITE_URL, in production and locally).
 * Never from the Host or X-Forwarded-* headers: the caller controls those, and they would point the
 * browser (with the protection-bypass secret) at another server.
 */
export function requestOrigin(): string {
  if (process.env.VERCEL_ENV !== "production" && process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return SITE_URL;
}

/** Server PDFs are on and there is a Blob store to keep them in. */
export const pdfAvailable = () => pdfEnabled() && Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/**
 * The offer's PDF URL, made and stored the first time. Null when server PDFs are off. Throws what
 * renderPdf throws (PdfBusyError when another PDF is being made): callers fall back to the link.
 */
export async function ensureOfferPdf(offer: { id: string; token: string; pdfUrl: string | null }, origin: string): Promise<string | null> {
  if (offer.pdfUrl) return offer.pdfUrl;
  if (!pdfAvailable()) return null;
  const pdf = await renderPdf(`${origin}/o/${offer.token}`);
  // A random suffix: the file's address can't be guessed from the offer's id, and never collides.
  const { url } = await put(`offers/${offer.id}.pdf`, Buffer.from(pdf), { access: "public", contentType: "application/pdf", addRandomSuffix: true });
  const { count } = await db.salesOffer.updateMany({ where: { id: offer.id, pdfUrl: null }, data: { pdfUrl: url } });
  if (count) return url;
  // Another request made it at the same moment: keep theirs.
  await del(url).catch(() => undefined);
  return (await db.salesOffer.findUnique({ where: { id: offer.id }, select: { pdfUrl: true } }))?.pdfUrl ?? null;
}

/** A file name for the PDF: "Offer B1-101 Wadi Yemm.pdf" (any language; sent encoded). */
export const offerFileName = (unit: string, project: string) =>
  `Offer ${unit.replace(/\s*·\s*/g, "-")} ${project}`.trim().replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ") + ".pdf";
