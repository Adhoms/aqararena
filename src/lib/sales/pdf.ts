import "server-only";
import type { Browser, HTTPRequest } from "puppeteer-core";

// Prints a page of this site to PDF with a headless Chromium (spec section 7). On Vercel the browser
// is @sparticuz/chromium. Locally, CHROME_PATH points at the installed Google Chrome; never a
// downloaded browser. Server PDFs are off unless OFFER_PDF=on: then sharing sends the offer's link
// and the page's own print button makes the PDF (the spec's fallback).

export const pdfEnabled = () => process.env.OFFER_PDF === "on";

/** An offer page (297 × 185.625 mm) in CSS pixels, so the screen layout matches the printed one. */
const VIEWPORT = { width: 1123, height: 702 };
/** The whole render stays under this, well inside the routes' maxDuration of 60 s. */
const RENDER_BUDGET_MS = 45_000;
const LAUNCH_TIMEOUT_MS = 15_000;
const PROTOCOL_TIMEOUT_MS = 20_000;
const NAVIGATION_TIMEOUT_MS = 20_000;
/** At most this long for late images to load and decode before printing anyway. */
const SETTLE_MS = 8_000;
const CLOSE_TIMEOUT_MS = 5_000;

/** Flags in @sparticuz/chromium's list that would weaken the page's same-origin rules. */
const UNSAFE_ARGS = new Set(["--disable-web-security", "--allow-running-insecure-content"]);
/** Analytics beacons: nothing to print, and they'd keep the network busy. */
const BLOCKED_PATHS = ["/_vercel/insights", "/_vercel/speed-insights"];

// @sparticuz/chromium unpacks itself to /tmp on first use; two cold requests at once could get a
// half-written binary. Every caller shares one unpacking.
let chromiumPath: Promise<string> | undefined;

async function launch(): Promise<Browser> {
  const { default: puppeteer } = await import("puppeteer-core");
  const options = { headless: true, timeout: LAUNCH_TIMEOUT_MS, protocolTimeout: PROTOCOL_TIMEOUT_MS, defaultViewport: VIEWPORT };
  const local = process.env.CHROME_PATH;
  if (local) return puppeteer.launch({ ...options, executablePath: local });
  if (!process.env.VERCEL) {
    // The bundled Chromium is a Linux build for Vercel; never unpack or run it on a developer's machine.
    throw new Error("PDFs need CHROME_PATH (the installed Google Chrome) outside Vercel.");
  }
  const { default: chromium } = await import("@sparticuz/chromium");
  chromiumPath ??= chromium.executablePath().catch((e: unknown) => {
    chromiumPath = undefined;
    throw e;
  });
  // As @sparticuz/chromium's README launches it: its build is chrome-headless-shell. puppeteer-core is
  // pinned to the release whose Chrome matches @sparticuz/chromium's major (153 with 25.11.0).
  const args = await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" });
  return puppeteer.launch({
    ...options,
    args: args.filter((arg) => !UNSAFE_ARGS.has(arg.split("=")[0])),
    executablePath: await chromiumPath,
    headless: "shell",
  });
}

/**
 * Lets the page load what it needs and nothing else. Only requests to the page's own origin get the
 * Vercel protection-bypass secret: logos, master plans and map tiles live on other hosts.
 */
function guard(request: HTTPRequest, origin: string, bypass: string | undefined) {
  if (request.isInterceptResolutionHandled()) return;
  let target: URL;
  try {
    target = new URL(request.url());
  } catch {
    return void request.abort();
  }
  // data: and blob: are the page's own inline content, never fetched from anywhere.
  if (target.protocol === "data:" || target.protocol === "blob:") return void request.continue();
  if (target.protocol !== "https:" && target.protocol !== "http:") return void request.abort();
  if (BLOCKED_PATHS.some((path) => target.pathname.startsWith(path))) return void request.abort();
  if (bypass && target.origin === origin) {
    return void request.continue({ headers: { ...request.headers(), "x-vercel-protection-bypass": bypass } });
  }
  return void request.continue();
}

async function render(url: string): Promise<Uint8Array> {
  const deadline = Date.now() + RENDER_BUDGET_MS;
  const left = () => Math.max(1_000, deadline - Date.now());
  const browser = await launch();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);
    const origin = new URL(url).origin;
    // Preview deployments can sit behind Vercel Authentication; the secret lets the browser in.
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || undefined;
    await page.setRequestInterception(true);
    page.on("request", (request) => guard(request, origin, bypass));
    await page.goto(url, { waitUntil: "networkidle0", timeout: Math.min(NAVIGATION_TIMEOUT_MS, left()) });
    // Images below the first screen are lazy and would never be requested: load them all now.
    await page.evaluate(async (settleMs) => {
      const images = Array.from(document.images);
      for (const image of images) image.loading = "eager";
      const loaded = Promise.all([document.fonts.ready, ...images.map((image) => image.decode().catch(() => undefined))]);
      await Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, settleMs))]);
    }, Math.min(SETTLE_MS, left()));
    await page.waitForNetworkIdle({ idleTime: 300, timeout: Math.min(SETTLE_MS, left()) }).catch(() => undefined);
    return await page.pdf({ printBackground: true, preferCSSPageSize: true, timeout: left() });
  } finally {
    await close(browser);
  }
}

/** Closes the browser, or kills it if it doesn't close in time: a stuck Chromium holds ~1 GB. */
async function close(browser: Browser) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const closed = browser.close().then(() => true, () => false);
  const late = new Promise<false>((resolve) => (timer = setTimeout(() => resolve(false), CLOSE_TIMEOUT_MS)));
  await Promise.race([closed, late]);
  clearTimeout(timer);
  const child = browser.process();
  if (child && child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
}

// One render at a time per server instance: each Chromium needs about 0.5–1.6 GB.
let queue: Promise<unknown> = Promise.resolve();

/** The PDF of `url`, sized by the page's own @page rule. Waits for images and fonts. */
export function renderPdf(url: string): Promise<Uint8Array> {
  const job = queue.then(() => render(url));
  queue = job.catch(() => undefined);
  return job;
}
