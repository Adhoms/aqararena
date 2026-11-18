import { timingSafeEqual } from "node:crypto";
import { renderPdf } from "@/lib/sales/pdf";

// Feasibility check for server-made PDFs on Vercel (phase 3, task 1). Off unless OFFER_PDF_CHECK holds
// a secret: /api/pdf-check?key=<secret> prints the Arabic home page and reports the PDF's size and the
// time taken. Removed in task 19, once offers have their own PDF route.

export const maxDuration = 60;

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export async function GET(request: Request) {
  const secret = process.env.OFFER_PDF_CHECK;
  const url = new URL(request.url);
  if (!secret || !same(url.searchParams.get("key") ?? "", secret)) return new Response("Not found", { status: 404 });
  const started = Date.now();
  try {
    const pdf = await renderPdf(`${url.origin}/ar`);
    return Response.json({ ok: true, bytes: pdf.byteLength, ms: Date.now() - started });
  } catch (e) {
    return Response.json({ ok: false, error: String(e), ms: Date.now() - started }, { status: 500 });
  }
}
