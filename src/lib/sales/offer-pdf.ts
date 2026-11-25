import "server-only";
import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { pdfEnabled, renderPdfIf } from "./pdf";

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

/** The offer's stored PDF, and its bytes when this call just made it (no need to download it again). */
export type OfferPdf = { url: string; bytes: Uint8Array | null };

const storedPdf = async (id: string) => (await db.salesOffer.findUnique({ where: { id }, select: { pdfUrl: true } }))?.pdfUrl ?? null;

/**
 * The offer's PDF, made and stored the first time. Null when server PDFs are off. Throws what renderPdf
 * throws (PdfBusyError when another PDF is being made): callers fall back to the link.
 */
export async function offerPdf(offer: { id: string; token: string; pdfUrl: string | null }, origin: string): Promise<OfferPdf | null> {
  if (offer.pdfUrl) return { url: offer.pdfUrl, bytes: null };
  if (!pdfAvailable()) return null;
  // A request that waited for its turn behind another may find this offer's PDF made meanwhile.
  let madeMeanwhile: string | null = null;
  const bytes = await renderPdfIf(`${origin}/o/${offer.token}`, async () => !(madeMeanwhile = await storedPdf(offer.id)));
  if (!bytes) return madeMeanwhile ? { url: madeMeanwhile, bytes: null } : null;
  // A random name: the file's address says nothing about the offer and can't be guessed.
  const { url } = await put(`offers/${randomUUID()}.pdf`, Buffer.from(bytes), { access: "public", contentType: "application/pdf", addRandomSuffix: false });
  const { count } = await db.salesOffer.updateMany({ where: { id: offer.id, status: "ISSUED", pdfUrl: null }, data: { pdfUrl: url } });
  if (count) return { url, bytes };
  // Another request stored one at the same moment (keep theirs), or the offer was cancelled meanwhile.
  await del(url).catch(() => undefined);
  const theirs = await storedPdf(offer.id);
  return theirs ? { url: theirs, bytes: null } : null;
}

/** The offer's PDF URL (offerPdf without the bytes), for attaching it by link. */
export const ensureOfferPdf = async (offer: { id: string; token: string; pdfUrl: string | null }, origin: string) => (await offerPdf(offer, origin))?.url ?? null;

/** A file name for the PDF: "Offer B1-101 Wadi Yemm.pdf" (any language; sent encoded). */
export const offerFileName = (unit: string, project: string) =>
  `Offer ${unit.replace(/\s*·\s*/g, "-")} ${project}`.trim().replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ") + ".pdf";
