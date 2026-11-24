import { PdfBusyError } from "@/lib/sales/pdf";
import { offerFileName, offerPdf, requestOrigin, type OfferPdf } from "@/lib/sales/offer-pdf";
import { loadOffer } from "@/lib/sales/offer-service";
import { SHAREABLE_STATES } from "@/lib/sales/offers";
import { currentSalesAccount } from "@/lib/sales/session";

// The offer's PDF for its salesperson or a team lead (the share screen downloads it and hands it to the
// phone's share sheet). Under /sales so the session cookie comes with the request.
//
// Made once, then served from Vercel Blob. When server PDFs are off (OFFER_PDF), another PDF is being
// made, or the offer no longer holds, it answers 303 to the client's page /o/[token] instead, whose
// «طباعة / حفظ PDF» button prints it: a link follows the redirect, and a script tells a PDF from the
// page by the response's Content-Type.

export const maxDuration = 60;

const toPage = (token: string, retry = false) =>
  new Response(null, {
    status: 303,
    headers: { Location: `/o/${token}`, "Cache-Control": "private, no-store", ...(retry ? { "Retry-After": "15" } : {}) },
  });

export async function GET(_request: Request, ctx: RouteContext<"/sales/offers/[id]/pdf">) {
  const me = await currentSalesAccount();
  if (!me || me.mustChangePassword) return new Response("Sign in", { status: 401, headers: { "Cache-Control": "private, no-store" } });
  const { id } = await ctx.params;
  const offer = /^[a-z0-9]{10,40}$/i.test(id) ? await loadOffer({ id: me.id, role: me.role, developerId: me.developer.id }, id) : null;
  if (!offer || offer.status !== "ISSUED" || !offer.token) return new Response("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
  // An expired, cancelled or sold offer is shown with its banner on the page, never as a clean PDF.
  if (!SHAREABLE_STATES.includes(offer.state)) return toPage(offer.token);
  let pdf: OfferPdf | null = null;
  try {
    pdf = await offerPdf({ id: offer.id, token: offer.token, pdfUrl: offer.pdfUrl }, requestOrigin());
  } catch (e) {
    if (e instanceof PdfBusyError) return toPage(offer.token, true);
    console.error("[offer-pdf]", e);
  }
  if (!pdf) return toPage(offer.token);
  // Just made: send those bytes. Made before: fetch the stored file.
  let body: BodyInit | null = pdf.bytes ? Buffer.from(pdf.bytes) : null;
  if (!body) {
    const file = await fetch(pdf.url, { cache: "no-store" }).catch(() => null);
    if (!file?.ok || !file.body) return toPage(offer.token);
    body = file.body;
  }
  const name = offerFileName(offer.snap?.unit.label ?? "unit", offer.snap?.project.nameEn ?? "");
  return new Response(body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="offer.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
