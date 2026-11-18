import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { renderPdf } from "@/lib/sales/pdf";

// Feasibility check for server-made PDFs on Vercel (phase 3, task 1). Off in production, and off
// unless OFFER_PDF_CHECK holds a secret of 32+ characters. Send it as "Authorization: Bearer <secret>"
// (or ?key=<secret>): the route prints the Arabic home page and reports the PDF's size and the time
// taken. Removed in task 19, once offers have their own PDF route.

export const maxDuration = 60;

const MIN_SECRET_LENGTH = 32;

const same = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

const notFound = () => new Response("Not found", { status: 404 });

function keyOf(request: Request, url: URL) {
  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice("Bearer ".length).trim();
  return url.searchParams.get("key") ?? "";
}

export async function GET(request: Request) {
  // Always at request time: otherwise, with Cache Components, a build without the secret would
  // prerender the 404 below and serve it even after the secret is set.
  await connection();
  const secret = process.env.OFFER_PDF_CHECK;
  if (process.env.VERCEL_ENV === "production" || !secret || secret.length < MIN_SECRET_LENGTH) return notFound();
  const url = new URL(request.url);
  if (!same(keyOf(request, url), secret)) return notFound();
  const started = Date.now();
  try {
    const pdf = await renderPdf(`${url.origin}/ar`);
    return Response.json({ ok: true, bytes: pdf.byteLength, ms: Date.now() - started });
  } catch (e) {
    console.error("PDF check failed", e);
    return Response.json({ ok: false, error: "The PDF could not be made; see the function log.", ms: Date.now() - started }, { status: 500 });
  }
}
