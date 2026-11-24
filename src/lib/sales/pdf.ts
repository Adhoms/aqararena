import "server-only";
import type { ChildProcess } from "node:child_process";
import type { Browser, HTTPRequest } from "puppeteer-core";

// Prints a page of this site to PDF with a headless Chromium (spec section 7). On Vercel the browser
// is @sparticuz/chromium. Locally, CHROME_PATH points at the installed Google Chrome; never a
// downloaded browser. Server PDFs are off unless OFFER_PDF=on: then sharing sends the offer's link
// and the page's own print button makes the PDF (the spec's fallback).

export const pdfEnabled = () => process.env.OFFER_PDF === "on";

/** An offer page (297 × 185.625 mm) in CSS pixels, so the screen layout matches the printed one. */
const VIEWPORT = { width: 1123, height: 702 };
/**
 * The whole request stays under this, well inside the routes' maxDuration of 60 s. It counts from the
 * call, so time spent waiting for the render before it is part of it.
 */
const RENDER_BUDGET_MS = 45_000;
/** One render at a time; one more may wait this long for it, and any other is turned away. */
const MAX_WAIT_MS = 10_000;
const MAX_IN_LINE = 2;
/** Unpacking @sparticuz/chromium to /tmp on a cold instance. */
const UNPACK_TIMEOUT_MS = 15_000;
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
const BYPASS_HEADER = "x-vercel-protection-bypass";

/** Another PDF is being made and this one would wait too long: callers fall back to the print button. */
export class PdfBusyError extends Error {
  constructor() {
    super("Another PDF is being made on this server; try again shortly or use the page's print button.");
    this.name = "PdfBusyError";
  }
}

/** `promise`, or a rejection naming `what` after `ms`. The promise itself carries on. */
function within<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const late = new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error(`${what} took longer than ${ms} ms`)), ms)));
  return Promise.race([promise, late]).finally(() => clearTimeout(timer));
}

// @sparticuz/chromium unpacks itself to /tmp on first use; two cold requests at once could get a
// half-written binary. Every caller shares one unpacking.
let chromiumPath: Promise<string> | undefined;

async function launch(left: () => number): Promise<Browser> {
  const { default: puppeteer } = await import("puppeteer-core");
  const options = { headless: true, timeout: Math.min(LAUNCH_TIMEOUT_MS, left()), protocolTimeout: PROTOCOL_TIMEOUT_MS, defaultViewport: VIEWPORT };
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
  // A stuck unpacking fails this request only; the next one waits on the same unpacking.
  const executablePath = await within(chromiumPath, Math.min(UNPACK_TIMEOUT_MS, left()), "Unpacking Chromium");
  // As @sparticuz/chromium's README launches it: its build is chrome-headless-shell. puppeteer-core is
  // pinned to the release whose Chrome matches @sparticuz/chromium's major (153 with 25.11.0).
  const args = await puppeteer.defaultArgs({ args: chromium.args, headless: "shell" });
  return puppeteer.launch({
    ...options,
    timeout: Math.min(LAUNCH_TIMEOUT_MS, left()),
    args: args.filter((arg) => !UNSAFE_ARGS.has(arg.split("=")[0])),
    executablePath,
    headless: "shell",
  });
}

function originOf(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/**
 * Lets the page load what it needs and nothing else. Only requests to the page's own origin get the
 * Vercel protection-bypass secret: logos, master plans and map tiles live on other hosts. A redirect
 * can keep the headers set on the request it came from, so requests to other hosts go out with the
 * header taken off, and a redirect from the page's origin to another host is stopped.
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
  if (!bypass) return void request.continue();
  if (target.origin === origin) return void request.continue({ headers: { ...request.headers(), [BYPASS_HEADER]: bypass } });
  if (request.redirectChain().some((r) => originOf(r.url()) === origin)) return void request.abort();
  const headers = Object.fromEntries(Object.entries(request.headers()).filter(([name]) => name.toLowerCase() !== BYPASS_HEADER));
  return void request.continue({ headers });
}

async function render(url: string, deadline: number): Promise<Uint8Array> {
  const left = () => Math.max(1_000, deadline - Date.now());
  const browser = await launch(left);
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(NAVIGATION_TIMEOUT_MS);
    const origin = new URL(url).origin;
    // Preview deployments can sit behind Vercel Authentication; the secret lets the browser in.
    const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || undefined;
    await page.setRequestInterception(true);
    page.on("request", (request) => guard(request, origin, bypass));
    const response = await page.goto(url, { waitUntil: "networkidle0", timeout: Math.min(NAVIGATION_TIMEOUT_MS, left()) });
    // Never print an error or not-found page as if it were the document.
    if (!response?.ok()) throw new Error(`The page answered ${response?.status() ?? "nothing"}, not printed`);
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
  if (child && child.exitCode === null && child.signalCode === null) kill(child);
}

/**
 * Kills Chromium with its helper processes. Off Windows, puppeteer starts it as the leader of its own
 * process group, so the whole group goes; `child.kill` alone would leave the helpers running.
 */
function kill(child: ChildProcess) {
  if (process.platform !== "win32" && child.pid) {
    try {
      process.kill(-child.pid, "SIGKILL");
      return;
    } catch {
      // Not a group leader after all: kill the process itself.
    }
  }
  child.kill("SIGKILL");
}

// One render at a time per server instance: each Chromium needs about 0.5–1.6 GB.
let queue: Promise<unknown> = Promise.resolve();
/** Renders running or waiting on this instance. */
let inLine = 0;

/**
 * The PDF of `url`, sized by the page's own @page rule. Waits for images and fonts. Rejects with
 * PdfBusyError when a render is running and another already waits, or after MAX_WAIT_MS of waiting.
 */
export async function renderPdf(url: string): Promise<Uint8Array> {
  return (await renderPdfIf(url, async () => true))!;
}

/**
 * renderPdf, asking `stillNeeded` once this render's turn comes: a request that waited behind another
 * may find the PDF made by then, and resolves null without starting a browser.
 */
export function renderPdfIf(url: string, stillNeeded: () => Promise<boolean>): Promise<Uint8Array | null> {
  if (inLine >= MAX_IN_LINE) return Promise.reject(new PdfBusyError());
  // Taken now, so the wait counts against the budget.
  const deadline = Date.now() + RENDER_BUDGET_MS;
  inLine++;
  let out = false;
  const leave = () => {
    if (!out) inLine--;
    out = true;
  };
  let gaveUp = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const tooLong = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      gaveUp = true;
      leave();
      reject(new PdfBusyError());
    }, MAX_WAIT_MS);
  });
  const job = queue.then(async () => {
    clearTimeout(timer);
    if (gaveUp) throw new PdfBusyError();
    if (!(await stillNeeded())) return null;
    return render(url, deadline);
  });
  queue = job.catch(() => undefined).finally(leave);
  return Promise.race([job, tooLong]);
}
