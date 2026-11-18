import "server-only";
import type { Browser } from "puppeteer-core";

// Prints a page of this site to PDF with a headless Chromium (spec section 7). On Vercel the browser
// is @sparticuz/chromium. Locally, CHROME_PATH points at the installed Google Chrome; never a
// downloaded browser. Server PDFs are off unless OFFER_PDF=on: then sharing sends the offer's link
// and the page's own print button makes the PDF (the spec's fallback).

export const pdfEnabled = () => process.env.OFFER_PDF === "on";

async function launch(): Promise<Browser> {
  const { default: puppeteer } = await import("puppeteer-core");
  const local = process.env.CHROME_PATH;
  if (local) return puppeteer.launch({ executablePath: local, headless: true });
  const { default: chromium } = await import("@sparticuz/chromium");
  // As @sparticuz/chromium's README launches it: its build is chrome-headless-shell. puppeteer-core is
  // pinned to the release whose Chrome matches @sparticuz/chromium's major (153 with 25.11.0).
  return puppeteer.launch({
    args: await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
    executablePath: await chromium.executablePath(),
    headless: "shell",
  });
}

/** The PDF of `url`, sized by the page's own @page rule. Waits for images and fonts. */
export async function renderPdf(url: string): Promise<Uint8Array> {
  const browser = await launch();
  try {
    const page = await browser.newPage();
    // Preview deployments can sit behind Vercel Authentication; this header lets the browser in.
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
    if (bypass) await page.setExtraHTTPHeaders({ "x-vercel-protection-bypass": bypass });
    await page.goto(url, { waitUntil: "networkidle0", timeout: 25_000 });
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    return await page.pdf({ printBackground: true, preferCSSPageSize: true });
  } finally {
    await browser.close();
  }
}
