# Phase 3: AqarArena Sales payment schedules, project currency and price offers — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a developer's salespeople issue price offers for one unit on one payment plan (with custom installment schedules, the project's currency, an optional discount with team-lead approval), open them as a printable 16:10 page at `/o/[token]`, turn them into a PDF, and share them by WhatsApp, Telegram, email or the phone's share sheet.

**Architecture:** Same Next.js app and database (spec: `docs/superpowers/specs/2026-11-15-aqararena-three-products-design.md`, sections 2, 4, 5, 7, 10.3, 11 and 12). One additive migration adds `Project.currency`, the developer's offer settings, `PlanStep`, `Unit.zoneId` and `SalesOffer`, with hand-written CHECK constraints. Everything with rules is a pure, tested module: the schedule notation (`catalog/plan-steps.ts`), the schedule math (`catalog/schedule.ts`), the offer rules (`sales/offers.ts`), sharing (`sales/share.ts`). One server-only service (`sales/offer-service.ts`) writes offers in a transaction that locks the unit row, like holds do. An offer stores a snapshot of every figure and text at issue time; `/o/[token]` renders the snapshot, and the PDF is that page printed by headless Chromium and stored once in Vercel Blob. If server PDFs don't work on Vercel, sharing sends the link and the page's own print button makes the PDF.

**Tech Stack:** Next.js 16 (App Router, Cache Components, route handlers), React 19, TypeScript, Tailwind CSS 4, Prisma 7.10 on PostgreSQL, `puppeteer-core` + `@sparticuz/chromium` (new), `@vercel/blob`, Resend over HTTP, Node's test runner via `tsx`.

**Base branch:** `claude/aqararena-sales-offers`, cut from `main` after phases 1 (PR #20) and 2 (PR #21). **Before Task 1, bring in `main` again:** it gained PR #22 (dependency upgrades: `next` 16.4.6, `maplibre-gl` 6.19, `@vercel/blob` 2.9.0, with `overrides`). Run `git fetch origin && git merge origin/main` (no rebase: the branch may already be shared), then `npm install` and `npm test`. Every Next.js API below was checked in `node_modules/next/dist/docs/01-app/03-api-reference/` of 16.4.2; re-check the same files after the merge: `03-file-conventions/route.md` (route handlers, `RouteContext`), `03-file-conventions/02-route-segment-config/maxDuration.md`, `03-file-conventions/layout.md` (multiple root layouts), `03-file-conventions/not-found.md`, `03-file-conventions/01-metadata/robots.md`, `03-file-conventions/proxy.md`, `05-config/01-next-config-js/serverExternalPackages.md` (both `puppeteer-core` and `@sparticuz/chromium` are on the built-in list), `04-functions/generate-metadata.md` (with Cache Components, metadata that reads data defers to request time; this plan uses static metadata only).

**Local testing:** never use the main checkout's `.env` (it is the live database). From Task 2 on you need a throwaway database: `npx prisma dev --detach --name aqararena-p3-test` (it prints the port; the shadow database is that port + 1), a worktree `.env` built from `.env.example` with those two ports, `NEXT_PUBLIC_SITE_URL=http://localhost:3001`, then `npx prisma migrate deploy` and `npm run db:seed`. Keep it running until the end; the final task leaves cleanup to the controller. **PDFs locally:** set `CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"` (the installed Google Chrome). Never run the `@sparticuz/chromium` binary or any other downloaded executable locally; this environment's safety check blocks it, and it isn't needed.

**Conventions for every task:**
- Every `git commit` below gets a second `-m` with **your own** `Co-Authored-By:` line.
- No Prettier (the repo isn't formatted with it); match the surrounding style.
- No literal invisible or bidi characters (LRM, RLM, ZWJ, NBSP, U+202A–U+202E, U+2066–U+2069) in source. Write `\u…` escapes in regular expressions; isolate Latin text inside Arabic with `<bdi dir="ltr">`.
- Arabic copy in the same colloquial tone as the existing Sales and portal pages.
- Dates on the Arabic screens with `formatDateAr` / `formatDateTimeAr`, counts with `formatCountAr` / `countAr` (all on Cairo's clock, `src/lib/format.ts`). The client-facing offer writes Western digits, like the public site.
- Every Sales read and action calls `requireSales()` and scopes its query by the salesperson's developer with `salesUnitWhere` / `salesTypologyWhere` from `src/lib/sales/scope.ts`; portal actions call `requireAccount()`, admin actions `requireAdmin()`.
- Migrations only add.
- UI tasks (5, 8, 9, 12, 15, 17, 18, 21, 22, 23): load `anthropic-skills:design-taste-frontend` and `anthropic-skills:make-interfaces-feel-better` first and stay inside the existing visual language (`src/app/admin/admin.css` classes, tokens in `src/app/globals.css`; no new colours or fonts). Salespeople mostly use phones: check 360 px wide.

**What the code allows (checked while writing this plan):**
- **The proxy redirects every path without a locale** to `/ar/…` or `/en/…` (`src/proxy.ts`). `/o/[token]` must be let through like `/admin` (Task 17).
- **Portal approvals replace a project's plans as a whole** (`src/lib/portal/drafts.ts`: `paymentPlan.deleteMany` then `create`), so plan ids change on every approval. `SalesOffer.paymentPlanId` is therefore nullable with `SET NULL`, and "the price changed" compares a **plan fingerprint** (terms and steps) stored in the snapshot with the project's current plans, never the plan id.
- **The Sales cookie has `path: "/sales"`.** A route that needs the salesperson must live under `/sales` (the PDF route is `/sales/offers/[id]/pdf`). The feasibility check of Task 1 has no session and lives under `/api`, guarded by a secret.
- **Portal draft rows** are cleaned by `cleanFields`, which keeps arrays of at most 50 strings of 100 characters. A schedule can have 96+ steps, so a draft keeps a plan's steps as **one string in the schedule notation** (Task 6), the same text the admin form and Excel use.
- **The Excel plans sheet** recognises an existing plan by project, unit type, down payment, years and frequency (`planKey` in `src/lib/admin/import/workbook.ts`). A plan with steps gets its down payment and years derived from the steps before that match, so re-importing a stepped plan updates it instead of duplicating it.
- **Money is EGP-only today:** `formatMoney` / `formatMillions` (35 calls in 16 files), hand-written «ج.م» in four Arabic screens, and «(جنيه)» in admin, portal and Excel labels. Cross-project figures (area statistics, insights, price filters and sort, the map's cluster "from …", the compare page's "best" marks) mix all projects. With USD projects those comparisons must stay within one currency: this plan compares EGP projects only (a USD project is listed and shown in dollars, but takes no part in EGP comparisons).
- **Master-plan zones** are rectangles in percent. The admin form says «من اليسار», but the public `MasterPlan` places them with `insetInlineStart`, which mirrors them on Arabic pages. Task 11 fixes it to `left` and uses the same convention to mark a unit's zone.
- **`src/lib/email.ts` has a bug:** `toHtml` tests `/[0600-06FF]/` (the characters 0, 6, - and F), not Arabic letters, so a message's direction depends on whether it contains a 0 or 6. Task 20 fixes it to `/[\u0600-\u06FF]/`.
- **Spec conflict:** §4 says a discount limit of 0 means "every discount needs approval", §5.4 says anything above the team lead's limit is refused. With both limits at 0 (the default) every discount is refused, and the message says the company hasn't set a discount yet. §5.4 wins; the spec is updated.
- **Stepped plans and the existing calculator:** cards, filters, the budget search and the payment calculator read `downPaymentPct` / `years` / `deliveryPaymentPct`. For a stepped plan these are derived from the steps when it is saved (down payment = what is due at month 0, years = last payment's month rounded up, delivery payment 0), so those screens keep working with averages; the exact installment-by-installment schedule is on offers only.
- **Root layout for `/o`:** the offer's language is only known from the database. A root layout must not read uncached data outside `<Suspense>`, so `src/app/o/layout.tsx` is static (like the Sales layout) and the page puts `lang` and `dir` on its own wrapper. Metadata is static (`noindex`).
- **Vercel preview deployments** may sit behind Vercel Authentication, which would block the headless browser opening `/o/[token]`. `renderPdf` sends `x-vercel-protection-bypass` when `VERCEL_AUTOMATION_BYPASS_SECRET` is set (Vercel sets it once "Protection Bypass for Automation" is on).

---

## File structure

| File | Responsibility |
| --- | --- |
| `src/lib/sales/pdf.ts` (new, server-only) | `pdfEnabled`, `renderPdf(url)` with puppeteer-core (local Chrome or `@sparticuz/chromium`). |
| `src/app/api/pdf-check/route.ts` (new, removed in Task 19) | Secret-guarded feasibility check on Vercel. |
| `prisma/schema.prisma`, `prisma/migrations/<ts>_sales_offers/migration.sql` | `Currency`, `Project.currency`, developer offer settings, `PlanStep`, `Unit.zoneId`, `SalesOffer` and CHECKs. |
| `src/lib/property.ts` (modify) | `CURRENCIES`, `Currency`. |
| `src/lib/format.ts` (modify) | `formatMoney` / `formatMillions` take a currency; `currencyAr`, `CURRENCY_NAMES_AR`, `OFFERS_NOUN`. |
| `src/lib/catalog/summary.ts` (modify) | `currencyOf`, `inEgp`. |
| Public pages and components (modify) | Pass the project's currency; EGP-only comparisons. |
| `src/lib/admin/readers.ts`, `src/components/admin/project-form.tsx`, `src/lib/portal/fields.ts`, `src/lib/portal/drafts.ts`, `src/lib/admin/import/columns.ts`, `src/lib/admin/import/workbook.ts` (modify) | Currency setting; neutral «(بعملة المشروع)» labels with old Excel headers as aliases. |
| Sales/portal/admin Arabic screens (modify) | Amounts in the project's currency; Sales budget currency. |
| `src/lib/catalog/plan-steps.ts` (new) + test | Schedule notation: parse, check, format, spread, derived terms, step rows. |
| `src/lib/catalog/schedule.ts` (new) + test | Schedule math: steps of a plan, split and round, rows by month, dates, fingerprint, paging. |
| `src/components/admin/schedule-field.tsx` (new) | Notation textarea with a live summary; `SchedulePreview`. |
| `src/app/admin/actions.ts`, `src/components/admin/project-parts.tsx`, `src/app/admin/projects/[id]/page.tsx` (modify) | Plan steps in the admin; unit zone; currency in money labels. |
| `src/components/portal/editor.tsx`, `src/lib/portal/review.ts` (modify) | `schedule` field type in the portal editor. |
| `src/lib/units.ts` (modify) | `zoneOfProject`. |
| `src/app/portal/unit-actions.ts`, `src/app/portal/projects/[id]/units/page.tsx` (modify) | Unit zone in the portal (immediate). |
| `src/components/sales/marked-plan.tsx` (new) | Master-plan image with one zone marked. |
| `src/components/project/master-plan.tsx` (modify) | Zones from the left, as the admin enters them. |
| `src/lib/sales/offers.ts` (new) + test | Offer rules: settings, discount decision, permissions, validity, derived state, client banner, form reading. |
| `src/lib/sales/offer-token.ts` (new) + test | `newOfferToken`, `isOfferToken`. |
| `src/lib/sales/offer-copy.ts` (new) | Offer page and message text in Arabic and English; `offerDate`, `scheduleDate`. |
| `src/lib/sales/share.ts` (new) + test | WhatsApp number, share links, share message. |
| `src/lib/sales/offer-snapshot.ts` (new) + test | `OfferSnapshot` type and `asSnapshot` guard. |
| `src/app/portal/team-actions.ts`, `src/app/portal/team/page.tsx` (modify) | Offer validity and discount limits. |
| `src/lib/sales/hold-service.ts` (modify) | Export `limitLockWait`, `lockUnit`, `TX_OPTIONS`, `BUSY`. |
| `src/lib/sales/offer-service.ts` (new, server-only) | Create, approve, cancel, record a share, list, count, derive states, load for the client. |
| `src/app/o/layout.tsx`, `src/app/o/offer.css`, `src/app/o/not-found.tsx`, `src/app/o/[token]/page.tsx` (new) | The client's offer page. |
| `src/components/offer/*.tsx` (new) | The offer's pages. |
| `src/proxy.ts`, `src/app/robots.ts`, `next.config.ts` (modify) | Let `/o` through, disallow it, `noindex` header. |
| `src/lib/sales/offer-pdf.ts` (new, server-only) | `ensureOfferPdf`, `requestOrigin`, `offerUrl`. |
| `src/app/sales/offers/[id]/pdf/route.ts` (new) | The offer's PDF for the salesperson. |
| `src/lib/throttle.ts`, `src/lib/email.ts` (modify) | `withinRate`; attachments; RTL fix. |
| `src/app/sales/offer-actions.ts` (new) | Server actions: create, approve, reject/cancel, record share, email. |
| `src/app/sales/units/[id]/offer/page.tsx`, `src/components/sales/offer-form.tsx` (new) | The new-offer form. |
| `src/app/sales/offers/[id]/page.tsx`, `src/components/sales/share-panel.tsx`, `src/components/sales/offer-state-badge.tsx` (new) | The offer and its share screen. |
| `src/app/sales/offers/page.tsx`, `src/components/sales/offer-list.tsx` (new) | «عروضي» and the team lead's approvals. |
| `src/app/sales/units/[id]/page.tsx`, `src/app/sales/me/page.tsx`, `src/components/sales/sales-nav.tsx` (modify) | Live «عرض سعر», zone on the plan, offer counts, nav. |
| `README.md`, `docs/ROADMAP.md`, `.env.example` (modify) | Docs. |

---

### Task 1: PDF feasibility spike

**Files:**
- Modify: `package.json`, `package-lock.json`, `.env.example`
- Create: `src/lib/sales/pdf.ts`, `src/app/api/pdf-check/route.ts`

Spec §7 makes this the first step: find out whether a headless Chromium fits in a Vercel function and finishes in time. Nothing else depends on the answer; the share screen works either way.

- [ ] **Step 1: Install the two packages**

Run: `npm install puppeteer-core @sparticuz/chromium`
Then open `node_modules/@sparticuz/chromium/README.md` and check its compatibility table: the `puppeteer-core` major must target the Chromium version that `@sparticuz/chromium` ships. If they don't match, pin `puppeteer-core` to the version the README names (`npm install puppeteer-core@<version>`). Installing does not run either binary.

- [ ] **Step 2: The renderer**

```ts
// src/lib/sales/pdf.ts
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
  // If the installed @sparticuz/chromium documents other launch options, follow its README.
  return puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
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
```

- [ ] **Step 3: The guarded check route**

```ts
// src/app/api/pdf-check/route.ts
import { timingSafeEqual } from "node:crypto";
import { renderPdf } from "@/lib/sales/pdf";

// Feasibility check for server-made PDFs on Vercel (phase 3, task 1). Off unless OFFER_PDF_CHECK holds
// a secret: /api/pdf-check?key=<secret> prints the Arabic home page and reports the PDF's size and the
// time taken. Removed in task 19, once offers have their own PDF route.

export const maxDuration = 60;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

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
```

- [ ] **Step 4: Try it locally with the installed Chrome**

In your scratchpad, write `spike.html`:

```html
<!doctype html>
<html lang="ar" dir="rtl"><meta charset="utf-8">
<style>@page { size: 297mm 185.625mm; margin: 0 } body { margin: 0; font-family: Tahoma, sans-serif }
section { width: 297mm; height: 185.625mm; break-after: page; display: flex; align-items: center; justify-content: center; font-size: 40px }</style>
<section>عرض سعر · ٢٠٢٦</section><section dir="ltr">Price offer</section>
</html>
```

and `pdf-spike.mts` (run from the worktree root so `@/` resolves):

```ts
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { renderPdf } from "@/lib/sales/pdf";

const [html, out] = process.argv.slice(2);
const started = Date.now();
const pdf = await renderPdf(pathToFileURL(html).href);
writeFileSync(out, pdf);
const text = readFileSync(out, "latin1");
console.log({ bytes: pdf.byteLength, ms: Date.now() - started, header: text.slice(0, 5), pages: (text.match(/\/Type\s*\/Page\b/g) ?? []).length });
```

Run: `CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" node --conditions=react-server --import tsx <scratchpad>/pdf-spike.mts <scratchpad>/spike.html <scratchpad>/spike.pdf`
Expected: `header: '%PDF-'`, `pages: 2`, a few seconds at most. Open `spike.pdf` and check that the Arabic reads right to left and the pages are landscape.

- [ ] **Step 5: Environment notes**

Append to `.env.example`:

```bash
# Price-offer PDFs (AqarArena Sales). "on" makes the server print /o/[token] to PDF with headless
# Chromium and keep it in Vercel Blob (needs BLOB_READ_WRITE_TOKEN). Off: sharing sends the link and
# the offer page's print button makes the PDF.
# OFFER_PDF="on"
# Local only: the installed Google Chrome, used instead of @sparticuz/chromium.
# CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"
# Feasibility check: a long random secret enables /api/pdf-check?key=<secret> (removed in phase 3 task 19).
# OFFER_PDF_CHECK=""
# Set by Vercel when "Protection Bypass for Automation" is on; lets the PDF browser open preview pages.
# VERCEL_AUTOMATION_BYPASS_SECRET=""
```

- [ ] **Step 6: Type-check, lint, commit**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean.

```bash
git add package.json package-lock.json .env.example src/lib/sales/pdf.ts src/app/api/pdf-check/route.ts
git commit -m "PDF spike: print a page with headless Chromium, guarded check route"
```

- [ ] **Step 7: Hand-off item (not done by the implementer)**

The real test is on a Vercel preview, which needs a push the user must allow. Tell the controller: once the branch is pushed, set `OFFER_PDF_CHECK` on the preview, open `/api/pdf-check?key=…`, and record in the PR whether it answered `ok: true`, how long it took (should be under ~15 s warm), and the function size from the build log (limit 250 MB unzipped). If it fails, `OFFER_PDF` stays off and the product still works through the link and the print button.

---

### Task 2: Phase-3 schema

**Files:**
- Modify: `prisma/schema.prisma`
- Create (generated, then edited): `prisma/migrations/<timestamp>_sales_offers/migration.sql`

Start the throwaway database now (see "Local testing").

- [ ] **Step 1: Enums**

After `enum ZoneKind { … }`, add:

```prisma
/// The currency of a project's prices, plans and offers. Nothing is converted: changing it relabels the numbers.
enum Currency {
  EGP
  USD
}

/// A line of a plan's custom schedule: a share of the unit price, or of the maintenance deposit.
enum PlanStepKind {
  PAYMENT
  MAINTENANCE
}

/// PENDING_APPROVAL: its discount is above the salesperson's limit and waits for a team lead; it can't
/// be shared or opened by the client. ISSUED: out. CANCELLED: cancelled, or rejected by a team lead.
enum OfferStatus {
  PENDING_APPROVAL
  ISSUED
  CANCELLED
}

/// How an offer was shared. DEVICE: the phone's own share sheet (the PDF file to any app).
enum OfferChannel {
  WHATSAPP
  TELEGRAM
  EMAIL
  DEVICE
}

enum OfferLanguage {
  ar
  en
}
```

- [ ] **Step 2: Fields and relations**

In `model Developer`, after `holdHours Int @default(48)`, add:

```prisma
  /// How many days a Sales price offer stays valid by default (1–30), set in «فريق المبيعات».
  offerValidityDays Int          @default(7)
  /// Highest discount (% of the unit price, 0–20) a salesperson gives without a team lead's approval.
  agentDiscountPct  Decimal      @default(0) @db.Decimal(4, 2)
  /// Highest discount a team lead gives or approves; anything above is refused in Sales (spec 5.4).
  leadDiscountPct   Decimal      @default(0) @db.Decimal(4, 2)
  salesOffers       SalesOffer[]
```

In `model Project`, change the `bookingFee` comment to `/// Refundable amount to reserve a unit at launch (EOI), in the project's currency.` and after `holdHours Int?` add:

```prisma
  /// The currency of every price, plan and offer of this project.
  currency        Currency      @default(EGP)
```

In `model Unit`, after `holds UnitHold[]`, add (and add `@@index([zoneId])` next to the existing index):

```prisma
  /// Where the unit is on the master plan, marked on offers and the Sales unit page. A zone of the same project (checked by the app).
  zoneId       String?
  zone         MasterPlanZone?  @relation(fields: [zoneId], references: [id], onDelete: SetNull)
  offers       SalesOffer[]
```

In `model MasterPlanZone`, after `sortOrder`, add `  units          Unit[]`.

In `model PaymentPlan`, after `isActive`, add:

```prisma
  /// A custom schedule. Empty: the plan is paid as down payment, equal installments and delivery payment.
  steps              PlanStep[]
  salesOffers        SalesOffer[]
```

In `model SalesAccount`, after `releasedHolds`, add:

```prisma
  offers             SalesOffer[]  @relation("OfferOwner")
  approvedOffers     SalesOffer[]  @relation("OfferApprover")
  cancelledOffers    SalesOffer[]  @relation("OfferCanceller")
```

- [ ] **Step 3: The two models**

At the end of the file:

```prisma
/// One line of a plan's custom schedule (spec section 4). Written from the notation in
/// src/lib/catalog/plan-steps.ts, which checks that payments add up to 100% and maintenance to 100% or nothing.
model PlanStep {
  id            String       @id @default(cuid())
  paymentPlanId String
  paymentPlan   PaymentPlan  @relation(fields: [paymentPlanId], references: [id], onDelete: Cascade)
  /// Months after the contract (0 = at contract), 0–360.
  monthOffset   Int
  /// Percent of the unit price (PAYMENT) or of the maintenance deposit (MAINTENANCE), up to 6 decimals.
  pct           Decimal      @db.Decimal(9, 6)
  kind          PlanStepKind @default(PAYMENT)
  sortOrder     Int          @default(0)

  @@unique([paymentPlanId, kind, monthOffset])
}

/// A salesperson's price offer for one unit on one plan (spec sections 4, 5 and 7). `snapshot` keeps
/// every figure and text as issued (src/lib/sales/offer-snapshot.ts); /o/[token] shows it to the client.
model SalesOffer {
  id             String         @id @default(cuid())
  /// 24 random bytes, base64url (32 characters): the client's link /o/[token]. Can't be guessed.
  token          String         @unique
  developerId    String
  developer      Developer      @relation(fields: [developerId], references: [id], onDelete: Cascade)
  salesAccountId String
  salesAccount   SalesAccount   @relation("OfferOwner", fields: [salesAccountId], references: [id], onDelete: Cascade)
  /// Null once the unit is deleted; the snapshot keeps what was offered.
  unitId         String?
  unit           Unit?          @relation(fields: [unitId], references: [id], onDelete: SetNull)
  /// Null once the plan is deleted (a portal approval replaces all plans). The snapshot has its fingerprint.
  paymentPlanId  String?
  paymentPlan    PaymentPlan?   @relation(fields: [paymentPlanId], references: [id], onDelete: SetNull)
  /// Who the offer is for, typed by the salesperson until phase 4 adds clients (a clientId joins these then).
  clientName     String         @db.VarChar(100)
  clientPhone    String?        @db.VarChar(40)
  clientEmail    String?        @db.VarChar(200)
  language       OfferLanguage  @default(ar)
  currency       Currency
  /// When the offer went out; for one that needed approval, when the team lead approved it.
  issuedAt       DateTime       @default(now())
  validUntil     DateTime
  snapshot       Json
  sentVia        OfferChannel[] @default([])
  /// Percent off the unit price, 0–20.
  discountPct    Decimal        @default(0) @db.Decimal(4, 2)
  status         OfferStatus
  approvedById   String?
  approvedBy     SalesAccount?  @relation("OfferApprover", fields: [approvedById], references: [id], onDelete: SetNull)
  approvedAt     DateTime?
  cancelledById  String?
  cancelledBy    SalesAccount?  @relation("OfferCanceller", fields: [cancelledById], references: [id], onDelete: SetNull)
  cancelledAt    DateTime?
  /// The PDF in Vercel Blob, made once on first request (src/lib/sales/offer-pdf.ts).
  pdfUrl         String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  @@index([salesAccountId, createdAt])
  @@index([developerId, status])
  @@index([unitId])
}
```

- [ ] **Step 4: Generate the migration**

Run: `npx prisma migrate dev --create-only --name sales_offers`
Expected: a new `prisma/migrations/<timestamp>_sales_offers/` that creates the five enums, adds `currency` (`NOT NULL DEFAULT 'EGP'`), the three developer columns, `Unit.zoneId` with its index and an `ON DELETE SET NULL` key, and creates `PlanStep` and `SalesOffer` with their keys and indexes. Nothing is dropped.

Run: `git checkout -- prisma/migrations/migration_lock.toml`

- [ ] **Step 5: CHECK constraints by hand**

Append to the new `migration.sql`:

```sql
-- Ranges the app checks, enforced by the database too (src/lib/sales/offers.ts, src/lib/catalog/plan-steps.ts).
-- Prisma's schema can't describe CHECK constraints and ignores them when diffing; never drop them.
ALTER TABLE "Developer" ADD CONSTRAINT "Developer_offerValidityDays_range" CHECK ("offerValidityDays" BETWEEN 1 AND 30);
ALTER TABLE "Developer" ADD CONSTRAINT "Developer_agentDiscountPct_range" CHECK ("agentDiscountPct" BETWEEN 0 AND 20);
ALTER TABLE "Developer" ADD CONSTRAINT "Developer_leadDiscountPct_range" CHECK ("leadDiscountPct" BETWEEN 0 AND 20);
ALTER TABLE "Developer" ADD CONSTRAINT "Developer_discount_order" CHECK ("agentDiscountPct" <= "leadDiscountPct");
ALTER TABLE "PlanStep" ADD CONSTRAINT "PlanStep_monthOffset_range" CHECK ("monthOffset" BETWEEN 0 AND 360);
ALTER TABLE "PlanStep" ADD CONSTRAINT "PlanStep_pct_range" CHECK ("pct" > 0 AND "pct" <= 100);
ALTER TABLE "SalesOffer" ADD CONSTRAINT "SalesOffer_discountPct_range" CHECK ("discountPct" BETWEEN 0 AND 20);
ALTER TABLE "SalesOffer" ADD CONSTRAINT "SalesOffer_validity" CHECK ("validUntil" > "issuedAt");
```

- [ ] **Step 6: Apply, generate, check for drift**

Run: `npx prisma migrate deploy && npx prisma generate`
Expected: applied; client generated.

Run: `npx prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --script`
Expected: `-- This is an empty migration.` (the phase-2 partial index and CHECKs must not appear).

- [ ] **Step 7: Type-check and commit**

Run: `npx tsc --noEmit` — expected: no output.

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "Schema: project currency, offer settings, plan steps, unit zones and sales offers"
```

---

### Task 3: Money in the project's currency on the public site

**Files:**
- Modify: `src/lib/property.ts`, `src/lib/format.ts`, `src/lib/format.test.ts`, `src/lib/catalog/types.ts`, `src/lib/catalog/summary.ts`, `src/lib/catalog/db-source.ts`, `src/lib/catalog/insights.ts`, `src/lib/catalog/filters.ts`, `src/lib/catalog/budget.ts`, every caller of `formatMoney` / `formatMillions` (list in Step 5), `src/app/api/search/route.ts`, `src/app/[lang]/projects/[slug]/opengraph-image.tsx`

`formatMoney` and `formatMillions` get a **required** currency argument, so the compiler lists every caller and none is left in pounds by mistake.

- [ ] **Step 1: Write the failing test**

Append to `src/lib/format.test.ts` (and add `formatMillions, formatMoney, currencyAr, OFFERS_NOUN` to its import):

```ts
test("money in pounds or dollars, in both languages", () => {
  assert.equal(formatMoney(4_850_000, "ar", "EGP"), "4,850,000 ج.م");
  assert.equal(formatMoney(4_850_000, "en", "EGP"), "EGP 4,850,000");
  assert.equal(formatMoney(250_000, "ar", "USD"), "250,000 دولار");
  assert.equal(formatMoney(250_000, "en", "USD"), "USD 250,000");
  assert.equal(currencyAr("EGP"), "ج.م");
  assert.equal(currencyAr("USD"), "دولار");
});

test("millions for cards", () => {
  assert.equal(formatMillions(4_850_000, "ar", "EGP"), "4.85 مليون");
  assert.equal(formatMillions(4_850_000, "en", "EGP"), "EGP 4.85M");
  assert.equal(formatMillions(1_200_000, "ar", "USD"), "1.20 مليون دولار");
  assert.equal(formatMillions(1_200_000, "en", "USD"), "USD 1.20M");
});

test("offers are counted like the other nouns", () => {
  assert.deepEqual([1, 2, 5, 30].map((n) => countAr(n, OFFERS_NOUN)), ["عرض", "عرضين", "٥ عروض", "٣٠ عرض"]);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npm test`
Expected: FAIL (`currencyAr` is not exported).

- [ ] **Step 3: Implement**

In `src/lib/property.ts`, next to `UNIT_AVAILABILITY`, add:

```ts
/** A project's currency (spec section 4). */
export const CURRENCIES = ["EGP", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];
export const isCurrency = (v: unknown): v is Currency => isOneOf(CURRENCIES, v);
```

In `src/lib/format.ts`, add `import type { Currency } from "@/lib/property";` and replace `formatMoney` and `formatMillions` with:

```ts
const CURRENCY_SIGN = { ar: { EGP: "ج.م", USD: "دولار" }, en: { EGP: "EGP", USD: "USD" } } as const;

/** The currency's name in Arabic form labels: "جنيه" or "دولار". */
export const CURRENCY_NAMES_AR: Record<Currency, string> = { EGP: "جنيه", USD: "دولار" };

/** The sign after an amount on the Arabic screens: "ج.م" or "دولار". */
export const currencyAr = (currency: Currency) => CURRENCY_SIGN.ar[currency];

/** "4,850,000 ج.م" / "EGP 4,850,000", "250,000 دولار" / "USD 250,000". */
export function formatMoney(value: number, locale: Locale, currency: Currency) {
  const n = formatNumber(value, locale);
  return locale === "ar" ? `${n} ${CURRENCY_SIGN.ar[currency]}` : `${CURRENCY_SIGN.en[currency]} ${n}`;
}

/** "4.85 مليون" / "EGP 4.85M" for cards; dollars say so: "1.20 مليون دولار" / "USD 1.20M". */
export function formatMillions(value: number, locale: Locale, currency: Currency) {
  const m = new Intl.NumberFormat(numberLocale(locale), { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value / 1_000_000);
  if (locale === "en") return `${CURRENCY_SIGN.en[currency]} ${m}M`;
  return currency === "EGP" ? `${m} مليون` : `${m} مليون دولار`;
}
```

and next to `HOLDS_NOUN`:

```ts
export const OFFERS_NOUN: CountNoun = { one: "عرض", two: "عرضين", few: "عروض" };
```

- [ ] **Step 4: Run the tests**

Run: `npm test` — the three new tests pass. `npx tsc --noEmit` now lists every caller; Step 5 fixes them.

- [ ] **Step 5: The catalog carries the currency; every caller passes it**

`src/lib/catalog/types.ts`, in `Project`, after `bookingFee`:

```ts
  /** The currency of every price of this project; EGP when not set (the demo data). */
  currency?: Currency;
```

(import `Currency` from `@/lib/property`; fix the `bookingFee` comment to "in the project's currency").

`src/lib/catalog/summary.ts`:

```ts
/** A project's currency. */
export const currencyOf = (p: Pick<Project, "currency">): Currency => p.currency ?? "EGP";
/** Cross-project comparisons (area figures, price filters and sort, "best" marks) are made in pounds only. */
export const inEgp = (p: Pick<Project, "currency">) => currencyOf(p) === "EGP";
```

`src/lib/catalog/db-source.ts`, in `toProject`, next to `bookingFee`: `currency: p.currency,`.

Then pass `currencyOf(project)` (or the hit's / snapshot's currency) at each call:

| File | Change |
| --- | --- |
| `src/app/[lang]/projects/[slug]/page.tsx` | Every `formatMoney`/`formatMillions` gets `currencyOf(project)` (and `currencyOf(other)` for the related projects); JSON-LD `priceCurrency: currencyOf(project)`; pass `currency` to `PaymentCalculator` and `PriceHistory`. |
| `src/app/[lang]/projects/page.tsx` | The budget chips stay in pounds: `formatMoney(f.cash, locale, "EGP")`, same for `monthly`. |
| `src/app/[lang]/page.tsx` | Cards: `currencyOf(project)`. `FaceOff`: when `currencyOf(a) !== currencyOf(b)`, the price row marks no winner (pass equal numbers, e.g. `0, 0`, for its two values) and each side shows its own currency. |
| `src/app/[lang]/compare/page.tsx` | `money(n, currencyOf(project))` per column; for money rows pass `values` only when every compared project has the same currency (otherwise `undefined`, so no "best"). |
| `src/app/[lang]/developers/[slug]/page.tsx`, `src/app/[lang]/new-launches/page.tsx`, `src/components/featured-showcase.tsx`, `src/components/project-card.tsx` | `currencyOf(p)` / `currencyOf(project)`. In `project-card.tsx` the budget-fit line keeps the project's currency. |
| `src/app/[lang]/areas/page.tsx`, `src/app/[lang]/areas/[slug]/page.tsx` | Area figures are EGP only (Step 6): `formatMillions(stats.lowestStartingPrice, locale, "EGP")`. |
| `src/components/map/map-points.ts` | Pin label with `currencyOf(p)`; `priceValue` only for `inEgp(p)` (so a cluster's "from …" compares pounds). |
| `src/components/map/project-map.tsx` | Cluster label `formatMillions(min, locale, "EGP")`; fix the `priceValue` comment ("pounds; undefined for other currencies"). |
| `src/components/project/payment-calculator.tsx` | New required prop `currency: Currency`; `money` uses it. |
| `src/components/project/price-history.tsx` | New required prop `currency: Currency`. |
| `src/components/smart-search.tsx`, `src/app/api/search/route.ts` | Add `currency: Currency` to the hit (`currencyOf(p)`), use it. |
| `src/lib/price-alerts.ts` | `show(key, value, locale, currency)` with the project's currency (load `currency` with the project). |
| `src/app/[lang]/projects/[slug]/opengraph-image.tsx` | `millions(v, currency)` writes `${currency} …M`. |
| `src/app/sales/units/[id]/page.tsx` | Pass `currency={unit.project.currency}` to `PaymentCalculator`; add `currency: Currency` to `SalesUnitDetail.project` and `currency: true` to its project select in `src/lib/sales/inventory.ts` (`loadSalesUnit`). |

- [ ] **Step 6: EGP-only comparisons**

- `src/lib/catalog/insights.ts`: build the area statistics and the per-project values from `projects.filter(inEgp)`. A USD project then has no entry in `values`; make every reader of `insights.values[slug]` (`src/app/[lang]/compare/page.tsx`, `src/app/[lang]/projects/[slug]/page.tsx`, `src/components/insights.tsx`; find them with `grep -rn "values\[" src`) handle `undefined` (they show "-" or skip the line).
- `src/lib/catalog/filters.ts`: in `SORTS.price`, sort pounds first: `price: (a, b) => Number(!inEgp(a)) - Number(!inEgp(b)) || summarize(a).startingPrice - summarize(b).startingPrice`. In `filterProjects`, when `f.minPrice || f.maxPrice`, keep only `inEgp(p)` projects.
- `src/lib/catalog/db-source.ts` `filtersToWhere`: when `f.minPrice || f.maxPrice`, also push `{ currency: "EGP" }`.
- `src/lib/catalog/budget.ts` `budgetFits`: `if (!inEgp(project)) return [];` first (the visitor's budget is in pounds; update the two comments that say "in EGP" to say why).

- [ ] **Step 7: Check**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: clean, all pass.

- [ ] **Step 8: Commit**

```bash
git add -A src/lib src/app src/components
git commit -m "Money in the project's currency on the public site; cross-project comparisons in pounds only"
```

---

### Task 4: The currency setting in the admin, the portal and Excel

**Files:**
- Modify: `src/lib/admin/readers.ts`, `src/lib/admin/labels.ts`, `src/components/admin/project-form.tsx`, `src/lib/portal/fields.ts`, `src/lib/portal/drafts.ts`, `src/lib/admin/import/columns.ts`, `src/lib/admin/import/workbook.ts`
- Create: `src/lib/admin/import/columns.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/admin/import/columns.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { CHOICES, headerMatches, sheetByKey } from "./columns";

test("price columns say «بعملة المشروع» and still read old templates that said «جنيه»", () => {
  const price = sheetByKey("units").columns.find((c) => c.key === "price")!;
  assert.equal(price.header, "سعر الوحدة (بعملة المشروع)");
  assert.equal(headerMatches(price, "سعر الوحدة (بعملة المشروع)"), true);
  assert.equal(headerMatches(price, "سعر الوحدة (جنيه)"), true);
  assert.equal(headerMatches(price, "price"), true, "the field key works too");
  assert.equal(headerMatches(price, "السعر"), false);
});

test("projects have a currency column", () => {
  const currency = sheetByKey("projects").columns.find((c) => c.key === "currency")!;
  assert.equal(currency.type, "choice");
  assert.deepEqual(CHOICES.currency.map((c) => c.value), ["EGP", "USD"]);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npm test` — expected: FAIL (`headerMatches` is not exported).

- [ ] **Step 3: Excel columns**

In `src/lib/admin/import/columns.ts`:
- Import `CURRENCIES`; add to `CHOICES`: `currency: choices(CURRENCIES, { EGP: "جنيه", USD: "دولار" }),`.
- Add to `Column`: `/** Older header texts still accepted on import. */ aliases?: string[];`
- Projects sheet, after `bookingFee`: `{ key: "currency", header: "العملة", type: "choice", choices: CHOICES.currency, help: "فاضي = جنيه. كل أسعار المشروع وخططه وعروضه بالعملة دي، ومفيش تحويل" },`
- Rename the money headers and keep the old text as an alias:
  - `bookingFee`: `header: "مبلغ الحجز (بعملة المشروع)", aliases: ["مبلغ الحجز (جنيه)"]`
  - `priceFrom`: `header: "السعر يبدأ من (بعملة المشروع)", aliases: ["السعر يبدأ من (جنيه)"]`
  - `garageFee`: `header: "الجراج (بعملة المشروع)", aliases: ["الجراج (جنيه)"]`; `clubFee`: same pattern with «النادي».
  - units `price`: `header: "سعر الوحدة (بعملة المشروع)", aliases: ["سعر الوحدة (جنيه)"]`
- Export the matcher (it needs `norm`, which lives in `workbook.ts`; `workbook.ts` imports `columns.ts`, so move `norm` into `columns.ts`, import it in `workbook.ts`, and keep `export { norm } from "./columns";` there for its other users):

```ts
/** Lower-case, no extra spaces, Arabic letter variants folded, so headers match however they were typed. */
export function norm(s: string) { /* the body moved from workbook.ts, unchanged */ }

/** Whether a header cell names this column: its header, an older header, or its field key ("*" ignored). */
export const headerMatches = (col: Column, cell: string) => {
  const h = norm(cell.replace(/\*/g, ""));
  return [col.header, ...(col.aliases ?? [])].some((x) => norm(x) === h) || col.key.toLowerCase() === h;
};
```

In `workbook.ts` `readSheet`, replace the `find` with `def.columns.find((c) => headerMatches(c, String(rawValue(cell) ?? "")))`. In the line `if (priceProblem) say("سعر الوحدة (جنيه)", priceProblem);` use the column's new header. In `currentData`, projects: `currency: label(CHOICES.currency, p.currency),`.

- [ ] **Step 4: Run the tests**

Run: `npm test` — expected: pass.

- [ ] **Step 5: Reading and forms**

- `src/lib/admin/readers.ts` `readProject`: `currency: f.oneOf("currency", CURRENCIES) ?? "EGP",` (not required, so an Excel sheet without the column still creates projects in pounds; `onlyPresent` leaves an existing project's currency alone).
- `src/lib/admin/labels.ts` `options`: `currency: [{ value: "EGP", label: "جنيه مصري" }, { value: "USD", label: "دولار أمريكي" }],`.
- `src/components/admin/project-form.tsx`: next to the booking fee, `<Select name="currency" label="العملة *" defaultValue={p?.currency ?? "EGP"} options={options.currency} hint="كل أسعار المشروع وخططه وعروضه بالعملة دي. تغييرها مش بيحوّل الأرقام." />`; change the booking fee label to «مبلغ الحجز (بعملة المشروع)».
- `src/lib/portal/fields.ts`: in «الحالة والمواعيد», after `bookingFee`: `{ key: "currency", label: "العملة", type: "choice", required: true, choices: CHOICES.currency, hint: "كل أسعار المشروع بالعملة دي" },`; change «(جنيه)» to «(بعملة المشروع)» in `bookingFee`, `priceFrom`, `garageFee`, `clubFee`.
- `src/lib/portal/drafts.ts` `draftFromProject`: `currency: p.currency,`; `emptyProjectDraft` in `draft-types.ts`: `project: { status: "LAUNCH", categories: ["RESIDENTIAL"], currency: "EGP" }`. The review page shows the field through `ALL_PROJECT_FIELDS` with no change.

- [ ] **Step 6: Check and commit**

Run: `npx tsc --noEmit && npm run lint && npm test` — clean.

```bash
git add src/lib/admin src/lib/portal src/components/admin/project-form.tsx
git commit -m "Project currency in the admin, the portal draft and Excel; money columns say «بعملة المشروع»"
```

---

### Task 5: Arabic screens in the project's currency

**Files:**
- Modify: `src/lib/sales/search.ts`, `src/lib/sales/search.test.ts`, `src/lib/sales/inventory.ts`, `src/components/sales/unit-results.tsx`, `src/components/sales/search-filters.tsx`, `src/app/sales/page.tsx`, `src/app/sales/units/[id]/page.tsx`, `src/app/portal/projects/[id]/units/page.tsx`, `src/components/admin/project-parts.tsx`, `src/app/admin/projects/[id]/page.tsx`

- [ ] **Step 1: Write the failing test**

Append to `src/lib/sales/search.test.ts`:

```ts
test("a budget has a currency: pounds unless dollars are chosen", () => {
  assert.equal(readSalesSearch({ budget: "200000", cur: "USD" }).cur, "USD");
  assert.equal(readSalesSearch({ budget: "200000" }).cur, undefined);
  assert.equal(readSalesSearch({ budget: "200000", cur: "EUR" }).cur, undefined);
  assert.match(searchHref(readSalesSearch({ budget: "200000", cur: "USD" })), /cur=USD/);
  assert.doesNotMatch(searchHref(readSalesSearch({ cur: "USD" })), /cur=/, "no budget, no currency");
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npm test` — expected: FAIL.

- [ ] **Step 3: Implement the search parameter**

In `src/lib/sales/search.ts`: add `cur?: Currency` to `SalesSearch` (comment: "The budget's currency; pounds when not set. A budget only matches projects in that currency."); read it with `cur: isCurrency(params.cur) ? params.cur : undefined` (taking the first value when the param is an array, like the other fields); add `"cur"` to `KEYS`; skip it when writing a URL with no budget (next to the existing `by` rule: `if (key === "cur" && next.budget === undefined) continue;`).

- [ ] **Step 4: Inventory**

In `src/lib/sales/inventory.ts`:
- `SalesProject` gets `currency: Currency` (select `currency: true`).
- `searchUnits`: select `project: { select: { id: true, nameAr: true, currency: true } }`; when `s.budget` is set, add to the unit `where`: `typology: { ...existing, project: { currency: s.cur ?? "EGP" } }` (merge with the scope's typology filter: `AND: [salesUnitWhere(developerId), { typology: { project: { currency: s.cur ?? "EGP" } } }]`); `SalesUnitRow` gets `currency: Currency`; the final `rows.sort` compares `Number(a.currency !== "EGP") - Number(b.currency !== "EGP")` before the price.

Run: `npm test` — the new test passes.

- [ ] **Step 5: Screens**

- `src/components/sales/unit-results.tsx`: `Money` takes `currency` and writes `{currencyAr(currency)}` instead of «ج.م»; fix its comment.
- `src/components/sales/search-filters.tsx`: when any project of the developer is in dollars (`projects.some((p) => p.currency === "USD")`, passed from `src/app/sales/page.tsx`), show a `<select name="cur">` («بالجنيه» / «بالدولار») next to the budget amount; otherwise keep the label «المبلغ بالجنيه».
- `src/app/sales/units/[id]/page.tsx`: `money(v)` becomes `money(v, unit.project.currency)` with `currencyAr`; the calculator note becomes «… ومقرّبة: المبالغ الكبيرة لأقرب ألف والأقساط لأقرب ١٠٠.».
- `src/app/portal/projects/[id]/units/page.tsx`: select `currency: true` on the project; `egp(v)` becomes `money(v)` writing `currencyAr(project.currency)`; the unit price label «سعر الوحدة (${CURRENCY_NAMES_AR[project.currency]})».
- `src/components/admin/project-parts.tsx`: `TypologyList`, `UnitList` and `PaymentPlanList` get `currency: Currency`; replace `egp` with a `money(v, currency)` helper; labels «السعر يبدأ من (جنيه) *», «سعر الوحدة (جنيه)», «الجراج (جنيه)», «النادي (جنيه)» use `CURRENCY_NAMES_AR[currency]`. `src/app/admin/projects/[id]/page.tsx` passes `project.currency`.

- [ ] **Step 6: Check, look, commit**

Run: `npx tsc --noEmit && npm run lint && npm test` — clean.
On `next dev` with the throwaway database, set one seeded project to dollars in the admin and look at `/sales` with a budget in dollars, a unit page, the portal units page and the admin project page at 360 px: amounts read «… دولار», nothing overflows.

```bash
git add src/lib/sales src/components/sales src/app/sales src/app/portal src/components/admin src/app/admin
git commit -m "Sales, portal and admin amounts in the project's currency; Sales budget by currency"
```

---

### Task 6: Schedule notation

**Files:**
- Create: `src/lib/catalog/plan-steps.ts`
- Test: `src/lib/catalog/plan-steps.test.ts`

Developers type a custom schedule in one short line, the same in the admin form, the portal draft and Excel. The sample offer's plan (5% down, 5% after 3 months, then 31 quarterly installments, maintenance in three yearly parts) is `0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100`. Percentages keep 6 decimals, so 90/31 is stored as 2.903226 and an installment of a 27,454,000 unit rounds to 797,052 like the sample.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/catalog/plan-steps.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkSteps, formatSteps, parseSteps, spreadEvenly, termsFromSteps, toStepRows } from "./plan-steps";

const SAMPLE = "0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100";

test("single entries, with or without a percent sign", () => {
  const r = parseSteps("0:10, 12:40%, 24:50");
  assert.equal(r.error, null);
  assert.deepEqual(r.steps, [
    { monthOffset: 0, pct: 10, kind: "PAYMENT" },
    { monthOffset: 12, pct: 40, kind: "PAYMENT" },
    { monthOffset: 24, pct: 50, kind: "PAYMENT" },
  ]);
});

test("an even share: each rounded to 6 decimals, the last takes what is left", () => {
  assert.deepEqual(spreadEvenly(90, 31).slice(0, 2), [2.903226, 2.903226]);
  assert.equal(spreadEvenly(90, 31)[30], 2.90322);
  assert.deepEqual(spreadEvenly(100, 3), [33.333333, 33.333333, 33.333334]);
  assert.deepEqual(spreadEvenly(30, 12), Array(12).fill(2.5));
});

test("the sample plan: 33 payments and 3 maintenance parts", () => {
  const r = parseSteps(SAMPLE);
  assert.equal(r.error, null);
  const pay = r.steps.filter((s) => s.kind === "PAYMENT");
  const care = r.steps.filter((s) => s.kind === "MAINTENANCE");
  assert.equal(pay.length, 33);
  assert.deepEqual(pay.slice(0, 3).map((s) => [s.monthOffset, s.pct]), [[0, 5], [3, 5], [6, 2.903226]]);
  assert.deepEqual(pay.at(-1), { monthOffset: 96, pct: 2.90322, kind: "PAYMENT" });
  assert.deepEqual(care.map((s) => s.monthOffset), [9, 21, 33]);
});

test("Arabic digits, Arabic commas and new lines", () => {
  const r = parseSteps("٠:١٠، ١٢:٤٠\n٢٤:٥٠");
  assert.equal(r.error, null);
  assert.deepEqual(r.steps.map((s) => s.monthOffset), [0, 12, 24]);
});

test("nothing typed means no custom schedule", () => {
  assert.deepEqual(parseSteps("  "), { steps: [], error: null });
});

test("mistakes are explained", () => {
  assert.match(parseSteps("0:50, 12:40").error!, /مجموع الدفعات 90%/);
  assert.match(parseSteps("0:50, 0:50").error!, /متكرر/);
  assert.match(parseSteps("abc").error!, /مش فاهم «abc»/);
  assert.match(parseSteps("0:10, 6-95/3:90").error!, /مش بتيجي مظبوطة/);
  assert.match(parseSteps("0:100, صيانة 12:50").error!, /مجموع الصيانة 50%/);
  assert.match(parseSteps("0:99.1234567, 1:0.8765433").error!, /6 أرقام/);
  assert.match(parseSteps("0:50, 400:50").error!, /برّه المدى/);
  assert.match(parseSteps("صيانة 12:100").error!, /مجموع الدفعات 0%/);
});

test("checkSteps accepts what parseSteps makes", () => {
  assert.equal(checkSteps(parseSteps(SAMPLE).steps), null);
  assert.equal(checkSteps([]), null);
});

test("written back in the shortest form, and read again to the same steps", () => {
  assert.equal(formatSteps(parseSteps(SAMPLE).steps), SAMPLE);
  for (const text of ["0:10, 12:40, 24:50", "0:20, 1-12/1:30, 24:50", "0:100", "0:10, 3:30, 6:60, صيانة 12:100"]) {
    const steps = parseSteps(text).steps;
    assert.equal(formatSteps(steps), text);
    assert.deepEqual(parseSteps(formatSteps(steps)).steps, steps);
  }
});

test("the plan's headline terms come from its steps", () => {
  assert.deepEqual(termsFromSteps(parseSteps(SAMPLE).steps), { downPaymentPct: 5, deliveryPaymentPct: 0, years: 8 });
  assert.deepEqual(termsFromSteps(parseSteps("0:100").steps), { downPaymentPct: 100, deliveryPaymentPct: 0, years: 0 });
  assert.deepEqual(termsFromSteps(parseSteps("3:50, 13:50").steps), { downPaymentPct: 0, deliveryPaymentPct: 0, years: 2 });
});

test("rows for the database keep the order", () => {
  const rows = toStepRows(parseSteps("صيانة 12:100, 0:10, 12:90").steps);
  assert.deepEqual(rows.map((r) => [r.kind, r.monthOffset, r.sortOrder]), [["PAYMENT", 0, 0], ["PAYMENT", 12, 1], ["MAINTENANCE", 12, 2]]);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npm test` — expected: FAIL, `Cannot find module './plan-steps'`.

- [ ] **Step 3: Implement**

```ts
// src/lib/catalog/plan-steps.ts

// A plan's custom payment schedule (spec section 4) and the short notation developers type it in,
// the same in the admin, the portal and Excel:
//
//   0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100
//
// "M:P" is P% at month M after the contract (0 = at contract). "A-B/S:T" spreads T% evenly over months
// A, A+S, …, B. An entry starting with «صيانة» (or "maintenance") is a share of the maintenance deposit
// instead of the unit price. Payments must add up to exactly 100%, maintenance to 100% or nothing.
// Percentages keep 6 decimals and are added in millionths, so the sums are exact. Pure, so it is tested.

export const STEP_KINDS = ["PAYMENT", "MAINTENANCE"] as const;
export type StepKind = (typeof STEP_KINDS)[number];
export type PlanStepInput = { monthOffset: number; pct: number; kind: StepKind };

export const MAX_STEP_MONTH = 360;
export const MAX_STEPS = 400;

const SCALE = 1_000_000;
const HUNDRED = 100 * SCALE;
const units = (pct: number) => Math.round(pct * SCALE);
const pctOf = (u: number) => u / SCALE;
const sumUnits = (steps: PlanStepInput[]) => steps.reduce((sum, s) => sum + units(s.pct), 0);

/** `total`% over `count` steps: each the same share rounded to 6 decimals, the last takes what is left. */
export function spreadEvenly(total: number, count: number): number[] {
  const t = units(total);
  const each = Math.round(t / count);
  return Array.from({ length: count }, (_, i) => pctOf(i === count - 1 ? t - each * (count - 1) : each));
}

/** A percentage as written back: up to 6 decimals, no trailing zeros ("2.903226", "5"). */
export const formatPct = (pct: number) => String(Number(pct.toFixed(6)));

/** Payments first, then maintenance, each by month. */
export const sortSteps = (steps: PlanStepInput[]) =>
  [...steps].sort((a, b) => (a.kind === b.kind ? a.monthOffset - b.monthOffset : a.kind === "PAYMENT" ? -1 : 1));

/** Western digits and "." for decimals; Arabic commas, semicolons and new lines separate entries. */
const normalise = (text: string) =>
  text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, ".")
    .replace(/[،؛;\r\n]/g, ",");

const ENTRY = /^(?:(صيانة|maintenance)\s*)?(\d+)(?:\s*-\s*(\d+)\s*\/\s*(\d+))?\s*:\s*(\d+(?:\.\d+)?)\s*%?$/i;

export type StepsResult = { steps: PlanStepInput[]; error: string | null };

/** Reads the notation. Empty text is no custom schedule; any mistake is explained in Arabic. */
export function parseSteps(text: string): StepsResult {
  const fail = (error: string): StepsResult => ({ steps: [], error });
  const steps: PlanStepInput[] = [];
  for (const raw of normalise(text).split(",")) {
    const entry = raw.trim();
    if (!entry) continue;
    const m = ENTRY.exec(entry);
    if (!m) return fail(`مش فاهم «${entry}». اكتب الشهر:النسبة زي 0:10، أو من-لحد/كل:النسبة زي 3-96/3:90`);
    if ((m[5].split(".")[1] ?? "").length > 6) return fail(`النسبة في «${entry}» فيها أكتر من 6 أرقام بعد العلامة`);
    const kind: StepKind = m[1] ? "MAINTENANCE" : "PAYMENT";
    const from = Number(m[2]);
    const pct = Number(m[5]);
    if (m[3] === undefined) {
      steps.push({ monthOffset: from, pct, kind });
      continue;
    }
    const to = Number(m[3]);
    const every = Number(m[4]);
    if (every < 1 || to <= from || (to - from) % every !== 0) return fail(`«${entry}»: من شهر ${from} لشهر ${to} كل ${every} شهور مش بتيجي مظبوطة`);
    const count = (to - from) / every + 1;
    if (count > MAX_STEPS) return fail(`«${entry}» فيها دفعات كتير`);
    spreadEvenly(pct, count).forEach((p, i) => steps.push({ monthOffset: from + i * every, pct: p, kind }));
  }
  const sorted = sortSteps(steps);
  const error = checkSteps(sorted);
  return error ? fail(error) : { steps: sorted, error: null };
}

/** Why these steps can't be saved, or null. No steps at all is fine: the plan has no custom schedule. */
export function checkSteps(steps: PlanStepInput[]): string | null {
  if (steps.length === 0) return null;
  if (steps.length > MAX_STEPS) return `الجدول فيه أكتر من ${MAX_STEPS} دفعة`;
  const seen = new Set<string>();
  const sums: Record<StepKind, number> = { PAYMENT: 0, MAINTENANCE: 0 };
  for (const s of steps) {
    if (!Number.isInteger(s.monthOffset) || s.monthOffset < 0 || s.monthOffset > MAX_STEP_MONTH) return `الشهر ${s.monthOffset} برّه المدى (من 0 لـ ${MAX_STEP_MONTH})`;
    const u = units(s.pct);
    if (!(u > 0) || u > HUNDRED) return `النسبة ${formatPct(s.pct)}% لازم تبقى أكبر من صفر ولحد 100`;
    const key = `${s.kind}:${s.monthOffset}`;
    if (seen.has(key)) return `الشهر ${s.monthOffset} متكرر في ${s.kind === "PAYMENT" ? "الدفعات" : "الصيانة"}`;
    seen.add(key);
    sums[s.kind] += u;
  }
  if (sums.PAYMENT !== HUNDRED) return `مجموع الدفعات ${formatPct(pctOf(sums.PAYMENT))}% ولازم يبقى 100%`;
  if (sums.MAINTENANCE !== 0 && sums.MAINTENANCE !== HUNDRED) return `مجموع الصيانة ${formatPct(pctOf(sums.MAINTENANCE))}% ولازم يبقى 100% أو من غير صيانة خالص`;
  return null;
}

/** One kind's steps (sorted by month) as entries; three or more even steps at a steady gap become a range. */
function entries(list: PlanStepInput[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < list.length) {
    let taken = 1;
    if (i + 2 < list.length) {
      const gap = list[i + 1].monthOffset - list[i].monthOffset;
      let end = i + 1;
      while (end + 1 < list.length && list[end + 1].monthOffset - list[end].monthOffset === gap) end++;
      for (; end >= i + 2; end--) {
        const run = list.slice(i, end + 1);
        const even = spreadEvenly(pctOf(sumUnits(run)), run.length);
        if (even.every((p, k) => units(p) === units(run[k].pct))) {
          taken = run.length;
          break;
        }
      }
    }
    if (taken >= 3) {
      const run = list.slice(i, i + taken);
      out.push(`${run[0].monthOffset}-${run[taken - 1].monthOffset}/${run[1].monthOffset - run[0].monthOffset}:${formatPct(pctOf(sumUnits(run)))}`);
    } else out.push(`${list[i].monthOffset}:${formatPct(list[i].pct)}`);
    i += taken;
  }
  return out;
}

/** The steps in the notation, in its shortest form. */
export function formatSteps(steps: PlanStepInput[]): string {
  const sorted = sortSteps(steps);
  const pay = entries(sorted.filter((s) => s.kind === "PAYMENT"));
  const care = entries(sorted.filter((s) => s.kind === "MAINTENANCE")).map((e) => `صيانة ${e}`);
  return [...pay, ...care].join(", ");
}

/**
 * A stepped plan's headline terms, stored on the plan so cards, filters, the budget search and the
 * calculator keep working: the down payment is what is due at month 0, the term the last payment's
 * month in years (rounded up), and no separate delivery payment.
 */
export function termsFromSteps(steps: PlanStepInput[]) {
  const pay = steps.filter((s) => s.kind === "PAYMENT");
  const down = pctOf(sumUnits(pay.filter((s) => s.monthOffset === 0)));
  const last = Math.max(0, ...pay.map((s) => s.monthOffset));
  return { downPaymentPct: Math.round(down * 100) / 100, deliveryPaymentPct: 0, years: Math.ceil(last / 12) };
}

/** Rows for `PlanStep`, in order. */
export const toStepRows = (steps: PlanStepInput[]) =>
  sortSteps(steps).map((s, i) => ({ monthOffset: s.monthOffset, pct: s.pct, kind: s.kind, sortOrder: i }));

/** Database rows (Decimal percentages) as steps. */
export const stepsOf = (rows: { monthOffset: number; pct: { toString(): string } | number; kind: StepKind }[]): PlanStepInput[] =>
  sortSteps(rows.map((r) => ({ monthOffset: r.monthOffset, pct: Number(r.pct), kind: r.kind })));
```

- [ ] **Step 4: Run the tests**

Run: `npm test` — expected: all pass (10 new).

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalog/plan-steps.ts src/lib/catalog/plan-steps.test.ts
git commit -m "Schedule notation: parse, check and write back a plan's custom steps"
```

---

### Task 7: Schedule math

**Files:**
- Create: `src/lib/catalog/schedule.ts`
- Test: `src/lib/catalog/schedule.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/catalog/schedule.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseSteps } from "./plan-steps";
import {
  addMonths,
  buildSchedule,
  cairoDate,
  maintenanceAmount,
  monthsBetween,
  pageRows,
  payablePrice,
  planFingerprint,
  planSteps,
  splitAmount,
  type SchedulePlan,
} from "./schedule";

const plan = (over: Partial<SchedulePlan> = {}): SchedulePlan => ({
  downPaymentPct: 10,
  deliveryPaymentPct: 0,
  years: 2,
  frequency: "QUARTERLY",
  cashDiscountPct: null,
  maintenancePct: null,
  steps: [],
  ...over,
});

test("the sample offer: 27,454,000 on 5% + 5% + 31 quarterly installments, 10% maintenance in three parts", () => {
  const steps = parseSteps("0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100").steps;
  const s = buildSchedule(27_454_000, steps, maintenanceAmount(27_454_000, { maintenancePct: 10 }), 36);
  assert.equal(s.maintenance, 2_745_400);
  assert.equal(s.total, 30_199_400);
  assert.equal(s.payments, 33);
  assert.equal(s.maintenancePayments, 3);
  assert.equal(s.rows.length, 33, "maintenance falls on installment months");
  const [down, first, second, third] = s.rows;
  assert.deepEqual([down.installment, down.amount, down.monthOffset], [0, 1_372_700, 0]);
  assert.deepEqual([first.installment, first.amount], [1, 1_372_700]);
  assert.deepEqual([second.installment, second.amount], [2, 797_052]);
  assert.deepEqual([third.monthOffset, third.amount, third.maintenance, third.total], [9, 797_052, 915_133, 1_712_185]);
  assert.equal(Number(third.cumulativePct.toFixed(2)), 15.81);
  const last = s.rows.at(-1)!;
  assert.deepEqual([last.installment, last.monthOffset, last.amount, last.cumulativePct], [32, 96, 797_040, 100]);
  assert.equal(s.rows.reduce((sum, r) => sum + r.amount, 0), 27_454_000);
  assert.equal(s.rows.reduce((sum, r) => sum + r.maintenance, 0), 2_745_400);
  assert.equal(s.rows.find((r) => r.monthOffset === 33)!.maintenance, 915_134, "the last part takes the rounding");
});

test("split: each part rounded, the last takes the rest", () => {
  assert.deepEqual(splitAmount(100, [33.333333, 33.333333, 33.333334]), [33, 33, 34]);
  assert.deepEqual(splitAmount(1_000_001, [50, 50]), [500_001, 500_000]);
});

test("a plan without steps: down payment, equal installments, delivery payment at handover", () => {
  const steps = planSteps(plan({ deliveryPaymentPct: 10 }), 30);
  assert.equal(steps.length, 1 + 8 + 1);
  assert.deepEqual(steps[0], { monthOffset: 0, pct: 10, kind: "PAYMENT" });
  assert.deepEqual(steps.slice(1, 9).map((s) => s.monthOffset), [3, 6, 9, 12, 15, 18, 21, 24]);
  assert.equal(steps[1].pct, 10);
  assert.deepEqual(steps[9], { monthOffset: 30, pct: 10, kind: "PAYMENT" });
  const s = buildSchedule(1_000_000, steps, 0, 30);
  assert.deepEqual(s.rows.map((r) => r.amount), [100_000, ...Array(8).fill(100_000), 100_000]);
});

test("a delivery payment on an installment month shares its row", () => {
  const s = buildSchedule(1_000_000, planSteps(plan({ deliveryPaymentPct: 10 }), 24), 0, 24);
  assert.equal(s.rows.length, 9);
  assert.equal(s.rows.at(-1)!.amount, 200_000);
  assert.equal(s.payments, 10);
});

test("a cash plan is one payment, after its discount", () => {
  const cash = plan({ years: 0, downPaymentPct: 100, cashDiscountPct: 15 });
  assert.deepEqual(planSteps(cash, 12), [{ monthOffset: 0, pct: 100, kind: "PAYMENT" }]);
  assert.equal(payablePrice(2_000_000, cash), 1_700_000);
  assert.equal(payablePrice(2_000_000, cash, 5), 1_615_000);
  assert.equal(payablePrice(2_000_000, plan(), 2.5), 1_950_000);
});

test("maintenance without its own steps is paid at handover", () => {
  const s = buildSchedule(1_000_000, planSteps(plan(), 40), 80_000, 40);
  const handover = s.rows.find((r) => r.monthOffset === 40)!;
  assert.deepEqual([handover.installment, handover.amount, handover.maintenance], [null, 0, 80_000]);
  assert.equal(s.maintenancePayments, 1);
});

test("dates: calendar months, the 31st becomes the month's last day, Cairo's today", () => {
  assert.equal(addMonths("2026-11-12", 3), "2027-02-12");
  assert.equal(addMonths("2026-01-31", 1), "2026-02-28");
  assert.equal(addMonths("2027-12-31", 2), "2028-02-29");
  assert.equal(cairoDate(new Date("2026-11-18T23:30:00Z")), "2026-11-19");
  assert.equal(monthsBetween("2026-11-12", "2029-06-30"), 31);
  assert.equal(monthsBetween("2026-11-12", "2025-06-30"), 0);
});

test("a fingerprint changes with any term or step", () => {
  const base = { ...plan({ steps: parseSteps("0:10, 12:90").steps }), typologyId: null };
  assert.equal(planFingerprint(base), planFingerprint({ ...base, steps: [...base.steps].reverse() }));
  assert.notEqual(planFingerprint(base), planFingerprint({ ...base, maintenancePct: 8 }));
  assert.notEqual(planFingerprint(base), planFingerprint({ ...base, steps: parseSteps("0:10, 24:90").steps }));
  assert.notEqual(planFingerprint(base), planFingerprint({ ...base, typologyId: "t1" }));
});

test("rows split into pages", () => {
  const rows = Array.from({ length: 33 }, (_, i) => i);
  assert.deepEqual(pageRows(rows, 12, 16).map((p) => p.length), [12, 16, 5]);
  assert.deepEqual(pageRows([1, 2], 12, 16), [[1, 2]]);
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npm test` — expected: FAIL, `Cannot find module './schedule'`.

- [ ] **Step 3: Implement**

```ts
// src/lib/catalog/schedule.ts
import { INSTALLMENTS_PER_YEAR, type InstallmentFrequency } from "@/lib/property";
import { formatPct, sortSteps, type PlanStepInput } from "./plan-steps";

// A payment plan laid out installment by installment, for price offers (spec section 7): the month,
// the amount and its share of the price, the running share, the maintenance due that month and the
// total. Amounts are whole pounds (or dollars); each is rounded and the last of its kind takes the
// rounding, so the totals are exact. Months count from the offer's issue date. Pure, so it is tested.

export type SchedulePlan = {
  downPaymentPct: number;
  deliveryPaymentPct: number;
  years: number;
  frequency: InstallmentFrequency;
  cashDiscountPct?: number | null;
  maintenancePct?: number | null;
  steps: PlanStepInput[];
};

export type ScheduleRow = {
  monthOffset: number;
  /** 0 for the payment at contract, 1, 2, … for the installments after it; null for maintenance only. */
  installment: number | null;
  amount: number;
  /** This row's share of the price, and the running share, in percent (100 from the last payment on). */
  pct: number;
  cumulativePct: number;
  maintenance: number;
  total: number;
};

export type Schedule = {
  price: number;
  maintenance: number;
  total: number;
  rows: ScheduleRow[];
  /** Cheques: one per payment step and one per maintenance step. */
  payments: number;
  maintenancePayments: number;
};

/** Splits a whole amount by shares that add up to 100: each rounded, the last takes what is left. */
export function splitAmount(total: number, pcts: number[]): number[] {
  let given = 0;
  return pcts.map((p, i) => {
    if (i === pcts.length - 1) return total - given;
    const a = Math.round((total * p) / 100);
    given += a;
    return a;
  });
}

/** Paid in full at contract. */
export const isCashPlan = (plan: Pick<SchedulePlan, "years">) => plan.years === 0;

/** What the buyer pays for the unit: the cash discount on a cash plan, then the offer's discount, in whole pounds. */
export function payablePrice(listPrice: number, plan: Pick<SchedulePlan, "years" | "cashDiscountPct">, discountPct = 0): number {
  const cash = isCashPlan(plan) ? 1 - (plan.cashDiscountPct ?? 0) / 100 : 1;
  return Math.round(listPrice * cash * (1 - discountPct / 100));
}

/** The maintenance deposit on that price, in whole pounds. */
export const maintenanceAmount = (price: number, plan: Pick<SchedulePlan, "maintenancePct">) => Math.round((price * (plan.maintenancePct ?? 0)) / 100);

/**
 * The steps a plan is paid by: its own steps, or its terms laid out as the site has always shown them
 * (down payment at contract, equal installments every 12/perYear months, delivery payment at handover).
 * A cash plan is one payment at contract.
 */
export function planSteps(plan: SchedulePlan, handoverMonth: number): PlanStepInput[] {
  if (plan.steps.length) return sortSteps(plan.steps);
  if (isCashPlan(plan)) return [{ monthOffset: 0, pct: 100, kind: "PAYMENT" }];
  const perYear = INSTALLMENTS_PER_YEAR[plan.frequency];
  const every = 12 / perYear;
  const count = plan.years * perYear;
  const rest = 100 - plan.downPaymentPct - plan.deliveryPaymentPct;
  const steps: PlanStepInput[] = [];
  if (plan.downPaymentPct > 0) steps.push({ monthOffset: 0, pct: plan.downPaymentPct, kind: "PAYMENT" });
  if (rest > 0) for (let k = 1; k <= count; k++) steps.push({ monthOffset: k * every, pct: rest / count, kind: "PAYMENT" });
  if (plan.deliveryPaymentPct > 0) steps.push({ monthOffset: Math.max(0, handoverMonth), pct: plan.deliveryPaymentPct, kind: "PAYMENT" });
  return steps;
}

type MonthTotals = { amount: number; pct: number; maintenance: number; payments: number };

/**
 * The schedule for `price` (already discounted) with `maintenance` as the deposit. Maintenance follows
 * the maintenance steps, or is one payment at handover when there are none. Steps on the same month
 * share a row.
 */
export function buildSchedule(price: number, steps: PlanStepInput[], maintenance: number, handoverMonth: number): Schedule {
  const pay = sortSteps(steps.filter((s) => s.kind === "PAYMENT"));
  let care = sortSteps(steps.filter((s) => s.kind === "MAINTENANCE"));
  if (maintenance <= 0) care = [];
  else if (care.length === 0) care = [{ monthOffset: Math.max(0, handoverMonth), pct: 100, kind: "MAINTENANCE" }];
  const payAmounts = splitAmount(price, pay.map((s) => s.pct));
  const careAmounts = splitAmount(maintenance, care.map((s) => s.pct));
  const byMonth = new Map<number, MonthTotals>();
  const at = (m: number) => {
    let r = byMonth.get(m);
    if (!r) byMonth.set(m, (r = { amount: 0, pct: 0, maintenance: 0, payments: 0 }));
    return r;
  };
  pay.forEach((s, i) => {
    const r = at(s.monthOffset);
    r.amount += payAmounts[i];
    r.pct += s.pct;
    r.payments++;
  });
  care.forEach((s, i) => (at(s.monthOffset).maintenance += careAmounts[i]));
  const lastPayment = pay.length ? pay[pay.length - 1].monthOffset : 0;
  let cumulative = 0;
  let installment = 0;
  const rows = [...byMonth.keys()]
    .sort((a, b) => a - b)
    .map((m): ScheduleRow => {
      const r = byMonth.get(m)!;
      cumulative += r.pct;
      return {
        monthOffset: m,
        installment: r.payments ? (m === 0 ? 0 : ++installment) : null,
        amount: r.amount,
        pct: r.pct,
        cumulativePct: m >= lastPayment ? 100 : cumulative,
        maintenance: r.maintenance,
        total: r.amount + r.maintenance,
      };
    });
  return { price, maintenance, total: price + maintenance, rows, payments: pay.length, maintenancePayments: care.length };
}

/** "2026-11-12" plus `months`, on the calendar: the 31st becomes the month's last day. */
export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const year = Math.floor(total / 12);
  const month = total % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

/** A moment's date on Cairo's calendar, "YYYY-MM-DD" (servers run on UTC). */
export const cairoDate = (at: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(at);

/** Whole calendar months from one date to a later one; 0 when it is not later. */
export function monthsBetween(fromIso: string, toIso: string): number {
  const [fy, fm] = fromIso.split("-").map(Number);
  const [ty, tm] = toIso.split("-").map(Number);
  return Math.max(0, (ty - fy) * 12 + (tm - fm));
}

/** Everything about a plan that changes an offer's figures. An offer whose plan no longer matches any current plan shows «السعر اتغيّر». */
export function planFingerprint(plan: SchedulePlan & { typologyId: string | null }): string {
  return JSON.stringify([
    plan.typologyId,
    plan.downPaymentPct,
    plan.deliveryPaymentPct,
    plan.years,
    plan.frequency,
    plan.cashDiscountPct ?? 0,
    plan.maintenancePct ?? 0,
    sortSteps(plan.steps).map((s) => [s.kind, s.monthOffset, formatPct(s.pct)]),
  ]);
}

/** Rows split into pages: `first` on the first schedule page (it has the plan's header), `rest` on each page after. */
export function pageRows<T>(rows: T[], first: number, rest: number): T[][] {
  const pages = [rows.slice(0, first)];
  for (let i = first; i < rows.length; i += rest) pages.push(rows.slice(i, i + rest));
  return pages;
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test` — expected: all pass (9 new). If the sample's installments come out 797,051, the percentages were cut instead of rounded: check `spreadEvenly`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/catalog/schedule.ts src/lib/catalog/schedule.test.ts
git commit -m "Schedule math: installment by installment, whole pounds, the last takes the rounding"
```

---

### Task 8: Plan steps in the admin

**Files:**
- Modify: `src/lib/admin/readers.ts`, `src/app/admin/actions.ts`, `src/components/admin/project-parts.tsx`, `src/app/admin/projects/[id]/page.tsx`
- Create: `src/components/admin/schedule-field.tsx`

- [ ] **Step 1: The reader**

Replace `readPaymentPlan` in `src/lib/admin/readers.ts` (import `parseSteps`, `termsFromSteps` from `@/lib/catalog/plan-steps`):

```ts
/**
 * A payment plan. With a custom schedule in `steps` (the notation in catalog/plan-steps.ts), the down
 * payment, years and delivery payment are taken from the steps, so they needn't be typed.
 */
export function readPaymentPlan(f: FormReader) {
  const parsed = parseSteps(f.text("steps", { max: 5000 }) ?? "");
  if (parsed.error) f.errors.steps = parsed.error;
  const terms = parsed.steps.length ? termsFromSteps(parsed.steps) : null;
  const down = f.pct("downPaymentPct", { required: !terms });
  const delivery = f.pct("deliveryPaymentPct") ?? 0;
  if (!terms && down !== null && down + delivery > 100) f.errors.deliveryPaymentPct = "المقدم + دفعة الاستلام أكثر من 100%";
  const years = f.int("years", { required: !terms, min: 0, max: 30 });
  return {
    nameAr: f.text("nameAr", { max: 200 }),
    nameEn: f.text("nameEn", { max: 200 }),
    downPaymentPct: terms?.downPaymentPct ?? down ?? 0,
    deliveryPaymentPct: terms ? terms.deliveryPaymentPct : delivery,
    years: terms?.years ?? years ?? 0,
    frequency: f.oneOf("frequency", INSTALLMENT_FREQUENCIES, { required: true }) ?? "QUARTERLY",
    cashDiscountPct: f.pct("cashDiscountPct"),
    maintenancePct: f.pct("maintenancePct"),
    garageFee: f.number("garageFee", { min: 0 }),
    clubFee: f.number("clubFee", { min: 0 }),
    validUntil: f.date("validUntil"),
    isActive: f.bool("isActive"),
    /** The custom schedule; empty for a plan paid by its terms. Written as nested PlanStep rows by the caller. */
    steps: parsed.steps,
  };
}
```

Run: `npx tsc --noEmit`. It now fails in the three places that write a plan (`savePaymentPlan`, the portal approval, the Excel import) because `steps` isn't a column; this task fixes the first, Tasks 9 and 10 the others. Until then, in `src/lib/portal/drafts.ts` and `src/lib/admin/import/workbook.ts` destructure `const { steps: _steps, ...p }` where the plan is written and `void _steps;`, so the build stays green between tasks.

- [ ] **Step 2: Saving in the admin**

In `src/app/admin/actions.ts`, replace `savePaymentPlan` (import `toStepRows`):

```ts
export async function savePaymentPlan(_: FormState, data: FormData): Promise<FormState> {
  await requireAdmin();
  const f = new FormReader(data);
  const id = f.id("id");
  const projectId = f.id("projectId");
  const { steps, ...plan } = readPaymentPlan(f);
  const values = { ...plan, typologyId: f.id("typologyId") };
  if (!f.ok || !projectId) return f.result();
  const rows = toStepRows(steps);
  // One statement: the plan and its steps change together.
  if (id) await db.paymentPlan.update({ where: { id, projectId }, data: { ...values, steps: { deleteMany: {}, create: rows } } });
  else await db.paymentPlan.create({ data: { ...values, projectId, steps: { create: rows } } });
  await touchPrices(projectId);
  published();
  return id ? SAVED : { ok: true, message: "تمت الإضافة ✓" };
}
```

- [ ] **Step 3: The schedule field**

Add the field's help to `src/lib/catalog/plan-steps.ts` (the portal's field list uses it too, and can't import a client component):

```ts
/** Help under the schedule field, in the admin and the portal. */
export const SCHEDULE_HINT =
  "اختياري، لو الخطة مش أقساط متساوية. اكتب الشهر:النسبة مفصولين بفاصلة، و«من-لحد/كل:النسبة» لدفعات متساوية، و«صيانة» قبل دفعات الصيانة. مثال: 0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100. لو كتبته، المقدم والسنين بيتحسبوا منه.";
```

```tsx
// src/components/admin/schedule-field.tsx
"use client";

import { useState } from "react";
import { countAr, formatCountAr } from "@/lib/format";
import { SCHEDULE_HINT, formatPct, parseSteps } from "@/lib/catalog/plan-steps";

const PAYMENTS = { one: "دفعة", two: "دفعتين", few: "دفعات" };

/** What the typed schedule means, or what's wrong with it. Shared by the admin form and the portal editor. */
export function SchedulePreview({ text }: { text: string }) {
  if (!text.trim()) return null;
  const { steps, error } = parseSteps(text);
  if (error) return <span className="text-xs text-red-700 dark:text-red-300">{error}</span>;
  const pay = steps.filter((s) => s.kind === "PAYMENT");
  const care = steps.filter((s) => s.kind === "MAINTENANCE");
  const down = pay.filter((s) => s.monthOffset === 0).reduce((sum, s) => sum + s.pct, 0);
  return (
    <span className="text-xs text-muted">
      ✓ {countAr(pay.length, PAYMENTS)}، المقدم <bdi dir="ltr">{formatPct(down)}%</bdi>، آخر دفعة بعد {formatCountAr(pay.at(-1)!.monthOffset)} شهر
      {care.length > 0 && <>، والصيانة على {countAr(care.length, PAYMENTS)}</>}
    </span>
  );
}

/** The plan's custom schedule in the notation, with a live check under it. */
export function ScheduleField({ name, defaultValue, error }: { name: string; defaultValue?: string; error?: string }) {
  const [text, setText] = useState(defaultValue ?? "");
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink">جدول سداد مخصص</span>
      <textarea name={name} className="admin-input font-mono" dir="ltr" rows={2} value={text} aria-invalid={error ? true : undefined} onChange={(e) => setText(e.target.value)} />
      <SchedulePreview text={text} />
      <span className="text-xs text-muted">{SCHEDULE_HINT}</span>
      {error && <span className="text-xs text-red-700 dark:text-red-300">{error}</span>}
    </label>
  );
}
```

(Check how `TextField` in `src/components/admin/fields.tsx` receives the field's error from the form state, and pass it the same way; if errors are shown by the form itself, drop the `error` prop.)

- [ ] **Step 4: The form and the list**

In `src/app/admin/projects/[id]/page.tsx`, load the steps: `paymentPlans: { orderBy: …, include: { steps: { orderBy: { sortOrder: "asc" } } } }`.

In `src/components/admin/project-parts.tsx` `PaymentPlanList`, type the items as `(PaymentPlan & { steps: PlanStep[] })[]`, and:
- in `summary`, after the years, `{p.steps.length > 0 && <span className="admin-badge">جدول مخصص</span>}`;
- in `fields`, after the first `Row`, `<ScheduleField name="steps" defaultValue={p ? formatSteps(stepsOf(p.steps)) : ""} />`;
- hint on «المقدم % *» and «عدد السنوات *»: «مش لازم لو فيه جدول مخصص».

- [ ] **Step 5: Check, try it, commit**

Run: `npx tsc --noEmit && npm run lint && npm test` — clean.
On `next dev`, save a plan with `0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100`: it shows «جدول مخصص», the down payment reads 5% and the years 8; reopening it shows the same text. Save `0:50, 12:40`: the form refuses with «مجموع الدفعات 90%…». Empty the field and save: the steps are gone.

```bash
git add src/lib/admin/readers.ts src/lib/catalog/plan-steps.ts src/app/admin src/components/admin src/lib/portal/drafts.ts src/lib/admin/import/workbook.ts
git commit -m "Admin: custom payment schedules on plans, typed in the schedule notation"
```

---

### Task 9: Plan steps in the portal draft

**Files:**
- Modify: `src/lib/portal/fields.ts`, `src/lib/portal/drafts.ts`, `src/components/portal/editor.tsx`

Steps go through review like every other plan field: the draft holds the notation text, the admin sees it in the comparison, approval writes the rows.

- [ ] **Step 1: The field**

In `src/lib/portal/fields.ts`: add `"schedule"` to `FieldType`, and to `PLAN_FIELDS`, after `frequency`:

```ts
  { key: "steps", label: "جدول سداد مخصص", type: "schedule", dir: "ltr", span: 4, hint: SCHEDULE_HINT },
```

(import `SCHEDULE_HINT` from `@/lib/catalog/plan-steps`). Add the hint «مش لازم لو فيه جدول مخصص» to `downPaymentPct` and `years`.

- [ ] **Step 2: Draft from the live project, and approval**

In `src/lib/portal/drafts.ts`:
- `projectInclude.paymentPlans` gets `steps: { orderBy: { sortOrder: "asc" } }` in its `include`;
- `draftFromProject` plans: `steps: formatSteps(stepsOf(pl.steps)),`;
- where approval creates the plans (the loop over `values.plans`, replacing the temporary `_steps` of Task 8):

```ts
  for (const { typologyCode, steps, ...p } of values.plans) {
    await tx.paymentPlan.create({
      data: { ...p, projectId: id, typologyId: typologyCode ? (typId.get(typologyCode.toLowerCase()) ?? null) : null, steps: { create: toStepRows(steps) } },
    });
  }
```

`checkProjectDraft` already runs `readPaymentPlan`, so a wrong schedule shows as `plans.<i>.steps` under the field.

- [ ] **Step 3: The editor**

In `src/components/portal/editor.tsx`, in the field component, before the `textarea` branch:

```tsx
  if (def.type === "schedule") {
    control = (
      <>
        <textarea className="admin-input font-mono" rows={2} dir="ltr" value={text} aria-invalid={invalid} onChange={(e) => onChange(e.target.value)} />
        <SchedulePreview text={text} />
      </>
    );
  } else if (def.type === "textarea") {
```

(import `SchedulePreview` from `@/components/admin/schedule-field`). In the plans row summary, add `p.steps && "جدول مخصص"`. The review page (`src/lib/portal/review.ts`) shows strings as typed, so the admin reads the notation; nothing to change there.

- [ ] **Step 4: Check, try it, commit**

Run: `npx tsc --noEmit && npm run lint && npm test` — clean.
On `next dev`, as a portal account: edit a project, type a schedule in a plan, save the draft, reopen it (same text), send it; as the admin, the review shows «جدول سداد مخصص: 0:5, …»; approve; the live plan has the steps (the admin form shows them).

```bash
git add src/lib/portal src/components/portal
git commit -m "Portal: custom payment schedules in project drafts, reviewed like other plan data"
```

---

### Task 10: Plan steps in Excel

**Files:**
- Modify: `src/lib/admin/import/columns.ts`, `src/lib/admin/import/workbook.ts`

- [ ] **Step 1: The column**

In the plans sheet of `columns.ts`, after `frequency`:

```ts
      { key: "steps", header: "جدول سداد مخصص", type: "text", width: 40, help: "اختياري: الشهر:النسبة مفصولين بفاصلة، زي 0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100. لو موجود، المقدم والسنين بيتحسبوا منه" },
```

- [ ] **Step 2: Import**

In `importWorkbook`, the plans loop: keep whether the column is there, `planRows.push({ projSlug: proj.slug, code, values, stepsPresent: present.has("steps") });` (add `stepsPresent: boolean` to the `planRows` element type). The `planKey` match already uses `values.downPaymentPct` / `values.years`, which `readPaymentPlan` now derives from the steps.

In the save, replace the plan write (and the temporary `_steps` of Task 8):

```ts
        for (const p of planRows) {
          const projectId = projId.get(p.projSlug)!;
          const typologyId = p.code ? typId.get(`${projectId}/${p.code.toLowerCase()}`) ?? null : null;
          const { steps, ...plan } = p.values;
          const values = { ...plan, typologyId };
          const rows = toStepRows(steps);
          // The same plan (down payment, years, frequency, unit type) is updated rather than duplicated.
          // Its steps change only when the sheet has the column, so an old template never wipes them.
          const same = await tx.paymentPlan.findFirst({
            where: { projectId, typologyId, downPaymentPct: values.downPaymentPct, years: values.years, frequency: values.frequency },
            select: { id: true },
          });
          if (same) await tx.paymentPlan.update({ where: { id: same.id }, data: { ...values, ...(p.stepsPresent && { steps: { deleteMany: {}, create: rows } }) } });
          else await tx.paymentPlan.create({ data: { ...values, projectId, steps: { create: rows } } });
          touched.add(projectId);
        }
```

- [ ] **Step 3: Export**

In `currentData`, the projects query's `paymentPlans.include` gets `steps: { orderBy: { sortOrder: "asc" } }`, and each plan row `steps: pl.steps.length ? formatSteps(stepsOf(pl.steps)) : null,`.

- [ ] **Step 4: Check, try it, commit**

Run: `npx tsc --noEmit && npm run lint && npm test` — clean.
On `next dev`: download the admin workbook with data, type a schedule for one plan, import (check, then save): the plan has the steps and was updated, not duplicated; import an older copy without the column: the steps stay. A wrong schedule shows as a problem on that row.

```bash
git add src/lib/admin/import
git commit -m "Excel: a custom schedule column on the plans sheet"
```

---

### Task 11: Units on the master plan

**Files:**
- Modify: `src/lib/admin/readers.ts`, `src/lib/units.ts`, `src/app/admin/actions.ts`, `src/components/admin/project-parts.tsx`, `src/app/admin/projects/[id]/page.tsx`, `src/app/portal/unit-actions.ts`, `src/app/portal/projects/[id]/units/page.tsx`, `src/lib/admin/import/columns.ts`, `src/lib/admin/import/workbook.ts`, `src/components/project/master-plan.tsx`

**Decision: in the portal the zone is set at once, like the unit's status and price, not through review.** The zones themselves are drawn by the admin and are already live; picking one only changes where Sales and offers mark the unit, not anything visitors see, and units are the one part of the portal that goes live at once (`src/app/portal/unit-actions.ts`). The admin still hears about unit changes by the hourly email.

- [ ] **Step 1: Reading and checking**

`readUnit` in `src/lib/admin/readers.ts` gets `zoneId: f.id("zoneId"),`. In `src/lib/units.ts`:

```ts
/** The zone, when it is one of the project's own (a unit can only sit in its project's master plan). */
export async function zoneOfProject(projectId: string, zoneId: string | null): Promise<string | null | false> {
  if (!zoneId) return null;
  const zone = await db.masterPlanZone.findFirst({ where: { id: zoneId, projectId }, select: { id: true } });
  return zone ? zone.id : false;
}
```

In `saveUnit` (admin) and `savePortalUnit` (portal), after reading the unit:

```ts
  const zone = await zoneOfProject(projectId, values.zoneId); // project.id in the portal
  if (zone === false) f.errors.zoneId = "المنطقة دي مش في الماستر بلان بتاع المشروع";
```

- [ ] **Step 2: Forms**

- Admin: `src/app/admin/projects/[id]/page.tsx` passes `zones={project.zones}` to `UnitList`; in `project-parts.tsx` the unit form's second `Row` becomes `cols={4}` plus a third row with `<Select name="zoneId" label="مكانها على الماستر بلان" emptyLabel="—" defaultValue={u?.zoneId} options={zones.map((z) => ({ value: z.id, label: z.nameAr }))} hint="بيتعلّم على عروض الأسعار وصفحة الوحدة في Sales" />` (only when the project has zones). The units list shows the zone's `shortAr` next to the floor.
- Portal: `src/app/portal/projects/[id]/units/page.tsx` loads `zones: { orderBy: { sortOrder: "asc" }, select: { id: true, nameAr: true, shortAr: true } }` and adds the same select to `fields`.

- [ ] **Step 3: Both Excel imports**

In `columns.ts`, units sheet, after `orientation`:

```ts
      { key: "zone", header: "منطقة الماستر بلان", type: "ref", help: "اختياري: اسم المنطقة المختصر أو الكامل زي ما هو على الماستر بلان" },
```

In `workbook.ts`:
- `onlyPresent`'s `source` map gets `zoneId: "zone"`, so the zone changes only when the column is there.
- A helper used by both imports:

```ts
type ZoneRef = { id: string; projectId: string; shortAr: string; shortEn: string; nameAr: string; nameEn: string };
/** A zone of the project named in a cell (short or full name, Arabic or English). */
const zoneByName = (zones: ZoneRef[], projectId: string, name: string) =>
  zones.find((z) => z.projectId === projectId && [z.shortAr, z.shortEn, z.nameAr, z.nameEn].some((n) => norm(n) === norm(name)));
```

- `importWorkbook`: load `db.masterPlanZone.findMany({ select: { id: true, projectId: true, shortAr: true, shortEn: true, nameAr: true, nameEn: true } })` with the other lookups; in the units loop, when `refs.zone` is set: a new project (no `existingId`) says «المشروع لسه جديد ومالوش ماستر بلان»; otherwise `const zone = zoneByName(zones, proj.existingId, refs.zone)`, and without a match say «مالقيناش منطقة اسمها «…» في الماستر بلان»; set `values.zoneId = zone?.id ?? null`.
- `importProjectUnits`: the same with `db.masterPlanZone.findMany({ where: { projectId }, … })`.
- Exports (`currentData` units and `buildProjectUnitsWorkbook`): select `zone: { select: { shortAr: true } }` and write `zone: u.zone?.shortAr ?? null`.

- [ ] **Step 4: Zones from the left on the public master plan**

In `src/components/project/master-plan.tsx`, the zone button's style uses `left` instead of `insetInlineStart` (the admin enters «من اليسار %», and the image doesn't flip on Arabic pages):

```tsx
                style={{ left: `${z.shape.x}%`, top: `${z.shape.y}%`, width: `${z.shape.w}%`, height: `${z.shape.h}%` }}
```

- [ ] **Step 5: Check, try it, commit**

Run: `npx tsc --noEmit && npm run lint && npm test` — clean.
On `next dev`: set a unit's zone in the admin and in the portal (immediately saved; a zone id of another project posted by hand is refused); import a units sheet with the zone column by short name; export and see the column filled; the public project page's zones sit at the same place in Arabic and English.

```bash
git add src/lib src/app/admin src/app/portal src/components/admin src/components/project/master-plan.tsx
git commit -m "Units on master-plan zones: admin, portal and both Excel imports; zones measured from the left"
```

---

### Task 12: The zone on the Sales unit page

**Files:**
- Create: `src/components/sales/marked-plan.tsx`
- Modify: `src/lib/sales/inventory.ts`, `src/app/sales/units/[id]/page.tsx`

- [ ] **Step 1: The marked plan**

```tsx
// src/components/sales/marked-plan.tsx

/** A zone's box on the master plan, in percent of the image, measured from its top-left corner. */
export type ZoneBox = { x: number; y: number; w: number; h: number; label: string };

/**
 * The master-plan image with one zone marked. The box is placed over the image itself (not a padded
 * frame), so the admin's percentages land where they were measured. Used by the Sales unit page and
 * the client's offer.
 */
export function MarkedPlan({
  image,
  zone,
  alt,
  className = "relative",
  imgClassName = "block h-auto w-full",
}: {
  image: string;
  zone: ZoneBox | null;
  alt: string;
  /** The frame; it must hug the image (e.g. "relative mx-auto w-fit" with a height-capped image). */
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={className} dir="ltr">
      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded plan of unknown size */}
      <img src={image} alt={alt} decoding="async" className={imgClassName} />
      {zone && (
        <span
          className="absolute rounded-md border-[3px] border-brass-light bg-brass-light/25 shadow-[0_0_0_3px_rgb(255_255_255/0.7)]"
          style={{ left: `${zone.x}%`, top: `${zone.y}%`, width: `${zone.w}%`, height: `${zone.h}%` }}
        >
          <span className="sr-only">{zone.label}</span>
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: The unit's zone in the Sales read**

In `src/lib/sales/inventory.ts` `loadSalesUnit`: select `zone: { select: { xPct: true, yPct: true, widthPct: true, heightPct: true, nameAr: true } }` on the unit; `SalesUnitDetail` gets `zone: ZoneBox | null` (fix the `masterPlan` comment: "marked when the unit has a zone"), mapped as `{ x: Number(z.xPct), y: Number(z.yPct), w: Number(z.widthPct), h: Number(z.heightPct), label: z.nameAr }`.

- [ ] **Step 3: The page**

In `src/app/sales/units/[id]/page.tsx`, the master-plan panel becomes:

```tsx
          {unit.masterPlan && (
            <Panel title="الماستر بلان">
              <p className="-mt-2 mb-4 text-xs text-muted">
                {unit.zone ? <>الوحدة في «{unit.zone.label}»، متعلّمة على الماستر بلان.</> : "مكان الوحدة مش متحدد على الماستر بلان."}
              </p>
              <a href={unit.masterPlan} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-line bg-plan">
                <MarkedPlan image={unit.masterPlan} zone={unit.zone} alt={`الماستر بلان: ${unit.project.nameAr}`} />
                <span className="sr-only">(بتفتح في تبويب جديد)</span>
              </a>
            </Panel>
          )}
```

- [ ] **Step 4: Check, look, commit**

Run: `npx tsc --noEmit && npm run lint` — clean. On `next dev`, a unit with a zone shows the box at the right place at 360 px and 1280 px, light and dark.

```bash
git add src/components/sales/marked-plan.tsx src/lib/sales/inventory.ts src/app/sales/units
git commit -m "Sales unit page: the unit's zone marked on the master plan"
```

---

### Task 13: Offer rules and tokens

**Files:**
- Create: `src/lib/sales/offers.ts`, `src/lib/sales/offer-token.ts`
- Modify: `src/lib/sales/fields.ts` (export `isDialable`)
- Test: `src/lib/sales/offers.test.ts`, `src/lib/sales/offer-token.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/lib/sales/offer-token.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { isOfferToken, newOfferToken } from "./offer-token";

test("a token is 24 random bytes in base64url: 32 characters, never the same", () => {
  const tokens = Array.from({ length: 200 }, newOfferToken);
  for (const t of tokens) {
    assert.match(t, /^[A-Za-z0-9_-]{32}$/);
    assert.equal(Buffer.from(t, "base64url").length, 24);
    assert.equal(isOfferToken(t), true);
  }
  assert.equal(new Set(tokens).size, tokens.length);
});

test("anything else is not a token", () => {
  for (const bad of ["", "short", "a".repeat(31), "a".repeat(33), `${"a".repeat(31)}=`, `${"a".repeat(31)}/`]) assert.equal(isOfferToken(bad), false, bad);
});
```

```ts
// src/lib/sales/offers.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { FormReader } from "@/lib/admin/form";
import {
  canCancelOffer,
  canDecideOffer,
  canSeeOffer,
  canShareOffer,
  clientBanner,
  discountDecision,
  offerState,
  offerValidUntil,
  readOfferForm,
  readOfferSettings,
  type OfferActor,
  type OfferFacts,
  type OfferStateFacts,
} from "./offers";

const NOW = new Date("2026-11-18T10:00:00Z");
const limits = { agentDiscountPct: 2, leadDiscountPct: 5 };
const agent: OfferActor = { id: "a1", role: "AGENT", developerId: "devX" };
const other: OfferActor = { id: "a2", role: "AGENT", developerId: "devX" };
const lead: OfferActor = { id: "l1", role: "LEAD", developerId: "devX" };
const leadY: OfferActor = { id: "lY", role: "LEAD", developerId: "devY" };
const offer = (over: Partial<OfferFacts> = {}): OfferFacts => ({ salesAccountId: "a1", developerId: "devX", status: "ISSUED", ...over });
const form = (values: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return new FormReader(data);
};

test("discount within the role's limit goes out at once, above it waits for a lead", () => {
  assert.deepEqual(discountDecision("AGENT", 0, limits), { ok: true, status: "ISSUED" });
  assert.deepEqual(discountDecision("AGENT", 2, limits), { ok: true, status: "ISSUED" });
  assert.deepEqual(discountDecision("AGENT", 2.01, limits), { ok: true, status: "PENDING_APPROVAL" });
  assert.deepEqual(discountDecision("AGENT", 5, limits), { ok: true, status: "PENDING_APPROVAL" });
  assert.deepEqual(discountDecision("LEAD", 5, limits), { ok: true, status: "ISSUED" });
});

test("above the lead's limit is refused for everyone", () => {
  for (const role of ["AGENT", "LEAD"] as const) {
    const d = discountDecision(role, 5.5, limits);
    assert.equal(d.ok, false);
    assert.match(!d.ok ? d.message : "", /أقصى خصم 5%/);
  }
  const none = discountDecision("AGENT", 1, { agentDiscountPct: 0, leadDiscountPct: 0 });
  assert.match(!none.ok ? none.message : "", /ماحددتش خصم/);
  assert.equal(discountDecision("AGENT", -1, limits).ok, false);
  assert.equal(discountDecision("LEAD", 25, { agentDiscountPct: 20, leadDiscountPct: 20 }).ok, false);
});

test("who sees, shares, decides and cancels", () => {
  assert.equal(canSeeOffer(agent, offer()), true);
  assert.equal(canSeeOffer(other, offer()), false);
  assert.equal(canSeeOffer(lead, offer()), true);
  assert.equal(canSeeOffer(leadY, offer()), false);
  assert.equal(canShareOffer(agent, offer()), true);
  assert.equal(canShareOffer(lead, offer()), false, "only the salesperson sends their offer");
  assert.equal(canShareOffer(agent, offer({ status: "PENDING_APPROVAL" })), false);
  assert.equal(canDecideOffer(lead, offer({ status: "PENDING_APPROVAL" })), true);
  assert.equal(canDecideOffer(agent, offer({ status: "PENDING_APPROVAL" })), false);
  assert.equal(canDecideOffer(lead, offer()), false);
  assert.equal(canDecideOffer(leadY, offer({ developerId: "devX", status: "PENDING_APPROVAL" })), false);
  assert.equal(canCancelOffer(agent, offer()), true);
  assert.equal(canCancelOffer(lead, offer()), true);
  assert.equal(canCancelOffer(other, offer()), false);
  assert.equal(canCancelOffer(agent, offer({ status: "CANCELLED" })), false);
});

test("validity is whole days from issue", () => {
  assert.deepEqual(offerValidUntil(NOW, 7), new Date("2026-11-25T10:00:00Z"));
});

const facts = (over: Partial<OfferStateFacts> = {}): OfferStateFacts => ({
  status: "ISSUED",
  validUntil: new Date("2026-11-25T10:00:00Z"),
  unitNow: "AVAILABLE",
  priceChanged: false,
  ...over,
});

test("the state an offer shows in Sales lists", () => {
  assert.equal(offerState(facts(), NOW), "VALID");
  assert.equal(offerState(facts({ status: "PENDING_APPROVAL" }), NOW), "PENDING");
  assert.equal(offerState(facts({ status: "CANCELLED", unitNow: "TAKEN" }), NOW), "CANCELLED", "cancelled wins");
  assert.equal(offerState(facts({ unitNow: "TAKEN" }), NOW), "UNIT_TAKEN");
  assert.equal(offerState(facts({ unitNow: "HELD_BY_OTHER" }), NOW), "UNIT_TAKEN", "a colleague's hold blocks it too");
  assert.equal(offerState(facts({ validUntil: NOW }), NOW), "EXPIRED", "over at the exact moment");
  assert.equal(offerState(facts({ validUntil: NOW, priceChanged: true }), NOW), "EXPIRED");
  assert.equal(offerState(facts({ priceChanged: true }), NOW), "PRICE_CHANGED");
});

test("the banner over the client's page", () => {
  const f = { status: "ISSUED" as const, validUntil: new Date("2026-11-25T10:00:00Z"), unitTaken: false };
  assert.equal(clientBanner(f, NOW), null);
  assert.equal(clientBanner({ ...f, status: "CANCELLED" }, NOW), "CANCELLED");
  assert.equal(clientBanner({ ...f, unitTaken: true }, NOW), "SOLD");
  assert.equal(clientBanner({ ...f, validUntil: NOW }, NOW), "EXPIRED");
});

test("developer settings: validity 1 to 30 days, discounts 0 to 20, the agent's no higher than the lead's", () => {
  const ok = form({ offerValidityDays: "10", agentDiscountPct: "1.5", leadDiscountPct: "3" });
  assert.deepEqual(readOfferSettings(ok), { offerValidityDays: 10, agentDiscountPct: 1.5, leadDiscountPct: 3 });
  assert.equal(ok.ok, true);
  const days = form({ offerValidityDays: "31", agentDiscountPct: "0", leadDiscountPct: "0" });
  readOfferSettings(days);
  assert.match(days.errors.offerValidityDays, /من 1 لـ 30/);
  const order = form({ offerValidityDays: "7", agentDiscountPct: "4", leadDiscountPct: "3" });
  readOfferSettings(order);
  assert.match(order.errors.agentDiscountPct, /مايعدّيش/);
  const cap = form({ offerValidityDays: "7", agentDiscountPct: "0", leadDiscountPct: "21" });
  readOfferSettings(cap);
  assert.match(cap.errors.leadDiscountPct, /من 0 لـ 20/);
  const decimals = form({ offerValidityDays: "7", agentDiscountPct: "1.255", leadDiscountPct: "3" });
  readOfferSettings(decimals);
  assert.match(decimals.errors.agentDiscountPct, /رقمين/);
});

test("the new-offer form", () => {
  const f = form({ unitId: "cunit0000000000001", planId: "cplan0000000000001", clientName: "أحمد علي", clientPhone: "٠١٠١٢٣٤٥٦٧٨", language: "en", validityDays: "5", discountPct: "" });
  assert.deepEqual(readOfferForm(f), {
    unitId: "cunit0000000000001",
    planId: "cplan0000000000001",
    clientName: "أحمد علي",
    clientPhone: "01012345678",
    clientEmail: null,
    language: "en",
    validityDays: 5,
    discountPct: 0,
  });
  assert.equal(f.ok, true);
  const bad = form({ clientName: "", clientPhone: "12", clientEmail: "x@", language: "fr", validityDays: "40", discountPct: "3" });
  readOfferForm(bad);
  assert.deepEqual(Object.keys(bad.errors).sort(), ["clientEmail", "clientName", "clientPhone", "language", "planId", "validityDays"]);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `npm test` — expected: FAIL, modules not found.

- [ ] **Step 3: Implement**

In `src/lib/sales/fields.ts`, export the existing helper: `export const isDialable = …`.

```ts
// src/lib/sales/offer-token.ts
import { randomBytes } from "node:crypto";

/** The client's link to an offer, /o/[token]: 24 random bytes, base64url, so it can't be guessed. */
export const newOfferToken = () => randomBytes(24).toString("base64url");

export const isOfferToken = (s: string) => /^[A-Za-z0-9_-]{32}$/.test(s);
```

```ts
// src/lib/sales/offers.ts
import type { FormReader } from "@/lib/admin/form";
import { isDialable, normalizePhone } from "./fields";

// Price-offer rules (spec sections 4, 5.4 and 7) as pure functions, so they are unit-tested: the
// developer's settings, the discount each role may give, who may see, share, approve or cancel an
// offer, and the state it shows in Sales lists and to the client.

export const OFFER_VALIDITY_MIN = 1;
export const OFFER_VALIDITY_MAX = 30;
export const DEFAULT_OFFER_VALIDITY = 7;
/** No discount above this, whatever the developer sets (the database checks it too). */
export const DISCOUNT_CAP = 20;
export const OFFER_LANGUAGES = ["ar", "en"] as const;
export type OfferLanguage = (typeof OFFER_LANGUAGES)[number];
export type OfferStatusValue = "PENDING_APPROVAL" | "ISSUED" | "CANCELLED";
export type DiscountLimits = { agentDiscountPct: number; leadDiscountPct: number };

/** The signed-in salesperson. */
export type OfferActor = { id: string; role: "AGENT" | "LEAD"; developerId: string };
/** What the permission rules need to know about an offer. */
export type OfferFacts = { salesAccountId: string; developerId: string; status: OfferStatusValue };

/** Percentages are compared in hundredths, so 2.5 and 2.50 are the same. */
const hundredths = (pct: number) => Math.round(pct * 100);
const pctText = (pct: number) => String(Number(pct.toFixed(2)));

export type DiscountDecision = { ok: false; message: string } | { ok: true; status: "ISSUED" | "PENDING_APPROVAL" };

/**
 * Within the role's own limit the offer goes out at once; above it, it waits for a team lead. Above
 * the team lead's limit it is refused for everyone, so no request reaches a lead who can't approve it.
 */
export function discountDecision(role: OfferActor["role"], discountPct: number, limits: DiscountLimits): DiscountDecision {
  const d = hundredths(discountPct);
  if (!Number.isFinite(d) || d < 0 || d > hundredths(DISCOUNT_CAP)) return { ok: false, message: `الخصم من 0 لـ ${DISCOUNT_CAP}%` };
  const lead = hundredths(limits.leadDiscountPct);
  if (d > lead) return { ok: false, message: lead === 0 ? "الشركة لسه ماحددتش خصم على العروض" : `أقصى خصم ${pctText(limits.leadDiscountPct)}%` };
  const own = role === "LEAD" ? lead : hundredths(limits.agentDiscountPct);
  return { ok: true, status: d <= own ? "ISSUED" : "PENDING_APPROVAL" };
}

const sameCompany = (actor: OfferActor, offer: OfferFacts) => actor.developerId === offer.developerId;
/** The salesperson who made it, or a team lead of the same company. */
export const canSeeOffer = (actor: OfferActor, offer: OfferFacts) => sameCompany(actor, offer) && (offer.salesAccountId === actor.id || actor.role === "LEAD");
/** Only the salesperson who made it sends it, and only once it is out. */
export const canShareOffer = (actor: OfferActor, offer: OfferFacts) => sameCompany(actor, offer) && offer.salesAccountId === actor.id && offer.status === "ISSUED";
/** A team lead of the same company approves or rejects an offer waiting for approval. */
export const canDecideOffer = (actor: OfferActor, offer: OfferFacts) => sameCompany(actor, offer) && actor.role === "LEAD" && offer.status === "PENDING_APPROVAL";
export const canCancelOffer = (actor: OfferActor, offer: OfferFacts) => canSeeOffer(actor, offer) && offer.status !== "CANCELLED";

/** An offer is valid for whole days from when it went out. */
export const offerValidUntil = (issuedAt: Date, days: number) => new Date(issuedAt.getTime() + days * 86_400_000);

export const OFFER_STATES = ["VALID", "PENDING", "EXPIRED", "PRICE_CHANGED", "UNIT_TAKEN", "CANCELLED"] as const;
export type OfferState = (typeof OFFER_STATES)[number];
export const OFFER_STATE_LABELS: Record<OfferState, string> = {
  VALID: "ساري",
  PENDING: "مستني موافقة",
  EXPIRED: "انتهت صلاحيته",
  PRICE_CHANGED: "السعر اتغيّر",
  UNIT_TAKEN: "الوحدة اتباعت أو اتحجزت",
  CANCELLED: "اتلغى",
};

/** The unit now: available; held by another salesperson; or taken (reserved, sold, deleted, or out of Sales). */
export type UnitNow = "AVAILABLE" | "HELD_BY_OTHER" | "TAKEN";
export type OfferStateFacts = { status: OfferStatusValue; validUntil: Date; unitNow: UnitNow; priceChanged: boolean };

/** What an offer shows in Sales lists, so nobody sends an old offer thinking it still holds. */
export function offerState(f: OfferStateFacts, now = new Date()): OfferState {
  if (f.status === "CANCELLED") return "CANCELLED";
  if (f.status === "PENDING_APPROVAL") return "PENDING";
  if (f.unitNow !== "AVAILABLE") return "UNIT_TAKEN";
  if (now.getTime() >= f.validUntil.getTime()) return "EXPIRED";
  if (f.priceChanged) return "PRICE_CHANGED";
  return "VALID";
}

export type ClientBanner = "CANCELLED" | "SOLD" | "EXPIRED" | null;

/**
 * The banner over the client's page (spec 7): cancelled, sold or reserved, or expired. A colleague's
 * temporary hold and a later price change are Sales' business, not the client's: the offer stands as issued.
 */
export function clientBanner(f: { status: OfferStatusValue; validUntil: Date; unitTaken: boolean }, now = new Date()): ClientBanner {
  if (f.status === "CANCELLED") return "CANCELLED";
  if (f.unitTaken) return "SOLD";
  if (now.getTime() >= f.validUntil.getTime()) return "EXPIRED";
  return null;
}

/** A discount field: 0 to 20 with at most two decimals. Empty reads as null. */
function readDiscount(f: FormReader, name: string): number | null {
  const v = f.number(name, { min: 0, max: DISCOUNT_CAP });
  if (f.errors[name]) {
    f.errors[name] = `اكتب نسبة من 0 لـ ${DISCOUNT_CAP}`;
    return null;
  }
  if (v !== null && Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) {
    f.errors[name] = "رقمين بعد العلامة بالكتير";
    return null;
  }
  return v;
}

function readValidity(f: FormReader, name: string): number | null {
  const days = f.int(name, { required: true, min: OFFER_VALIDITY_MIN, max: OFFER_VALIDITY_MAX });
  if (f.errors[name] && f.errors[name] !== "هذا الحقل مطلوب") f.errors[name] = `اكتب عدد أيام من ${OFFER_VALIDITY_MIN} لـ ${OFFER_VALIDITY_MAX}`;
  return days;
}

/** The developer's offer settings from «فريق المبيعات». */
export function readOfferSettings(f: FormReader) {
  const offerValidityDays = readValidity(f, "offerValidityDays");
  const agentDiscountPct = readDiscount(f, "agentDiscountPct") ?? 0;
  const leadDiscountPct = readDiscount(f, "leadDiscountPct") ?? 0;
  if (f.ok && hundredths(agentDiscountPct) > hundredths(leadDiscountPct)) f.errors.agentDiscountPct = "حد السيلز مايعدّيش حد قائد الفريق";
  return { offerValidityDays: offerValidityDays ?? DEFAULT_OFFER_VALIDITY, agentDiscountPct, leadDiscountPct };
}

/** The new-offer form. The unit, plan and limits are checked by the service against the database. */
export function readOfferForm(f: FormReader) {
  const unitId = f.id("unitId");
  const planId = f.id("planId");
  if (!planId) f.errors.planId = "اختار خطة السداد";
  const clientName = f.requiredText("clientName", 100);
  const rawPhone = f.text("clientPhone", { max: 40 });
  const clientPhone = rawPhone ? normalizePhone(rawPhone) : null;
  if (clientPhone && !isDialable(clientPhone)) f.errors.clientPhone = "اكتب رقم موبايل كامل";
  const clientEmail = f.text("clientEmail", { max: 200 });
  if (clientEmail && !/^\S+@\S+\.\S+$/.test(clientEmail)) f.errors.clientEmail = "بريد إلكتروني غير صالح";
  return {
    unitId,
    planId,
    clientName,
    clientPhone,
    clientEmail,
    language: f.oneOf("language", OFFER_LANGUAGES, { required: true }) ?? "ar",
    validityDays: readValidity(f, "validityDays") ?? DEFAULT_OFFER_VALIDITY,
    discountPct: readDiscount(f, "discountPct") ?? 0,
  };
}
```

- [ ] **Step 4: Run the tests**

Run: `npm test` — expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sales/offers.ts src/lib/sales/offers.test.ts src/lib/sales/offer-token.ts src/lib/sales/offer-token.test.ts src/lib/sales/fields.ts
git commit -m "Offer rules: discount limits and approval, permissions, validity, states, unguessable tokens"
```

---

### Task 14: Offer text and sharing helpers

**Files:**
- Create: `src/lib/sales/offer-copy.ts`, `src/lib/sales/share.ts`
- Test: `src/lib/sales/share.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sales/share.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { offerDate, scheduleDate } from "./offer-copy";
import { offerMessage, telegramShareUrl, whatsappNumber, whatsappShareUrl } from "./share";

test("Egyptian mobiles: local 01… becomes 201…", () => {
  assert.equal(whatsappNumber("01012345678"), "201012345678");
  assert.equal(whatsappNumber("٠١١ ٢٣٤٥ ٦٧٨٩"), "201123456789");
  assert.equal(whatsappNumber("+20 155 123 4567"), "201551234567");
  assert.equal(whatsappNumber("00201212345678"), "201212345678");
  assert.equal(whatsappNumber("1012345678"), "201012345678", "written without the leading 0");
});

test("other countries keep their code; landlines and junk have no WhatsApp number", () => {
  assert.equal(whatsappNumber("+971 50 123 4567"), "971501234567");
  assert.equal(whatsappNumber("0223456789"), null);
  assert.equal(whatsappNumber("123"), null);
  assert.equal(whatsappNumber(""), null);
  assert.equal(whatsappNumber(null), null);
});

test("share links", () => {
  assert.equal(whatsappShareUrl("سلام", "https://x.test/o/T", "201012345678"), "https://wa.me/201012345678?text=%D8%B3%D9%84%D8%A7%D9%85%0Ahttps%3A%2F%2Fx.test%2Fo%2FT");
  assert.match(whatsappShareUrl("hi", "https://x.test/o/T", null), /^https:\/\/wa\.me\/\?text=hi%0A/);
  assert.equal(telegramShareUrl("hi there", "https://x.test/o/T"), "https://t.me/share/url?url=https%3A%2F%2Fx.test%2Fo%2FT&text=hi%20there");
});

test("the message: unit, price, down payment and validity, in the offer's language", () => {
  const base = { unit: "B1 · 101", project: "Wadi Yemm", price: 27_454_000, down: 1_372_700, cash: false, currency: "EGP" as const, validUntil: new Date("2026-11-19T10:00:00Z") };
  assert.equal(
    offerMessage({ ...base, language: "en" }),
    ["Price offer: B1 · 101, Wadi Yemm", "Price: EGP 27,454,000", "Down payment: EGP 1,372,700", "Valid until 19 November 2026"].join("\n"),
  );
  const ar = offerMessage({ ...base, language: "ar", currency: "USD", cash: true });
  assert.match(ar, /^عرض سعر: B1 · 101، Wadi Yemm\n/);
  assert.match(ar, /السعر: 27,454,000 دولار/);
  assert.match(ar, /الدفع كاش: 1,372,700 دولار/);
  assert.match(ar, /ساري لحد 19 نوفمبر 2026/);
});

test("dates on the offer: Cairo's calendar, Western digits", () => {
  assert.equal(offerDate(new Date("2026-11-18T23:30:00Z"), "en"), "19 November 2026");
  assert.equal(offerDate(new Date("2026-11-18T10:00:00Z"), "ar"), "18 نوفمبر 2026");
  assert.equal(scheduleDate("2027-02-12", "en"), "12 Feb 2027");
  assert.equal(scheduleDate("2027-02-12", "ar"), "12 فبراير 2027");
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `npm test` — expected: FAIL.

- [ ] **Step 3: Implement the copy**

```ts
// src/lib/sales/offer-copy.ts
import type { OfferLanguage } from "./offers";

// Everything the client reads on an offer (the page, the PDF, the share message and the email), in
// both languages. The Arabic is plain and polite: this is what the client sees, not the salesperson.

export const OFFER_COPY = {
  ar: {
    title: "عرض سعر",
    shareTitle: "عرض سعر: {unit}، {project}",
    preparedFor: "مقدم إلى",
    issued: "تاريخ الإصدار",
    validUntil: "ساري حتى",
    validUntilLine: "ساري لحد {date}",
    price: "السعر",
    listPrice: "سعر الوحدة",
    cashDiscount: "خصم الكاش",
    discount: "خصم خاص",
    netPrice: "السعر بعد الخصم",
    downPayment: "المقدم",
    cashPayment: "الدفع كاش",
    installment: "القسط رقم {n}",
    maintenanceOnly: "وديعة الصيانة",
    plan: "خطة السداد",
    customPlan: "جدول سداد مخصص",
    columns: { no: "الدفعة", date: "التاريخ", amount: "المبلغ", pct: "النسبة", cumulative: "النسبة التراكمية", maintenance: "الصيانة", total: "الإجمالي المستحق" },
    totals: "الإجمالي",
    cheques: "{payments} شيك للوحدة · {maintenance} شيك صيانة · {all} شيك في المجموع",
    continued: "جدول السداد (تابع)",
    schedule: "جدول السداد",
    project: { land: "مساحة الأرض", feddan: "{n} فدان", delivery: "التسليم", units: "عدد الوحدات", location: "الموقع" },
    masterPlan: "الماستر بلان",
    zoneMarked: "مكان الوحدة: {zone}",
    zoneUnknown: "مكان الوحدة هيوضّحه فريق المبيعات",
    unit: { title: "الوحدة", type: "النوع", model: "النموذج", floor: "الدور", ground: "أرضي", bedrooms: "غرف النوم", bathrooms: "الحمامات", area: "المساحة", garden: "الحديقة", roof: "الروف", terrace: "التراس", view: "الإطلالة", orientation: "الاتجاه", finishing: "التشطيب", m2: "{n} م²", floorPlan: "مسقط النموذج" },
    contact: { title: "للتواصل", salesperson: "مسؤول المبيعات", phone: "موبايل", whatsapp: "واتساب", email: "البريد الإلكتروني", hotline: "الخط الساخن", website: "الموقع" },
    disclaimer: "الأسعار وخطط السداد في العرض ده سارية لحد التاريخ المكتوب، وبعدها عرضة للتغيير. العرض ده مش عقد ولا بيحجز الوحدة.",
    by: "بواسطة AqarArena",
    print: "طباعة / حفظ PDF",
    download: "تحميل PDF",
    banners: {
      EXPIRED: "العرض ده انتهت صلاحيته. اسأل مسؤول المبيعات عن السعر الحالي.",
      CANCELLED: "العرض ده اتلغى. اسأل مسؤول المبيعات عن عرض جديد.",
      SOLD: "الوحدة دي اتباعت أو اتحجزت. اسأل مسؤول المبيعات عن وحدة تانية.",
    },
    emailSubject: "عرض سعر: {unit}، {project}",
    emailHello: "أهلًا {name}،",
    emailBody: "ده عرض السعر اللي اتكلمنا عليه. تقدر تفتحه من الرابط{attached}:",
    emailAttached: " أو من ملف الـ PDF المرفق",
  },
  en: {
    title: "Price offer",
    shareTitle: "Price offer: {unit}, {project}",
    preparedFor: "Prepared for",
    issued: "Issued",
    validUntil: "Valid until",
    validUntilLine: "Valid until {date}",
    price: "Price",
    listPrice: "Unit price",
    cashDiscount: "Cash discount",
    discount: "Special discount",
    netPrice: "Price after discount",
    downPayment: "Down payment",
    cashPayment: "Cash payment",
    installment: "Installment {n}",
    maintenanceOnly: "Maintenance deposit",
    plan: "Payment plan",
    customPlan: "Custom schedule",
    columns: { no: "Payment", date: "Date", amount: "Amount", pct: "Share", cumulative: "Cumulative", maintenance: "Maintenance", total: "Total due" },
    totals: "Total",
    cheques: "{payments} cheques for the unit · {maintenance} for maintenance · {all} in all",
    continued: "Payment schedule (continued)",
    schedule: "Payment schedule",
    project: { land: "Land area", feddan: "{n} feddan", delivery: "Delivery", units: "Units", location: "Location" },
    masterPlan: "Master plan",
    zoneMarked: "The unit is in: {zone}",
    zoneUnknown: "Your sales contact will show you where the unit is",
    unit: { title: "The unit", type: "Type", model: "Model", floor: "Floor", ground: "Ground", bedrooms: "Bedrooms", bathrooms: "Bathrooms", area: "Built-up area", garden: "Garden", roof: "Roof", terrace: "Terrace", view: "View", orientation: "Orientation", finishing: "Finishing", m2: "{n} m²", floorPlan: "Floor plan" },
    contact: { title: "Contact", salesperson: "Sales contact", phone: "Mobile", whatsapp: "WhatsApp", email: "Email", hotline: "Hotline", website: "Website" },
    disclaimer: "Prices and payment plans in this offer hold until the date shown and may change after it. This offer is not a contract and does not reserve the unit.",
    by: "by AqarArena",
    print: "Print / save as PDF",
    download: "Download PDF",
    banners: {
      EXPIRED: "This offer has expired. Ask your sales contact for today's price.",
      CANCELLED: "This offer was cancelled. Ask your sales contact for a new one.",
      SOLD: "This unit has been sold or reserved. Ask your sales contact about another one.",
    },
    emailSubject: "Price offer: {unit}, {project}",
    emailHello: "Hello {name},",
    emailBody: "Here is the price offer we discussed. Open it from the link{attached}:",
    emailAttached: " or the attached PDF",
  },
} satisfies Record<OfferLanguage, unknown>;

export type OfferCopy = (typeof OFFER_COPY)["ar"];

const DATE_LOCALE = { ar: "ar-EG-u-nu-latn", en: "en-GB" } as const;

/** "19 November 2026" / "19 نوفمبر 2026", on Cairo's calendar. */
export const offerDate = (d: Date, language: OfferLanguage) =>
  d.toLocaleDateString(DATE_LOCALE[language], { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" });

/** A schedule date ("2027-02-12") as "12 Feb 2027" / "12 فبراير 2027". */
export const scheduleDate = (iso: string, language: OfferLanguage) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString(DATE_LOCALE[language], { day: "numeric", month: language === "ar" ? "long" : "short", year: "numeric", timeZone: "UTC" });
```

(`OfferCopy` is typed from the Arabic object; `satisfies` keeps the English one's keys checked against it only loosely, so in Step 4 add `const _same: OfferCopy = OFFER_COPY.en; void _same;` to make TypeScript require the same keys in both.)

- [ ] **Step 4: Implement sharing**

```ts
// src/lib/sales/share.ts
import { fill, formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/property";
import { normalizePhone } from "./fields";
import { OFFER_COPY, offerDate, type OfferCopy } from "./offer-copy";
import type { OfferLanguage } from "./offers";

const _same: OfferCopy = OFFER_COPY.en;
void _same;

// Sharing an offer (spec section 7): a ready message for WhatsApp and Telegram, sent straight to the
// client's WhatsApp when the number allows it. Nothing is sent from the site: these open the app.

/**
 * The client's number as WhatsApp wants it (country code, digits only), or null. Egyptian mobiles
 * written locally (01xxxxxxxxx, or without the 0) get 20 in front; numbers with another country's
 * code are kept; landlines and anything too short have none.
 */
export function whatsappNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = normalizePhone(raw).replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (/^01[0125]\d{8}$/.test(d)) return `2${d}`;
  if (/^1[0125]\d{8}$/.test(d)) return `20${d}`;
  if (/^201[0125]\d{8}$/.test(d)) return d;
  if (!d.startsWith("0") && !d.startsWith("20") && d.length >= 8 && d.length <= 15) return d;
  return null;
}

/** wa.me with the message and link, to the client's number when there is one (else WhatsApp asks who). */
export const whatsappShareUrl = (message: string, url: string, number: string | null) =>
  `https://wa.me/${number ?? ""}?text=${encodeURIComponent(`${message}\n${url}`)}`;

export const telegramShareUrl = (message: string, url: string) =>
  `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`;

export type ShareFacts = {
  language: OfferLanguage;
  currency: Currency;
  unit: string;
  project: string;
  /** The price after any discount, and what is due at contract. */
  price: number;
  down: number;
  cash: boolean;
  validUntil: Date;
};

/** A few lines that read on their own: the unit, the price, the down payment and how long it holds. */
export function offerMessage(f: ShareFacts): string {
  const c = OFFER_COPY[f.language];
  const money = (n: number) => formatMoney(n, f.language, f.currency);
  return [
    fill(c.shareTitle, { unit: f.unit, project: f.project }),
    `${c.price}: ${money(f.price)}`,
    `${f.cash ? c.cashPayment : c.downPayment}: ${money(f.down)}`,
    fill(c.validUntilLine, { date: offerDate(f.validUntil, f.language) }),
  ].join("\n");
}
```

Note: the `whatsappNumber` rule for "20…" numbers: a valid Egyptian mobile with the code is caught above; any other number starting with 20 is a malformed Egyptian number, so it returns null.

- [ ] **Step 5: Run the tests**

Run: `npm test` — expected: all pass. (If `offerDate(…, "ar")` prints a different month spelling on this Node version, match the test to what `Intl` prints for `ar-EG-u-nu-latn` and say so in the commit message.)

- [ ] **Step 6: Commit**

```bash
git add src/lib/sales/offer-copy.ts src/lib/sales/share.ts src/lib/sales/share.test.ts
git commit -m "Offer text in Arabic and English; WhatsApp numbers, share links and the share message"
```

---

### Task 15: Offer settings in «فريق المبيعات»

**Files:**
- Modify: `src/app/portal/team-actions.ts`, `src/app/portal/team/page.tsx`

- [ ] **Step 1: The action**

Append to `src/app/portal/team-actions.ts` (import `readOfferSettings` from `@/lib/sales/offers`):

```ts
/** How long offers stay valid by default, and the discount each role may give (spec section 4). Applies to new offers. */
export async function saveOfferSettings(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireAccount();
  const f = new FormReader(data);
  const values = readOfferSettings(f);
  if (!f.ok) return f.result();
  await db.developer.update({ where: { id: me.developerId }, data: values });
  revalidatePath("/portal/team");
  return { ok: true, message: "اتحفظ ✓ بيسري على العروض الجديدة" };
}
```

- [ ] **Step 2: The form**

In `src/app/portal/team/page.tsx`, select `offerValidityDays: true, agentDiscountPct: true, leadDiscountPct: true` with `holdHours`, and after the hold-hours panel add:

```tsx
      <Panel title="عروض الأسعار">
        <AdminForm action={saveOfferSettings}>
          <Row cols={3}>
            <TextField
              name="offerValidityDays"
              type="number"
              inputMode="numeric"
              autoComplete="off"
              label="صلاحية العرض (أيام) *"
              defaultValue={developer.offerValidityDays}
              hint={`من ${formatCountAr(OFFER_VALIDITY_MIN)} لـ ${formatCountAr(OFFER_VALIDITY_MAX)} يوم. السيلز يقدر يقصّرها أو يطوّلها لحد ٣٠ يوم لكل عرض.`}
            />
            <TextField
              name="agentDiscountPct"
              type="number"
              inputMode="decimal"
              autoComplete="off"
              label="أقصى خصم للسيلز %"
              defaultValue={Number(developer.agentDiscountPct)}
              hint="العرض بخصم لحد النسبة دي بيطلع على طول. فوقها بيستنى موافقة قائد الفريق."
            />
            <TextField
              name="leadDiscountPct"
              type="number"
              inputMode="decimal"
              autoComplete="off"
              label="أقصى خصم لقائد الفريق %"
              defaultValue={Number(developer.leadDiscountPct)}
              hint={`لحد ${formatCountAr(DISCOUNT_CAP)}%. أي خصم فوق النسبة دي مش هيتقبل في Sales خالص. صفر يعني مفيش خصم على العروض.`}
            />
          </Row>
        </AdminForm>
      </Panel>
```

(import `saveOfferSettings`, and `DISCOUNT_CAP`, `OFFER_VALIDITY_MAX`, `OFFER_VALIDITY_MIN` from `@/lib/sales/offers`.)

- [ ] **Step 3: Check, try it, commit**

Run: `npx tsc --noEmit && npm run lint` — clean.
On `next dev` as a portal account: 31 days, 21%, 1.255% and an agent limit above the lead's are refused with their messages; 10 days / 2% / 5% save. A database check: `UPDATE "Developer" SET "agentDiscountPct" = 6, "leadDiscountPct" = 5` fails with `Developer_discount_order`.

```bash
git add src/app/portal/team-actions.ts src/app/portal/team/page.tsx
git commit -m "Portal «فريق المبيعات»: offer validity and the discount each role may give"
```

---

### Task 16: The offer snapshot and the offer service

**Files:**
- Create: `src/lib/sales/offer-snapshot.ts`, `src/lib/sales/offer-snapshot.test.ts`, `src/lib/sales/offer-service.ts`
- Modify: `src/lib/sales/hold-service.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/sales/offer-snapshot.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { asSnapshot, SNAPSHOT_VERSION } from "./offer-snapshot";

test("a stored snapshot is read back only when it has this version's shape", () => {
  const good = { v: SNAPSHOT_VERSION, listPrice: 1, price: 1, schedule: { rows: [] }, plan: { fingerprint: "x" }, unit: {}, project: {}, developer: {}, salesperson: {}, client: {} };
  assert.equal(asSnapshot(good), good);
  for (const bad of [null, 1, "x", {}, { ...good, v: 2 }, { ...good, schedule: null }]) assert.equal(asSnapshot(bad), null);
});
```

Run: `npm test` — expected: FAIL.

- [ ] **Step 2: The snapshot type**

```ts
// src/lib/sales/offer-snapshot.ts
import type { Schedule } from "@/lib/catalog/schedule";
import type { Currency, InstallmentFrequency } from "@/lib/property";

// Everything an offer prints, as of issue (spec 7: "the offer keeps its numbers"). Stored as JSON on
// SalesOffer.snapshot; /o/[token], the PDF, the share message and the email read only this. Dates of
// the schedule are not stored: they follow the offer's issue date (an approval re-issues it).

export const SNAPSHOT_VERSION = 1;

export type ZoneBoxSnapshot = { x: number; y: number; w: number; h: number; nameAr: string; nameEn: string };

export type OfferSnapshot = {
  v: typeof SNAPSHOT_VERSION;
  currency: Currency;
  validityDays: number;
  developer: { nameAr: string; nameEn: string; logoUrl: string | null; hotline: string | null; website: string | null };
  project: {
    id: string;
    slug: string;
    nameAr: string;
    nameEn: string;
    descriptionAr: string | null;
    descriptionEn: string | null;
    placeAr: string;
    placeEn: string;
    /** "YYYY-MM-DD". */
    deliveryDate: string;
    landFeddan: number | null;
    unitsCount: number | null;
    photo: string | null;
    masterPlan: string | null;
    zone: ZoneBoxSnapshot | null;
  };
  unit: {
    id: string;
    /** Building, then number: "B1 · 101". */
    label: string;
    floor: number | null;
    view: string | null;
    orientation: string | null;
    typeCode: string;
    typeNameAr: string | null;
    typeNameEn: string | null;
    subType: string;
    finishing: string;
    buaM2: number;
    gardenM2: number | null;
    roofM2: number | null;
    terraceM2: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    floorPlan: string | null;
  };
  plan: {
    nameAr: string | null;
    nameEn: string | null;
    frequency: InstallmentFrequency;
    years: number;
    cash: boolean;
    custom: boolean;
    cashDiscountPct: number | null;
    maintenancePct: number | null;
    /** catalog/schedule.ts planFingerprint: compared with the current plans for «السعر اتغيّر». */
    fingerprint: string;
  };
  /** The unit's price at issue, whole; the offer's discount; the price the schedule is paid on. */
  listPrice: number;
  discountPct: number;
  price: number;
  schedule: Schedule;
  client: { name: string; phone: string | null };
  salesperson: { nameAr: string; nameEn: string | null; phone: string; whatsapp: string | null; email: string | null };
};

/** A stored snapshot, or null when it isn't one this code can read. */
export function asSnapshot(json: unknown): OfferSnapshot | null {
  if (!json || typeof json !== "object") return null;
  const s = json as Partial<OfferSnapshot>;
  if (s.v !== SNAPSHOT_VERSION || typeof s.listPrice !== "number" || typeof s.price !== "number") return null;
  if (!s.schedule || !Array.isArray(s.schedule.rows) || !s.plan || typeof s.plan.fingerprint !== "string") return null;
  return s as OfferSnapshot;
}
```

Run: `npm test` — passes.

- [ ] **Step 3: Share the lock helpers**

In `src/lib/sales/hold-service.ts`, add `export` to the existing `limitLockWait`, `TX_OPTIONS`, `BUSY` and `lockUnit` constants (no other change).

- [ ] **Step 4: The service**

```ts
// src/lib/sales/offer-service.ts
import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { FEDDAN_M2 } from "@/lib/admin/readers";
import { formatDateTimeAr } from "@/lib/format";
import { stepsOf } from "@/lib/catalog/plan-steps";
import {
  buildSchedule,
  cairoDate,
  maintenanceAmount,
  monthsBetween,
  payablePrice,
  planFingerprint,
  planSteps,
  type SchedulePlan,
} from "@/lib/catalog/schedule";
import { isBusy } from "./hold-errors";
import { BUSY, limitLockWait, lockUnit, releaseExpired, salesHoldWhere, TX_OPTIONS } from "./hold-service";
import { unitLabel } from "./labels";
import { asSnapshot, SNAPSHOT_VERSION, type OfferSnapshot } from "./offer-snapshot";
import { newOfferToken } from "./offer-token";
import {
  canCancelOffer,
  canDecideOffer,
  canSeeOffer,
  canShareOffer,
  clientBanner,
  discountDecision,
  offerState,
  offerValidUntil,
  type ClientBanner,
  type OfferActor,
  type OfferLanguage,
  type OfferState,
  type UnitNow,
} from "./offers";
import { salesUnitWhere } from "./scope";

// Price offers (spec sections 4, 5 and 7). Creating and approving one run in a transaction that locks
// the unit row first, like holds (hold-service.ts): a sale or a hold changing the unit at the same
// moment either finishes first and is seen, or waits. An offer never holds the unit. Every query is
// scoped by the salesperson's developer; another company's ids find nothing.

type Client = typeof db;
type Tx = Prisma.TransactionClient;
export type OfferResult = { ok: false; message: string } | { ok: true; id: string; status: "ISSUED" | "PENDING_APPROVAL" };
export type ActionResult = { ok: boolean; message: string };
type Options = { client?: Client; now?: Date };

const GONE: ActionResult = { ok: false, message: "العرض ده مش موجود" };
const dec = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));
const notPdf = (url: string) => !/\.pdf(\?|$)/i.test(url);
const todayCairo = (now: Date) => new Date(`${cairoDate(now)}T00:00:00Z`);

type PlanRow = Prisma.PaymentPlanGetPayload<{ include: { steps: true } }>;

/** A plan as the schedule math reads it. */
export const planTerms = (p: PlanRow): SchedulePlan => ({
  downPaymentPct: Number(p.downPaymentPct),
  deliveryPaymentPct: Number(p.deliveryPaymentPct),
  years: p.years,
  frequency: p.frequency,
  cashDiscountPct: dec(p.cashDiscountPct),
  maintenancePct: dec(p.maintenancePct),
  steps: stepsOf(p.steps),
});

/** Plans Sales sells on today: active, not past their end date, of the project (and the unit's type when set). */
const offeredPlansWhere = (projectIds: string[], now: Date): Prisma.PaymentPlanWhereInput => ({
  projectId: { in: projectIds },
  isActive: true,
  OR: [{ validUntil: null }, { validUntil: { gte: todayCairo(now) } }],
});

/** The current plans' fingerprints by project, to tell whether an offer's plan is still offered as it was. */
async function currentFingerprints(client: Client | Tx, projectIds: string[], now: Date) {
  const plans = projectIds.length ? await client.paymentPlan.findMany({ where: offeredPlansWhere(projectIds, now), include: { steps: true } }) : [];
  const out = new Map<string, { typologyId: string | null; fingerprint: string }[]>();
  for (const p of plans) out.set(p.projectId, [...(out.get(p.projectId) ?? []), { typologyId: p.typologyId, fingerprint: planFingerprint({ ...planTerms(p), typologyId: p.typologyId }) }]);
  return out;
}

type UnitNowRow = { availability: string; price: Prisma.Decimal | null; typologyId: string; typology: { priceFrom: Prisma.Decimal | null; projectId: string } };

/** The unit's price or its plan changed since the offer was made. */
function priceMoved(unit: UnitNowRow, snap: OfferSnapshot, prints: Map<string, { typologyId: string | null; fingerprint: string }[]>) {
  if (Math.round(Number(unit.price ?? unit.typology.priceFrom)) !== snap.listPrice) return true;
  return !(prints.get(unit.typology.projectId) ?? []).some((p) => (p.typologyId === null || p.typologyId === unit.typologyId) && p.fingerprint === snap.plan.fingerprint);
}

/** Why an offer can't be made (or approved) on this unit for `salesAccountId` now, or null. */
async function unitBlock(tx: Tx, unit: { id: string; availability: string }, salesAccountId: string, developerId: string, now: Date): Promise<string | null> {
  if (unit.availability !== "AVAILABLE") return "الوحدة دي مش متاحة دلوقتي";
  const hold = await tx.unitHold.findFirst({
    where: { unitId: unit.id, ...salesHoldWhere(developerId, now) },
    select: { salesAccountId: true, expiresAt: true, salesAccount: { select: { nameAr: true } } },
  });
  if (hold && hold.salesAccountId !== salesAccountId) return `الوحدة محجوزة مؤقتًا لـ ${hold.salesAccount.nameAr} لحد ${formatDateTimeAr(hold.expiresAt)}، فمينفعش يتعمل عليها عرض`;
  return null;
}

const unitForOffer = {
  id: true,
  building: true,
  unitNumber: true,
  floor: true,
  view: true,
  orientation: true,
  price: true,
  availability: true,
  typologyId: true,
  zone: { select: { xPct: true, yPct: true, widthPct: true, heightPct: true, nameAr: true, nameEn: true } },
  typology: {
    select: {
      projectId: true,
      code: true,
      nameAr: true,
      nameEn: true,
      subType: true,
      finishing: true,
      buaM2: true,
      gardenM2: true,
      roofM2: true,
      terraceM2: true,
      bedrooms: true,
      bathrooms: true,
      priceFrom: true,
      media: { where: { kind: "FLOOR_PLAN_2D" }, orderBy: { sortOrder: "asc" }, select: { url: true } },
      project: {
        select: {
          id: true,
          slug: true,
          nameAr: true,
          nameEn: true,
          descriptionAr: true,
          descriptionEn: true,
          districtAr: true,
          districtEn: true,
          deliveryDate: true,
          landAreaM2: true,
          unitsCount: true,
          currency: true,
          masterPlanUrl: true,
          area: { select: { nameAr: true, nameEn: true } },
          developer: { select: { nameAr: true, nameEn: true, logoUrl: true, hotline: true, website: true, agentDiscountPct: true, leadDiscountPct: true } },
          media: { where: { kind: { in: ["IMAGE", "MASTER_PLAN", "FLOOR_PLAN_2D"] } }, orderBy: { sortOrder: "asc" }, select: { kind: true, group: true, url: true } },
        },
      },
    },
  },
} satisfies Prisma.UnitSelect;
type OfferUnit = Prisma.UnitGetPayload<{ select: typeof unitForOffer }>;

const salespersonSelect = { nameAr: true, nameEn: true, phone: true, whatsapp: true, email: true } satisfies Prisma.SalesAccountSelect;

export type OfferInput = {
  unitId: string;
  planId: string;
  clientName: string;
  clientPhone: string | null;
  clientEmail: string | null;
  language: OfferLanguage;
  validityDays: number;
  discountPct: number;
};

/** Every figure and text the offer prints, as of `now`. */
function buildSnapshot(unit: OfferUnit, plan: PlanRow, salesperson: OfferSnapshot["salesperson"], input: OfferInput, now: Date): OfferSnapshot {
  const t = unit.typology;
  const p = t.project;
  const d = p.developer;
  const terms = planTerms(plan);
  const handover = monthsBetween(cairoDate(now), p.deliveryDate.toISOString().slice(0, 10));
  const listPrice = Math.round(Number(unit.price ?? t.priceFrom));
  const price = payablePrice(listPrice, terms, input.discountPct);
  const photo = p.media.find((m) => m.kind === "IMAGE" && m.group === "EXTERIOR") ?? p.media.find((m) => m.kind === "IMAGE");
  const projectPlans = p.media.filter((m) => m.kind === "FLOOR_PLAN_2D").map((m) => m.url);
  const z = unit.zone;
  return {
    v: SNAPSHOT_VERSION,
    currency: p.currency,
    validityDays: input.validityDays,
    developer: { nameAr: d.nameAr, nameEn: d.nameEn, logoUrl: d.logoUrl, hotline: d.hotline, website: d.website },
    project: {
      id: p.id,
      slug: p.slug,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      descriptionAr: p.descriptionAr,
      descriptionEn: p.descriptionEn,
      placeAr: [p.districtAr, p.area.nameAr].filter(Boolean).join("، "),
      placeEn: [p.districtEn, p.area.nameEn].filter(Boolean).join(", "),
      deliveryDate: p.deliveryDate.toISOString().slice(0, 10),
      landFeddan: p.landAreaM2 === null ? null : Math.round((Number(p.landAreaM2) / FEDDAN_M2) * 10) / 10,
      unitsCount: p.unitsCount,
      photo: photo?.url ?? null,
      masterPlan: p.masterPlanUrl ?? p.media.find((m) => m.kind === "MASTER_PLAN")?.url ?? null,
      zone: z ? { x: Number(z.xPct), y: Number(z.yPct), w: Number(z.widthPct), h: Number(z.heightPct), nameAr: z.nameAr, nameEn: z.nameEn } : null,
    },
    unit: {
      id: unit.id,
      label: unitLabel(unit),
      floor: unit.floor,
      view: unit.view,
      orientation: unit.orientation,
      typeCode: t.code,
      typeNameAr: t.nameAr,
      typeNameEn: t.nameEn,
      subType: t.subType,
      finishing: t.finishing,
      buaM2: Number(t.buaM2),
      gardenM2: dec(t.gardenM2),
      roofM2: dec(t.roofM2),
      terraceM2: dec(t.terraceM2),
      bedrooms: t.bedrooms,
      bathrooms: t.bathrooms,
      floorPlan: t.media.map((m) => m.url).find(notPdf) ?? projectPlans.find(notPdf) ?? null,
    },
    plan: {
      nameAr: plan.nameAr,
      nameEn: plan.nameEn,
      frequency: plan.frequency,
      years: plan.years,
      cash: plan.years === 0,
      custom: terms.steps.length > 0,
      cashDiscountPct: terms.cashDiscountPct ?? null,
      maintenancePct: terms.maintenancePct ?? null,
      fingerprint: planFingerprint({ ...terms, typologyId: plan.typologyId }),
    },
    listPrice,
    discountPct: input.discountPct,
    price,
    schedule: buildSchedule(price, planSteps(terms, handover), maintenanceAmount(price, terms), handover),
    client: { name: input.clientName, phone: input.clientPhone },
    salesperson,
  };
}

/** Makes an offer: issued at once within the salesperson's discount limit, otherwise waiting for a team lead. */
export async function createOffer(me: OfferActor, input: OfferInput, { client = db, now = new Date() }: Options = {}): Promise<OfferResult> {
  try {
    return await client.$transaction(async (tx): Promise<OfferResult> => {
      await limitLockWait(tx);
      await lockUnit(tx, input.unitId);
      const unit = await tx.unit.findFirst({ where: { id: input.unitId, ...salesUnitWhere(me.developerId) }, select: unitForOffer });
      if (!unit) return { ok: false, message: "الوحدة دي مش موجودة في مشروعات شركتك" };
      const account = await tx.salesAccount.findFirst({ where: { id: me.id, developerId: me.developerId, status: "ACTIVE" }, select: salespersonSelect });
      if (!account) return { ok: false, message: "حسابك اتوقف. كلّم الشركة" };
      await releaseExpired(tx, { unitId: unit.id }, now);
      const blocked = await unitBlock(tx, unit, me.id, me.developerId, now);
      if (blocked) return { ok: false, message: blocked };
      const plan = await tx.paymentPlan.findFirst({
        where: { id: input.planId, ...offeredPlansWhere([unit.typology.projectId], now), AND: [{ OR: [{ typologyId: null }, { typologyId: unit.typologyId }] }] },
        include: { steps: true },
      });
      if (!plan) return { ok: false, message: "خطة السداد دي مش سارية للوحدة دي" };
      const d = unit.typology.project.developer;
      const decision = discountDecision(me.role, input.discountPct, { agentDiscountPct: Number(d.agentDiscountPct), leadDiscountPct: Number(d.leadDiscountPct) });
      if (!decision.ok) return decision;
      const offer = await tx.salesOffer.create({
        data: {
          token: newOfferToken(),
          developerId: me.developerId,
          salesAccountId: me.id,
          unitId: unit.id,
          paymentPlanId: plan.id,
          clientName: input.clientName,
          clientPhone: input.clientPhone,
          clientEmail: input.clientEmail,
          language: input.language,
          currency: unit.typology.project.currency,
          issuedAt: now,
          validUntil: offerValidUntil(now, input.validityDays),
          snapshot: buildSnapshot(unit, plan, account, input, now) as unknown as Prisma.InputJsonValue,
          discountPct: input.discountPct,
          status: decision.status,
        },
        select: { id: true },
      });
      return { ok: true, id: offer.id, status: decision.status };
    }, TX_OPTIONS);
  } catch (e) {
    if (isBusy(e)) return { ok: false, message: BUSY.message };
    throw e;
  }
}

/**
 * A team lead approves an offer that waits for approval. It is re-checked first (the unit still free,
 * the price and plan unchanged, the discount still within the lead's limit), then issued from now: its
 * validity starts at approval, and its schedule dates with it.
 */
export async function approveOffer(lead: OfferActor, offerId: string, { client = db, now = new Date() }: Options = {}): Promise<ActionResult> {
  try {
    return await client.$transaction(async (tx): Promise<ActionResult> => {
      await limitLockWait(tx);
      const offer = await tx.salesOffer.findFirst({
        where: { id: offerId, developerId: lead.developerId },
        select: { id: true, status: true, salesAccountId: true, developerId: true, unitId: true, discountPct: true, snapshot: true, developer: { select: { leadDiscountPct: true } } },
      });
      if (!offer) return GONE;
      if (!canDecideOffer(lead, offer)) return { ok: false, message: "العرض ده مش مستني موافقة" };
      const snap = asSnapshot(offer.snapshot);
      if (!offer.unitId || !snap) return { ok: false, message: "الوحدة اتمسحت، ارفض العرض" };
      await lockUnit(tx, offer.unitId);
      await releaseExpired(tx, { unitId: offer.unitId }, now);
      const unit = await tx.unit.findFirst({
        where: { id: offer.unitId, ...salesUnitWhere(lead.developerId) },
        select: { id: true, availability: true, price: true, typologyId: true, typology: { select: { priceFrom: true, projectId: true } } },
      });
      if (!unit) return { ok: false, message: "الوحدة مبقتش في المخزون، ارفض العرض" };
      const blocked = await unitBlock(tx, unit, offer.salesAccountId, lead.developerId, now);
      if (blocked) return { ok: false, message: blocked };
      if (priceMoved(unit, snap, await currentFingerprints(tx, [unit.typology.projectId], now))) {
        return { ok: false, message: "السعر أو خطة السداد اتغيّروا من ساعة ما العرض اتعمل. ارفضه والسيلز يعمل عرض جديد" };
      }
      if (Number(offer.discountPct) > Number(offer.developer.leadDiscountPct)) return { ok: false, message: "الخصم ده أكبر من حدّك دلوقتي" };
      const { count } = await tx.salesOffer.updateMany({
        where: { id: offer.id, status: "PENDING_APPROVAL" },
        data: { status: "ISSUED", approvedById: lead.id, approvedAt: now, issuedAt: now, validUntil: offerValidUntil(now, snap.validityDays) },
      });
      return count ? { ok: true, message: "اتوافق ✓ والعرض بقى ساري" } : GONE;
    }, TX_OPTIONS);
  } catch (e) {
    if (isBusy(e)) return BUSY;
    throw e;
  }
}

/** Cancels an offer (its salesperson or a team lead), or rejects one waiting for approval (a team lead). */
export async function cancelOffer(actor: OfferActor, offerId: string, now = new Date()): Promise<ActionResult> {
  const offer = await db.salesOffer.findFirst({ where: { id: offerId, developerId: actor.developerId }, select: { salesAccountId: true, developerId: true, status: true } });
  if (!offer || !canSeeOffer(actor, offer)) return GONE;
  if (!canCancelOffer(actor, offer)) return { ok: false, message: "العرض ده متلغي بالفعل" };
  const { count } = await db.salesOffer.updateMany({
    where: { id: offerId, developerId: actor.developerId, status: { not: "CANCELLED" } },
    data: { status: "CANCELLED", cancelledById: actor.id, cancelledAt: now },
  });
  if (!count) return GONE;
  return { ok: true, message: offer.status === "PENDING_APPROVAL" && offer.salesAccountId !== actor.id ? "اترفض ✓" : "اتلغى ✓" };
}

export type ShareChannel = "WHATSAPP" | "TELEGRAM" | "EMAIL" | "DEVICE";

/** Notes that the salesperson shared their issued offer this way (once per channel). */
export async function recordShare(me: OfferActor, offerId: string, channel: ShareChannel): Promise<void> {
  await db.$executeRaw`
    UPDATE "SalesOffer" SET "sentVia" = array_append("sentVia", ${channel}::"OfferChannel"), "updatedAt" = now()
    WHERE "id" = ${offerId} AND "salesAccountId" = ${me.id} AND "developerId" = ${me.developerId}
      AND "status" = 'ISSUED' AND NOT (${channel}::"OfferChannel" = ANY("sentVia"))`;
}

const listSelect = {
  id: true,
  token: true,
  status: true,
  issuedAt: true,
  validUntil: true,
  createdAt: true,
  unitId: true,
  salesAccountId: true,
  developerId: true,
  clientName: true,
  discountPct: true,
  sentVia: true,
  snapshot: true,
  salesAccount: { select: { nameAr: true } },
} satisfies Prisma.SalesOfferSelect;
export type OfferRow = Prisma.SalesOfferGetPayload<{ select: typeof listSelect }> & { state: OfferState; snap: OfferSnapshot | null };

/** Each offer's state now (spec 5.4): checks the units, holds and current plans in three queries. */
export async function withStates(developerId: string, offers: Prisma.SalesOfferGetPayload<{ select: typeof listSelect }>[], now = new Date()): Promise<OfferRow[]> {
  const unitIds = [...new Set(offers.flatMap((o) => (o.unitId ? [o.unitId] : [])))];
  const units = unitIds.length
    ? await db.unit.findMany({
        where: { id: { in: unitIds }, ...salesUnitWhere(developerId) },
        select: { id: true, availability: true, price: true, typologyId: true, typology: { select: { priceFrom: true, projectId: true } }, holds: { where: salesHoldWhere(developerId, now), take: 1, select: { salesAccountId: true } } },
      })
    : [];
  const byId = new Map(units.map((u) => [u.id, u]));
  const prints = await currentFingerprints(db, [...new Set(units.map((u) => u.typology.projectId))], now);
  return offers.map((o) => {
    const snap = asSnapshot(o.snapshot);
    const unit = o.unitId ? byId.get(o.unitId) : undefined;
    const held = unit?.holds[0];
    const unitNow: UnitNow = !unit || unit.availability !== "AVAILABLE" ? "TAKEN" : held && held.salesAccountId !== o.salesAccountId ? "HELD_BY_OTHER" : "AVAILABLE";
    const priceChanged = !unit || !snap || priceMoved(unit, snap, prints);
    return { ...o, snap, state: offerState({ status: o.status, validUntil: o.validUntil, unitNow, priceChanged }, now) };
  });
}

/** The salesperson's latest offers, newest first. */
export async function myOffers(me: OfferActor, now = new Date(), take = 100): Promise<OfferRow[]> {
  const rows = await db.salesOffer.findMany({ where: { salesAccountId: me.id, developerId: me.developerId }, orderBy: { createdAt: "desc" }, take, select: listSelect });
  return withStates(me.developerId, rows, now);
}

/** For a team lead: the team's offers waiting for approval, oldest first. */
export async function pendingApprovals(lead: OfferActor, now = new Date()): Promise<OfferRow[]> {
  if (lead.role !== "LEAD") return [];
  const rows = await db.salesOffer.findMany({ where: { developerId: lead.developerId, status: "PENDING_APPROVAL" }, orderBy: { createdAt: "asc" }, take: 100, select: listSelect });
  return withStates(lead.developerId, rows, now);
}

/** Offers the salesperson issued: all of them, and in the last 30 days (spec 3, «ملفي»). */
export async function offerCounts(me: OfferActor, now = new Date()) {
  const issued = { salesAccountId: me.id, developerId: me.developerId, status: "ISSUED" as const };
  const [total, recent] = await Promise.all([
    db.salesOffer.count({ where: issued }),
    db.salesOffer.count({ where: { ...issued, issuedAt: { gte: new Date(now.getTime() - 30 * 86_400_000) } } }),
  ]);
  return { total, recent };
}

/** One offer for its salesperson or a team lead of the company, with its state; null otherwise. */
export async function loadOffer(me: OfferActor, offerId: string, now = new Date()) {
  const row = await db.salesOffer.findFirst({
    where: { id: offerId, developerId: me.developerId },
    select: { ...listSelect, clientPhone: true, clientEmail: true, language: true, currency: true, pdfUrl: true, approvedAt: true, approvedBy: { select: { nameAr: true } }, cancelledAt: true, cancelledBy: { select: { nameAr: true } } },
  });
  if (!row || !canSeeOffer(me, row)) return null;
  const [withState] = await withStates(me.developerId, [row], now);
  return { ...row, state: withState.state, snap: withState.snap, canShare: canShareOffer(me, row), canDecide: canDecideOffer(me, row), canCancel: canCancelOffer(me, row) };
}

export type PublicOffer = {
  id: string;
  token: string;
  language: OfferLanguage;
  issuedAt: Date;
  validUntil: Date;
  pdfUrl: string | null;
  banner: ClientBanner;
  snap: OfferSnapshot;
};

/** The offer behind a client's link. An offer waiting for approval doesn't open (spec 7). */
export async function loadPublicOffer(token: string, now = new Date()): Promise<PublicOffer | null> {
  const offer = await db.salesOffer.findUnique({
    where: { token },
    select: { id: true, token: true, status: true, language: true, issuedAt: true, validUntil: true, pdfUrl: true, snapshot: true, developerId: true, unitId: true },
  });
  const snap = offer && asSnapshot(offer.snapshot);
  if (!offer || !snap || offer.status === "PENDING_APPROVAL") return null;
  const unit = offer.unitId ? await db.unit.findFirst({ where: { id: offer.unitId, ...salesUnitWhere(offer.developerId) }, select: { availability: true } }) : null;
  const banner = clientBanner({ status: offer.status, validUntil: offer.validUntil, unitTaken: !unit || unit.availability !== "AVAILABLE" }, now);
  return { id: offer.id, token: offer.token, language: offer.language, issuedAt: offer.issuedAt, validUntil: offer.validUntil, pdfUrl: offer.pdfUrl, banner, snap };
}
```

`unitLabel` (`src/lib/sales/labels.ts`) takes `{ building, unitNumber }` and writes «B1 · 101»; `FEDDAN_M2` is the admin's conversion constant.

- [ ] **Step 5: A scratch check against the throwaway database**

In your scratchpad, `offer-check.mts` (run with `node --conditions=react-server --env-file=.env --import tsx <file>` from the worktree): pick an AVAILABLE unit of a published project with an active plan, create a sales account (AGENT) and a LEAD for its developer with `hashPassword`, set the developer's limits to 2% / 5%, then:
1. `createOffer` with 0% → `ISSUED`; the snapshot's schedule sums to its price; `loadPublicOffer(token)` returns it with `banner: null`.
2. `createOffer` with 3% → `PENDING_APPROVAL`; `loadPublicOffer` returns null; `approveOffer` by the AGENT is refused, by the LEAD succeeds and moves `issuedAt`.
3. `createOffer` with 6% → refused «أقصى خصم 5%».
4. A hold on the unit by another salesperson → `createOffer` refused with «محجوزة مؤقتًا لـ …».
5. Change the unit's price → `myOffers` shows `PRICE_CHANGED`; mark it SOLD → `UNIT_TAKEN` and the public banner `SOLD`; `cancelOffer` → `CANCELLED`.
6. A sales account of another developer: `loadOffer` → null, `cancelOffer` → «العرض ده مش موجود».
7. `recordShare(…, "WHATSAPP")` twice → `sentVia` is `["WHATSAPP"]`.

Expected: every line as described. Delete what the script created afterwards.

- [ ] **Step 6: Check and commit**

Run: `npx tsc --noEmit && npm run lint && npm test` — clean.

```bash
git add src/lib/sales/offer-snapshot.ts src/lib/sales/offer-snapshot.test.ts src/lib/sales/offer-service.ts src/lib/sales/hold-service.ts
git commit -m "Offer service: snapshot at issue, create with the unit locked, approve, cancel, shares, states"
```

---

### Task 17: The client's offer page, part 1: route, layout, cover, project and contact

**Files:**
- Create: `src/app/o/layout.tsx`, `src/app/o/offer.css`, `src/app/o/not-found.tsx`, `src/app/o/[token]/page.tsx`, `src/components/offer/context.ts`, `src/components/offer/sheet.tsx`, `src/components/offer/offer-document.tsx`
- Modify: `src/proxy.ts`, `src/app/robots.ts`, `next.config.ts`

The page is the offer itself: landscape 16:10 sheets (spec 7), sized with container units so a sheet reads the same on a laptop and printed on 297 × 185.6 mm paper. On phones the sheets lose the fixed ratio and grow with their content. Colours and fonts are the public site's; the page is always light (no `data-theme`).

**Fonts must come from `next/font`.** The server's PDF browser (`@sparticuz/chromium`) ships only Open Sans (Latin, Greek, Cyrillic; no Arabic) and the Vercel function has no system fonts, so a system fallback would print Arabic as empty boxes. The `/o` layout below loads IBM Plex Sans Arabic and Alexandria through `next/font/google` (self-hosted by the build, so the PDF browser fetches them from this deployment); keep it that way, and never rely on a local font name such as Tahoma on the offer page.

- [ ] **Step 1: Let `/o` through, keep it out of search**

`src/proxy.ts`, after the `sales` block:

```ts
  // A client's price offer (/o/[token]) carries its own language; it is never moved under /ar or /en.
  if (firstSegment === "o") return;
```

`src/app/robots.ts`: `disallow: ["/api/", "/admin", "/portal", "/sales", "/o/"]`, and the comment «… AqarArena Sales and clients' offers are private …».

`next.config.ts` `headers()`: add a second entry so offers are never indexed and their token never leaves in a `Referer`:

```ts
      { source: "/o/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Referrer-Policy", value: "no-referrer" }] },
```

(Put it after the `/:path*` entry; the later `Referrer-Policy` wins for `/o`.)

- [ ] **Step 2: Layout, styles, not-found**

```tsx
// src/app/o/layout.tsx
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { Alexandria, IBM_Plex_Sans_Arabic } from "next/font/google";
import "../globals.css";
import "./offer.css";

const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic", "latin"], weight: ["400", "500", "600"] });
const alexandria = Alexandria({ variable: "--font-alexandria", subsets: ["arabic", "latin"], weight: ["300", "400", "500"] });

// Every offer is read from the database per request.
export const instant = false;

export const metadata: Metadata = {
  title: "عرض سعر · Price offer · AqarArena",
  robots: { index: false, follow: false },
};

// The client's offer is its own root layout: no site header or footer, always light. The offer's
// language (and direction) is set by the page on its own <main>, since only the offer knows it.
export default function OfferLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ar" className={`${plexArabic.variable} ${alexandria.variable} antialiased`}>
      <body className="min-h-dvh bg-ground font-sans leading-relaxed text-ink print:bg-white">
        <Suspense fallback={null}>{children}</Suspense>
      </body>
    </html>
  );
}
```

```css
/* src/app/o/offer.css: the offer's 16:10 sheets (spec section 7), on screen and on paper. */
@page {
  size: 297mm 185.625mm;
  margin: 0;
}

.offer-sheet {
  container-type: inline-size;
  position: relative;
  overflow: hidden;
  width: 100%;
  max-width: 1120px;
  margin-inline: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: 18px;
}
@media (min-width: 768px) {
  .offer-sheet {
    aspect-ratio: 16 / 10;
  }
}

/* Type that scales with the sheet, never below a readable size on a phone. */
.offer-sheet .t-xs { font-size: max(11px, 0.95cqw); }
.offer-sheet .t-sm { font-size: max(13px, 1.2cqw); }
.offer-sheet .t-md { font-size: max(15px, 1.55cqw); }
.offer-sheet .t-lg { font-size: max(19px, 2.3cqw); }
.offer-sheet .t-xl { font-size: max(24px, 3.4cqw); }
.offer-sheet .t-2xl { font-size: max(30px, 5cqw); }

@media print {
  html,
  body {
    background: #fff !important;
  }
  .offer-stack {
    gap: 0 !important;
    padding: 0 !important;
  }
  .offer-sheet {
    width: 297mm;
    max-width: none;
    height: 185.625mm;
    aspect-ratio: auto;
    border: 0;
    border-radius: 0;
    break-after: page;
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
  .offer-sheet:last-child {
    break-after: auto;
  }
  .no-print {
    display: none !important;
  }
}
```

```tsx
// src/app/o/not-found.tsx
export default function OfferNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-3 p-6 text-center">
      <h1 className="font-display text-2xl">الرابط ده مش شغال</h1>
      <p className="text-muted">ممكن يكون العرض لسه مستني موافقة، أو الرابط ناقص. اسأل مسؤول المبيعات اللي بعتهولك.</p>
      <p lang="en" dir="ltr" className="text-sm text-muted">
        This link doesn&apos;t open an offer. Please ask your sales contact.
      </p>
    </main>
  );
}
```

- [ ] **Step 3: Shared pieces**

```ts
// src/components/offer/context.ts
import ar from "@/app/[lang]/dictionaries/ar.json";
import en from "@/app/[lang]/dictionaries/en.json";
import { formatMoney, formatNumber } from "@/lib/format";
import { cairoDate } from "@/lib/catalog/schedule";
import { OFFER_COPY, offerDate, type OfferCopy } from "@/lib/sales/offer-copy";
import type { OfferSnapshot } from "@/lib/sales/offer-snapshot";
import type { OfferLanguage } from "@/lib/sales/offers";

/** What every sheet of an offer needs: the snapshot, its language's words, and formatters. */
export type OfferCtx = {
  snap: OfferSnapshot;
  language: OfferLanguage;
  c: OfferCopy;
  dict: typeof ar;
  money: (n: number) => string;
  num: (n: number) => string;
  pct: (n: number) => string;
  /** The issue date on Cairo's calendar, "YYYY-MM-DD": the schedule's month 0. */
  issuedIso: string;
  issued: string;
  validUntil: string;
  /** The text in the offer's language, falling back to the other one. */
  pick: (arText: string | null | undefined, enText: string | null | undefined) => string;
  /** A label from a dictionary list (sub-types, views…), or the raw value. */
  label: (list: "subTypes" | "finishing" | "unitViews" | "orientations" | "frequency", value: string | null) => string;
};

export function offerCtx(o: { snap: OfferSnapshot; language: OfferLanguage; issuedAt: Date; validUntil: Date }): OfferCtx {
  const { snap, language } = o;
  const dict = (language === "ar" ? ar : en) as typeof ar;
  const pctFormat = new Intl.NumberFormat(language === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return {
    snap,
    language,
    c: OFFER_COPY[language] as OfferCopy,
    dict,
    money: (n) => formatMoney(n, language, snap.currency),
    num: (n) => formatNumber(n, language),
    pct: (n) => `${pctFormat.format(n)}%`,
    issuedIso: cairoDate(o.issuedAt),
    issued: offerDate(o.issuedAt, language),
    validUntil: offerDate(o.validUntil, language),
    pick: (a, e) => (language === "ar" ? a || e : e || a) ?? "",
    label: (list, value) => (value ? ((dict[list] as Record<string, string>)[value] ?? value) : "—"),
  };
}
```

```tsx
// src/components/offer/sheet.tsx
import type { ReactNode } from "react";

/** One 16:10 page of the offer. */
export function Sheet({ children, className = "", label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <section aria-label={label} className={`offer-sheet ${className}`}>
      {children}
    </section>
  );
}

/** A label above its value, as on every sheet. */
export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-[0.3cqw]">
      <dt className="t-xs text-muted">{label}</dt>
      <dd className="t-md m-0 font-medium tabular-nums">{children}</dd>
    </div>
  );
}
```

- [ ] **Step 4: The document with its first sheets**

```tsx
// src/components/offer/offer-document.tsx
import { PrintButton } from "@/components/share-button";
import { fill } from "@/lib/format";
import type { PublicOffer } from "@/lib/sales/offer-service";
import { offerCtx, type OfferCtx } from "./context";
import { Fact, Sheet } from "./sheet";

/** The client's offer: the sheets of spec section 7, and a toolbar that isn't printed. */
export function OfferDocument({ offer }: { offer: PublicOffer }) {
  const ctx = offerCtx(offer);
  const { c } = ctx;
  return (
    <main lang={offer.language} dir={offer.language === "ar" ? "rtl" : "ltr"} className="offer-stack flex flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="no-print mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-sm text-muted">{ctx.pick(ctx.snap.developer.nameAr, ctx.snap.developer.nameEn)}</p>
        <div className="flex flex-wrap gap-2.5">
          {offer.pdfUrl && (
            <a href={offer.pdfUrl} className="press inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-5 text-[15px] text-ink no-underline">
              {c.download}
            </a>
          )}
          <PrintButton label={c.print} className="press inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-[15px] font-medium text-white hover:bg-brand-2" />
        </div>
      </div>
      {offer.banner && (
        <p role="status" className="no-print mx-auto w-full max-w-[1120px] rounded-2xl bg-brass-soft px-5 py-3 text-brass-dark">
          {c.banners[offer.banner]}
        </p>
      )}
      <CoverSheet ctx={ctx} banner={offer.banner ? c.banners[offer.banner] : null} />
      <ProjectSheet ctx={ctx} />
      {/* Task 18 adds the master plan, unit and schedule sheets here. */}
      <ContactSheet ctx={ctx} />
    </main>
  );
}

function CoverSheet({ ctx, banner }: { ctx: OfferCtx; banner: string | null }) {
  const { snap, c } = ctx;
  const developer = ctx.pick(snap.developer.nameAr, snap.developer.nameEn);
  return (
    <Sheet label={c.title} className="flex flex-col justify-between bg-deep p-[6cqw] text-white">
      {banner && <p className="t-sm absolute inset-x-0 top-0 m-0 bg-brass-light px-[4cqw] py-[1cqw] text-center font-medium text-deep">{banner}</p>}
      <div className="flex items-start justify-between gap-[4cqw]">
        {snap.developer.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- uploaded logo of unknown size
          <img src={snap.developer.logoUrl} alt={developer} className="h-[7cqw] max-w-[28cqw] rounded-[1cqw] bg-white object-contain p-[0.8cqw]" />
        ) : (
          <span className="t-lg font-display">{developer}</span>
        )}
        <span className="t-sm tracking-wide text-brass-light">{c.title}</span>
      </div>
      <div className="flex flex-col gap-[1.2cqw]">
        <h1 className="t-2xl m-0 font-display font-light leading-tight">{ctx.pick(snap.project.nameAr, snap.project.nameEn)}</h1>
        <p className="t-xl m-0 font-display">
          <bdi dir="ltr">{snap.unit.label}</bdi>
        </p>
        <p className="t-md m-0 text-white/80">
          {c.preparedFor} <strong className="font-medium text-white">{snap.client.name}</strong>
        </p>
      </div>
      <dl className="t-sm m-0 flex flex-wrap gap-x-[5cqw] gap-y-[1cqw] text-white/80">
        <div>
          <dt className="inline">{c.issued}: </dt>
          <dd className="inline font-medium text-white">{ctx.issued}</dd>
        </div>
        <div>
          <dt className="inline">{c.validUntil}: </dt>
          <dd className="inline font-medium text-white">{ctx.validUntil}</dd>
        </div>
      </dl>
    </Sheet>
  );
}

function ProjectSheet({ ctx }: { ctx: OfferCtx }) {
  const { snap, c } = ctx;
  const p = snap.project;
  const description = ctx.pick(p.descriptionAr, p.descriptionEn);
  const delivery = new Date(`${p.deliveryDate}T00:00:00Z`).toLocaleDateString(ctx.language === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
  return (
    <Sheet label={ctx.pick(p.nameAr, p.nameEn)} className="grid grid-cols-1 md:grid-cols-[1.15fr_1fr]">
      {p.photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded photo
        <img src={p.photo} alt="" className="h-56 w-full object-cover md:h-full" />
      ) : (
        <div className="hidden bg-plan md:block" />
      )}
      <div className="flex flex-col justify-center gap-[2cqw] p-[4.5cqw]">
        <h2 className="t-xl m-0 font-display font-light">{ctx.pick(p.nameAr, p.nameEn)}</h2>
        {description && <p className="t-sm m-0 line-clamp-[9] text-body">{description}</p>}
        <dl className="m-0 grid grid-cols-2 gap-x-[3cqw] gap-y-[1.6cqw] border-t border-divider pt-[2cqw]">
          {ctx.pick(p.placeAr, p.placeEn) && <Fact label={c.project.location}>{ctx.pick(p.placeAr, p.placeEn)}</Fact>}
          <Fact label={c.project.delivery}>{delivery}</Fact>
          {p.landFeddan !== null && <Fact label={c.project.land}>{fill(c.project.feddan, { n: ctx.num(p.landFeddan) })}</Fact>}
          {p.unitsCount !== null && <Fact label={c.project.units}>{ctx.num(p.unitsCount)}</Fact>}
        </dl>
      </div>
    </Sheet>
  );
}

function ContactSheet({ ctx }: { ctx: OfferCtx }) {
  const { snap, c } = ctx;
  const s = snap.salesperson;
  const d = snap.developer;
  const line = (label: string, value: string | null) =>
    value && (
      <Fact label={label}>
        <bdi dir="ltr">{value}</bdi>
      </Fact>
    );
  return (
    <Sheet label={c.contact.title} className="flex flex-col justify-between bg-deep p-[6cqw] text-white [&_dt]:text-white/60">
      <h2 className="t-xl m-0 font-display font-light">{c.contact.title}</h2>
      <div className="grid gap-[4cqw] md:grid-cols-2">
        <dl className="m-0 flex flex-col gap-[1.6cqw]">
          <Fact label={c.contact.salesperson}>{ctx.pick(s.nameAr, s.nameEn)}</Fact>
          {line(c.contact.phone, s.phone)}
          {line(c.contact.whatsapp, s.whatsapp)}
          {line(c.contact.email, s.email)}
        </dl>
        <dl className="m-0 flex flex-col gap-[1.6cqw]">
          <Fact label={ctx.pick(d.nameAr, d.nameEn)}>{d.hotline ? <bdi dir="ltr">{`${c.contact.hotline} ${d.hotline}`}</bdi> : null}</Fact>
          {line(c.contact.website, d.website)}
        </dl>
      </div>
      <div className="flex flex-col gap-[1cqw]">
        <p className="t-xs m-0 max-w-[80cqw] text-white/70">{c.disclaimer}</p>
        <p className="t-sm m-0 text-brass-light">{c.by}</p>
      </div>
    </Sheet>
  );
}
```

(`PrintButton` is the client component kept in `src/components/share-button.tsx`; check its export, it is `PrintButton({ label, className })`.)

- [ ] **Step 5: The page**

```tsx
// src/app/o/[token]/page.tsx
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { OfferDocument } from "@/components/offer/offer-document";
import { loadPublicOffer } from "@/lib/sales/offer-service";
import { isOfferToken } from "@/lib/sales/offer-token";

// The client's price offer (spec section 7). The token is the only key: 24 random bytes.
export default async function OfferPage({ params }: PageProps<"/o/[token]">) {
  await connection();
  const { token } = await params;
  const offer = isOfferToken(token) ? await loadPublicOffer(token) : null;
  if (!offer) notFound();
  return <OfferDocument offer={offer} />;
}
```

- [ ] **Step 6: Check, look, commit**

Run: `npx next typegen && npx tsc --noEmit && npm run lint` — clean.
On `next dev`, with an offer from Task 16's scratch script (or a new one): `/o/<token>` without signing in shows the cover, project and contact sheets in its language and direction; `/o/<a pending offer's token>` and `/o/abc` show the not-found page; `curl -sI http://localhost:3000/o/<token>` has `X-Robots-Tag: noindex, nofollow` and no redirect to `/ar`; `/robots.txt` lists `/o/`. Look at 360 px and 1280 px.

```bash
git add src/app/o src/components/offer src/proxy.ts src/app/robots.ts next.config.ts
git commit -m "Client offer page /o/[token]: own layout, cover, project and contact sheets, never indexed"
```

---

### Task 18: The client's offer page, part 2: master plan, unit and schedule

**Files:**
- Create: `src/components/offer/offer-sheets.tsx`
- Modify: `src/components/offer/offer-document.tsx`

- [ ] **Step 1: The three kinds of sheet**

```tsx
// src/components/offer/offer-sheets.tsx
import type { ReactNode } from "react";
import { MarkedPlan } from "@/components/sales/marked-plan";
import { fill } from "@/lib/format";
import { addMonths, type ScheduleRow } from "@/lib/catalog/schedule";
import { subTypeSingular } from "@/lib/sales/labels";
import { scheduleDate } from "@/lib/sales/offer-copy";
import type { OfferCtx } from "./context";
import { Fact, Sheet } from "./sheet";

export function MasterPlanSheet({ ctx }: { ctx: OfferCtx }) {
  const { snap, c } = ctx;
  const p = snap.project;
  if (!p.masterPlan) return null;
  const zone = p.zone && { x: p.zone.x, y: p.zone.y, w: p.zone.w, h: p.zone.h, label: ctx.pick(p.zone.nameAr, p.zone.nameEn) };
  return (
    <Sheet label={c.masterPlan} className="flex flex-col gap-[2cqw] bg-plan p-[3.5cqw]">
      <div className="flex flex-wrap items-baseline justify-between gap-[2cqw]">
        <h2 className="t-lg m-0 font-display font-light">{c.masterPlan}</h2>
        <p className="t-sm m-0 text-body">{zone ? fill(c.zoneMarked, { zone: zone.label }) : c.zoneUnknown}</p>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <MarkedPlan
          image={p.masterPlan}
          zone={zone}
          alt={`${c.masterPlan}: ${ctx.pick(p.nameAr, p.nameEn)}`}
          className="relative mx-auto w-fit"
          imgClassName="block h-auto max-h-[52cqw] w-auto max-w-full"
        />
      </div>
    </Sheet>
  );
}

export function UnitSheet({ ctx }: { ctx: OfferCtx }) {
  const { snap, c } = ctx;
  const u = snap.unit;
  const m2 = (v: number | null) => (v ? fill(c.unit.m2, { n: ctx.num(v) }) : null);
  const facts: [string, ReactNode][] = [
    [c.unit.type, ctx.language === "ar" ? subTypeSingular(u.subType) : ctx.label("subTypes", u.subType)],
    [c.unit.model, <bdi key="m" dir="ltr">{[u.typeCode, ctx.pick(u.typeNameAr, u.typeNameEn)].filter(Boolean).join(" · ")}</bdi>],
    [c.unit.floor, u.floor === null ? null : u.floor === 0 ? c.unit.ground : ctx.num(u.floor)],
    [c.unit.bedrooms, u.bedrooms === null ? null : ctx.num(u.bedrooms)],
    [c.unit.bathrooms, u.bathrooms === null ? null : ctx.num(u.bathrooms)],
    [c.unit.area, m2(u.buaM2)],
    [c.unit.garden, m2(u.gardenM2)],
    [c.unit.roof, m2(u.roofM2)],
    [c.unit.terrace, m2(u.terraceM2)],
    [c.unit.view, u.view ? ctx.label("unitViews", u.view) : null],
    [c.unit.orientation, u.orientation ? ctx.label("orientations", u.orientation) : null],
    [c.unit.finishing, ctx.label("finishing", u.finishing)],
  ];
  const cash = snap.plan.cash && snap.plan.cashDiscountPct ? snap.plan.cashDiscountPct : 0;
  const discounted = cash > 0 || snap.discountPct > 0;
  return (
    <Sheet label={c.unit.title} className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr]">
      <div className="flex flex-col gap-[2.4cqw] p-[4cqw]">
        <h2 className="t-xl m-0 font-display font-light">
          {c.unit.title} <bdi dir="ltr">{u.label}</bdi>
        </h2>
        <dl className="m-0 grid grid-cols-2 gap-x-[3cqw] gap-y-[1.5cqw] sm:grid-cols-3">
          {facts
            .filter(([, v]) => v !== null && v !== undefined)
            .map(([label, value]) => (
              <Fact key={label} label={label}>
                {value}
              </Fact>
            ))}
        </dl>
        <dl className="m-0 mt-auto grid gap-[0.8cqw] border-t border-divider pt-[2cqw]">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="t-sm text-muted">{discounted ? c.listPrice : c.price}</dt>
            <dd className={`m-0 tabular-nums ${discounted ? "t-md text-muted line-through" : "t-xl font-display"}`}>{ctx.money(snap.listPrice)}</dd>
          </div>
          {cash > 0 && (
            <div className="t-sm flex justify-between gap-4">
              <dt className="text-muted">{c.cashDiscount}</dt>
              <dd className="m-0 tabular-nums">{ctx.pct(cash)}</dd>
            </div>
          )}
          {snap.discountPct > 0 && (
            <div className="t-sm flex justify-between gap-4">
              <dt className="text-muted">{c.discount}</dt>
              <dd className="m-0 tabular-nums">{ctx.pct(snap.discountPct)}</dd>
            </div>
          )}
          {discounted && (
            <div className="flex items-baseline justify-between gap-4">
              <dt className="t-sm font-medium">{c.netPrice}</dt>
              <dd className="t-xl m-0 font-display tabular-nums text-brass">{ctx.money(snap.price)}</dd>
            </div>
          )}
        </dl>
      </div>
      {u.floorPlan && (
        <figure className="m-0 flex flex-col gap-[1cqw] border-divider bg-white p-[3cqw] md:border-s">
          {/* eslint-disable-next-line @next/next/no-img-element -- uploaded floor plan */}
          <img src={u.floorPlan} alt={c.unit.floorPlan} className="min-h-0 w-full flex-1 object-contain" />
          <figcaption className="t-xs text-muted">{c.unit.floorPlan}</figcaption>
        </figure>
      )}
    </Sheet>
  );
}

/** Rows per schedule sheet: the first has the plan's header and the totals line. */
export const FIRST_SHEET_ROWS = 12;
export const NEXT_SHEET_ROWS = 16;

export function ScheduleSheet({ ctx, rows, first, last }: { ctx: OfferCtx; rows: ScheduleRow[]; first: boolean; last: boolean }) {
  const { snap, c } = ctx;
  const s = snap.schedule;
  const plan = ctx.pick(snap.plan.nameAr, snap.plan.nameEn) || (snap.plan.custom ? c.customPlan : ctx.label("frequency", snap.plan.frequency));
  const name = (r: ScheduleRow) =>
    r.installment === null ? c.maintenanceOnly : r.installment === 0 ? (snap.plan.cash ? c.cashPayment : c.downPayment) : fill(c.installment, { n: ctx.num(r.installment) });
  const cell = "px-[0.8cqw] py-[0.55cqw] text-center tabular-nums";
  const col = c.columns;
  return (
    <Sheet label={first ? c.schedule : c.continued} className="flex flex-col gap-[1.6cqw] p-[3.5cqw]">
      <div className="flex flex-wrap items-end justify-between gap-[2cqw]">
        <div className="flex flex-col gap-[0.4cqw]">
          <h2 className="t-lg m-0 font-display font-light">{first ? c.schedule : c.continued}</h2>
          {first && (
            <p className="t-sm m-0 text-body">
              <bdi dir="ltr">{snap.unit.label}</bdi> · {ctx.pick(snap.project.nameAr, snap.project.nameEn)} · {c.plan}: {plan} · {c.issued}: {ctx.issued}
            </p>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="t-xs w-full min-w-[640px] border-collapse md:min-w-0">
          <thead>
            <tr className="bg-ground text-muted">
              {[col.no, col.date, col.amount, col.pct, col.cumulative, col.maintenance, col.total].map((h) => (
                <th key={h} scope="col" className={`${cell} font-medium`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {first && (
              <tr className="border-b border-divider font-medium">
                <td className={cell}>{c.totals}</td>
                <td className={cell} />
                <td className={cell}>{ctx.num(s.price)}</td>
                <td className={cell} />
                <td className={cell} />
                <td className={cell}>{s.maintenance ? ctx.num(s.maintenance) : ""}</td>
                <td className={cell}>{ctx.money(s.total)}</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.monthOffset} className={`border-b border-divider ${r.maintenance ? "bg-plan/50" : ""}`}>
                <td className={cell}>{name(r)}</td>
                <td className={cell}>{scheduleDate(addMonths(ctx.issuedIso, r.monthOffset), ctx.language)}</td>
                <td className={cell}>{r.amount ? ctx.num(r.amount) : ""}</td>
                <td className={`${cell} text-brass`}>{r.amount ? ctx.pct(r.pct) : ""}</td>
                <td className={`${cell} text-brass`}>{ctx.pct(r.cumulativePct)}</td>
                <td className={cell}>{r.maintenance ? ctx.num(r.maintenance) : ""}</td>
                <td className={cell}>{ctx.money(r.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {last && (
        <p className="t-xs m-0 mt-auto text-muted">
          {fill(c.cheques, { payments: ctx.num(s.payments), maintenance: ctx.num(s.maintenancePayments), all: ctx.num(s.payments + s.maintenancePayments) })}
        </p>
      )}
    </Sheet>
  );
}
```

- [ ] **Step 2: Put them in the document**

In `offer-document.tsx`, import `pageRows` from `@/lib/catalog/schedule` and the three sheets with `FIRST_SHEET_ROWS` / `NEXT_SHEET_ROWS`, and replace the Task 17 placeholder comment with:

```tsx
      <MasterPlanSheet ctx={ctx} />
      <UnitSheet ctx={ctx} />
      {pageRows(ctx.snap.schedule.rows, FIRST_SHEET_ROWS, NEXT_SHEET_ROWS).map((rows, i, all) => (
        <ScheduleSheet key={i} ctx={ctx} rows={rows} first={i === 0} last={i === all.length - 1} />
      ))}
```

- [ ] **Step 3: Check, look, print, commit**

Run: `npx tsc --noEmit && npm run lint` — clean.
Make two offers in the scratch script (one Arabic on a stepped plan with ~33 installments and a zone, one English on a cash plan without a master plan) and open both on `next dev`:
- the sheets read in order: cover, project, master plan (zone boxed; or no sheet), unit, schedule (3 sheets for 33 rows), contact; English is left to right, Arabic right to left;
- the schedule's figures equal the scratch script's `snapshot.schedule` and the dates step from the issue date;
- print preview in Chrome (Ctrl+P) shows one sheet per landscape page, nothing cut; the toolbar and screen banner are not printed;
- with `CHROME_PATH` set, run Task 1's `pdf-spike.mts` with `http://localhost:3000/o/<token>` instead of the HTML file: `pages` = number of sheets.
Fix what doesn't fit (usually row counts per sheet: adjust `FIRST_SHEET_ROWS` / `NEXT_SHEET_ROWS`).

```bash
git add src/components/offer
git commit -m "Client offer page: master plan with the unit's zone, unit sheet, schedule over as many sheets as needed"
```

---

### Task 19: The offer's PDF

**Files:**
- Create: `src/lib/sales/offer-pdf.ts`, `src/app/sales/offers/[id]/pdf/route.ts`
- Delete: `src/app/api/pdf-check/route.ts`
- Modify: `.env.example`

- [ ] **Step 1: Make it once, keep it**

```ts
// src/lib/sales/offer-pdf.ts
import "server-only";
import { del, put } from "@vercel/blob";
import { db } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { pdfEnabled, renderPdf } from "./pdf";

// An issued offer's PDF (spec 7): /o/[token] printed by headless Chromium, stored once in Vercel Blob
// and reused. Off (null) unless OFFER_PDF=on and Blob is set up; then sharing sends the link.

/** The client's link, on the site's public address. */
export const offerUrl = (token: string) => `${SITE_URL}/o/${token}`;

/**
 * This deployment's own address, so the PDF browser opens this deployment's page: the site's address
 * in production and locally (NEXT_PUBLIC_SITE_URL), the deployment's own URL on a preview. Never from
 * Host or X-Forwarded-* headers, which the caller controls and would point the browser (with the
 * protection-bypass secret) at another server.
 */
export function requestOrigin(): string {
  if (process.env.VERCEL_ENV !== "production" && process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return SITE_URL;
}

export const pdfAvailable = () => pdfEnabled() && Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** The offer's PDF URL, making and storing it the first time. Null when server PDFs are off. */
export async function ensureOfferPdf(offer: { id: string; token: string; pdfUrl: string | null }, origin: string): Promise<string | null> {
  if (offer.pdfUrl) return offer.pdfUrl;
  if (!pdfAvailable()) return null;
  const pdf = await renderPdf(`${origin}/o/${offer.token}`);
  const { url } = await put(`offers/${offer.id}.pdf`, Buffer.from(pdf), { access: "public", contentType: "application/pdf", addRandomSuffix: true });
  const { count } = await db.salesOffer.updateMany({ where: { id: offer.id, pdfUrl: null }, data: { pdfUrl: url } });
  if (count) return url;
  // Another request made it at the same moment: keep theirs.
  await del(url).catch(() => undefined);
  return (await db.salesOffer.findUnique({ where: { id: offer.id }, select: { pdfUrl: true } }))?.pdfUrl ?? null;
}

/** A file name for the PDF: "Offer B1-101 Wadi Yemm.pdf" (any language; sent encoded). */
export const offerFileName = (unit: string, project: string) => `Offer ${unit.replace(/\s*·\s*/g, "-")} ${project}.pdf`.replace(/[\\/:*?"<>|]/g, "");
```

Check `put`'s options against `node_modules/@vercel/blob` 2.9 (the merged `main` version): `access`, `contentType` and `addRandomSuffix` exist there; if `put` now refuses an existing path without `allowOverwrite`, the random suffix already avoids it.

- [ ] **Step 2: The route**

```ts
// src/app/sales/offers/[id]/pdf/route.ts
import { db } from "@/lib/db";
import { canSeeOffer } from "@/lib/sales/offers";
import { asSnapshot } from "@/lib/sales/offer-snapshot";
import { ensureOfferPdf, offerFileName, requestOrigin } from "@/lib/sales/offer-pdf";
import { currentSalesAccount } from "@/lib/sales/session";

// The offer's PDF for its salesperson or a team lead (the share screen downloads it and hands it to the
// phone's share sheet). Under /sales so the session cookie comes with the request.

export const maxDuration = 60;

export async function GET(_request: Request, ctx: RouteContext<"/sales/offers/[id]/pdf">) {
  const me = await currentSalesAccount();
  if (!me || me.mustChangePassword) return new Response("Sign in", { status: 401 });
  const { id } = await ctx.params;
  const offer = /^[a-z0-9]{10,40}$/i.test(id)
    ? await db.salesOffer.findFirst({ where: { id, developerId: me.developer.id }, select: { id: true, token: true, pdfUrl: true, status: true, salesAccountId: true, developerId: true, snapshot: true } })
    : null;
  if (!offer || offer.status !== "ISSUED" || !canSeeOffer({ id: me.id, role: me.role, developerId: me.developer.id }, offer)) return new Response("Not found", { status: 404 });
  let url: string | null = null;
  try {
    url = await ensureOfferPdf(offer, requestOrigin());
  } catch (e) {
    console.error("[offer-pdf]", e);
  }
  if (!url) return new Response("PDF unavailable", { status: 503 });
  const file = await fetch(url);
  if (!file.ok || !file.body) return new Response("PDF unavailable", { status: 502 });
  const snap = asSnapshot(offer.snapshot);
  const name = offerFileName(snap?.unit.label ?? "unit", snap?.project.nameEn ?? "");
  return new Response(file.body, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="offer.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "private, no-store",
    },
  });
}
```

- [ ] **Step 3: Remove the spike route**

Run: `git rm src/app/api/pdf-check/route.ts`, then delete the `OFFER_PDF_CHECK` lines from `.env.example`, and remove the `"/api/pdf-check"` key from `outputFileTracingIncludes` in `next.config.ts` (keep the `/sales/offers/\\[id\\]/pdf` one). Add `next.config.ts` to the commit below.

- [ ] **Step 4: Check, try it, commit**

Run: `npx next typegen && npx tsc --noEmit && npm run lint` — clean.
On `next dev` with `OFFER_PDF=on`, `CHROME_PATH` and a `BLOB_READ_WRITE_TOKEN` **for a test store only** (if there is none, skip the upload: check with `OFFER_PDF=on` unset that the route answers 503, and test `renderPdf` on `/o/<token>` as in Task 18): signed in as the salesperson, `/sales/offers/<id>/pdf` downloads the PDF; a second request reuses `pdfUrl`; another company's salesperson gets 404; signed out, 401.

```bash
git add src/lib/sales/offer-pdf.ts src/app/sales/offers .env.example next.config.ts
git commit -m "Offer PDF: printed once from /o/[token], kept in Vercel Blob, served to the salesperson"
```

---

### Task 20: Email and the offer actions

**Files:**
- Modify: `src/lib/throttle.ts`, `src/lib/email.ts`
- Create: `src/app/sales/offer-actions.ts`

- [ ] **Step 1: A rate limit for sending**

Append to `src/lib/throttle.ts`:

```ts
/**
 * Counts one more use of `key` in a window of `minutes`, and says whether it is still within `max`
 * (e.g. offer emails per salesperson). One statement, so two requests can't both slip under the limit.
 */
export async function withinRate(key: string, max: number, minutes: number): Promise<boolean> {
  const resetAt = new Date(Date.now() + minutes * 60_000);
  const [row] = await db.$queryRaw<{ failures: number }[]>`
    INSERT INTO "AuthThrottle" ("key", "failures", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "failures" = CASE WHEN "AuthThrottle"."resetAt" <= now() THEN 1 ELSE "AuthThrottle"."failures" + 1 END,
      "resetAt" = CASE WHEN "AuthThrottle"."resetAt" <= now() THEN EXCLUDED."resetAt" ELSE "AuthThrottle"."resetAt" END
    RETURNING "failures"`;
  return (row?.failures ?? 1) <= max;
}
```

(The `AuthThrottle` keys of this use start with `offer-email:`, so `lockedMinutes` never reads them as sign-in failures: it only looks up the keys it is given.)

- [ ] **Step 2: Attachments, and the direction fix**

In `src/lib/email.ts`:
- `Mail` gets `attachments?: { filename: string; path: string }[];` (Resend fetches `path`, a public URL);
- `payload` adds `...(attachments?.length && { attachments }),` (destructure `attachments` with the others);
- `toHtml`: replace `/[0600-06FF]/` with `/[؀-ۿ]/` — the old class matched the characters 0, 6, - and F, so the email's direction depended on its digits.

- [ ] **Step 3: The actions**

```ts
// src/app/sales/offer-actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { FormReader, type FormState } from "@/lib/admin/form";
import { fill } from "@/lib/format";
import { withinRate } from "@/lib/throttle";
import { OFFER_COPY } from "@/lib/sales/offer-copy";
import { ensureOfferPdf, offerFileName, offerUrl, requestOrigin } from "@/lib/sales/offer-pdf";
import { approveOffer, cancelOffer, createOffer, recordShare, type ShareChannel } from "@/lib/sales/offer-service";
import { asSnapshot } from "@/lib/sales/offer-snapshot";
import { canShareOffer, readOfferForm, type OfferActor } from "@/lib/sales/offers";
import { offerMessage } from "@/lib/sales/share";
import { requireSales, type SalesUser } from "@/lib/sales/session";

// Each action re-reads the session and passes the salesperson's own developer to the service, which
// scopes every query: another company's ids find nothing.

const actor = (me: SalesUser): OfferActor => ({ id: me.id, role: me.role, developerId: me.developer.id });
const EMAILS_PER_HOUR = 20;

export async function createOfferAction(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales();
  const f = new FormReader(data);
  const input = readOfferForm(f);
  if (!f.ok || !input.unitId || !input.planId) return f.result();
  const result = await createOffer(actor(me), { ...input, unitId: input.unitId, planId: input.planId });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/sales", "layout");
  redirect(`/sales/offers/${result.id}`);
}

export async function approveOfferAction(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales();
  const id = new FormReader(data).id("offerId");
  if (!id) return { ok: false, message: "العرض ده مش موجود" };
  const result = await approveOffer(actor(me), id);
  revalidatePath("/sales", "layout");
  return result;
}

/** Cancel (the salesperson or a team lead), or reject a pending offer (a team lead). */
export async function cancelOfferAction(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales();
  const id = new FormReader(data).id("offerId");
  if (!id) return { ok: false, message: "العرض ده مش موجود" };
  const result = await cancelOffer(actor(me), id);
  revalidatePath("/sales", "layout");
  return result;
}

/** Called when the salesperson opens WhatsApp or Telegram, or the phone's share sheet, from the share screen. */
export async function recordShareAction(offerId: string, channel: Exclude<ShareChannel, "EMAIL">): Promise<void> {
  const me = await requireSales();
  if (!/^[a-z0-9]{10,40}$/i.test(offerId) || !["WHATSAPP", "TELEGRAM", "DEVICE"].includes(channel)) return;
  await recordShare(actor(me), offerId, channel);
  revalidatePath(`/sales/offers/${offerId}`);
}

/** Emails the offer to the client from the site's address; replies go to the salesperson. */
export async function emailOfferAction(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales();
  const f = new FormReader(data);
  const id = f.id("offerId");
  const to = f.text("email", { required: true, max: 200 });
  if (to && !/^\S+@\S+\.\S+$/.test(to)) f.errors.email = "بريد إلكتروني غير صالح";
  if (!f.ok || !id || !to) return f.result();
  const offer = await db.salesOffer.findFirst({
    where: { id, developerId: me.developer.id },
    select: { id: true, token: true, pdfUrl: true, status: true, salesAccountId: true, developerId: true, language: true, validUntil: true, clientName: true, snapshot: true },
  });
  const snap = offer && asSnapshot(offer.snapshot);
  if (!offer || !snap || !canShareOffer(actor(me), offer)) return { ok: false, message: "العرض ده مش متاح للمشاركة" };
  if (!(await withinRate(`offer-email:${me.id}`, EMAILS_PER_HOUR, 60))) return { ok: false, message: "بعتّ إيميلات كتير في الساعة دي. جرّب بعد شوية أو ابعت على واتساب" };
  let pdf: string | null = null;
  try {
    pdf = await ensureOfferPdf(offer, requestOrigin());
  } catch (e) {
    console.error("[offer-pdf]", e);
  }
  const c = OFFER_COPY[offer.language];
  const unit = snap.unit.label;
  const project = offer.language === "ar" ? snap.project.nameAr : snap.project.nameEn;
  const first = snap.schedule.rows[0];
  const name = offer.language === "ar" ? snap.salesperson.nameAr : (snap.salesperson.nameEn ?? snap.salesperson.nameAr);
  const sent = await sendEmail({
    to,
    subject: fill(c.emailSubject, { unit, project }),
    text: [
      fill(c.emailHello, { name: offer.clientName }),
      "",
      fill(c.emailBody, { attached: pdf ? c.emailAttached : "" }),
      offerUrl(offer.token),
      "",
      offerMessage({ language: offer.language, currency: snap.currency, unit, project, price: snap.price, down: first?.amount ?? 0, cash: snap.plan.cash, validUntil: offer.validUntil }),
      "",
      `${name} · ${snap.salesperson.phone}`,
    ].join("\n"),
    replyTo: me.email ?? undefined,
    attachments: pdf ? [{ filename: offerFileName(unit, snap.project.nameEn), path: pdf }] : undefined,
  });
  if (!sent) return { ok: false, message: "الإيميل مااتبعتش. جرّب تاني، أو ابعت الرابط على واتساب" };
  await recordShare(actor(me), offer.id, "EMAIL");
  await db.salesOffer.update({ where: { id: offer.id }, data: { clientEmail: to } });
  revalidatePath(`/sales/offers/${offer.id}`);
  return { ok: true, message: pdf ? `اتبعت ✓ لـ ${to} والـ PDF مرفق` : `اتبعت ✓ لـ ${to} برابط العرض` };
}
```

- [ ] **Step 4: Check and commit**

Run: `npx tsc --noEmit && npm run lint && npm test` — clean.
A scratch check of `withinRate("t:1", 2, 60)` three times gives `true, true, false`; delete the row afterwards.

```bash
git add src/lib/throttle.ts src/lib/email.ts src/app/sales/offer-actions.ts
git commit -m "Offer actions and email: PDF attached when available, replies to the salesperson, 20 an hour; fix email direction"
```

---

### Task 21: Sales: the new-offer form

**Files:**
- Create: `src/app/sales/units/[id]/offer/page.tsx`, `src/components/sales/offer-form.tsx`
- Modify: `src/app/sales/units/[id]/page.tsx`

- [ ] **Step 1: The form**

```tsx
// src/components/sales/offer-form.tsx
"use client";

import { useState } from "react";
import { AdminForm } from "@/components/admin/admin-form";
import { Row, Select, TextField } from "@/components/admin/fields";
import { createOfferAction } from "@/app/sales/offer-actions";
import { formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/property";
import { DISCOUNT_CAP, OFFER_VALIDITY_MAX, discountDecision, type DiscountLimits, type OfferActor } from "@/lib/sales/offers";

type PlanOption = { id: string; label: string };

const western = (s: string) => s.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[,\s]/g, "");

/**
 * A new offer for one unit: who it is for, the plan, the language, how long it holds and an optional
 * discount. Under the discount it says at once whether the offer goes out or waits for a team lead.
 */
export function OfferForm({
  unitId,
  plans,
  validityDays,
  limits,
  role,
  price,
  currency,
}: {
  unitId: string;
  plans: PlanOption[];
  validityDays: number;
  limits: DiscountLimits;
  role: OfferActor["role"];
  price: number;
  currency: Currency;
}) {
  const [discount, setDiscount] = useState("");
  const pct = Number(western(discount)) || 0;
  const decision = discountDecision(role, pct, limits);
  const net = formatMoney(Math.round(price * (1 - pct / 100)), "ar", currency);
  const note = !discount.trim() || pct === 0 ? null : !decision.ok ? decision.message : decision.status === "PENDING_APPROVAL" ? `السعر بعد الخصم ${net}. العرض هيستنى موافقة قائد الفريق قبل ما تقدر تبعته.` : `السعر بعد الخصم ${net}.`;
  return (
    <AdminForm action={createOfferAction} submitLabel="طلّع العرض" pendingLabel="بنجهّز العرض…" submitClassName="admin-btn min-h-11 justify-center sm:min-h-0">
      <input type="hidden" name="unitId" value={unitId} />
      <Row>
        <TextField name="clientName" label="اسم العميل *" autoComplete="off" hint="بيظهر على غلاف العرض" />
        <TextField name="clientPhone" type="tel" dir="ltr" label="موبايل العميل" autoComplete="off" hint="لو كتبته، الواتساب هيفتح على رقمه على طول" />
      </Row>
      <Row>
        <Select name="planId" label="خطة السداد *" defaultValue={plans[0]?.id} options={plans.map((p) => ({ value: p.id, label: p.label }))} />
        <TextField name="clientEmail" type="email" dir="ltr" label="إيميل العميل" autoComplete="off" hint="اختياري، عشان تبعتله العرض بالإيميل" />
      </Row>
      <Row cols={3}>
        <Select name="language" label="لغة العرض *" defaultValue="ar" options={[{ value: "ar", label: "عربي" }, { value: "en", label: "English" }]} />
        <TextField name="validityDays" type="number" inputMode="numeric" label="ساري كام يوم *" defaultValue={validityDays} hint={`لحد ${OFFER_VALIDITY_MAX} يوم`} />
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium text-ink">خصم %</span>
          <input name="discountPct" className="admin-input" inputMode="decimal" dir="ltr" autoComplete="off" value={discount} onChange={(e) => setDiscount(e.target.value)} aria-describedby="discount-note" />
          <span id="discount-note" aria-live="polite" className={`text-xs ${note && !decision.ok ? "text-red-700 dark:text-red-300" : "text-muted"}`}>
            {note ?? `اختياري، لحد ${limits.leadDiscountPct || 0}% (والحد الأقصى ${DISCOUNT_CAP}%)`}
          </span>
        </label>
      </Row>
    </AdminForm>
  );
}
```

(Check `TextField`'s props in `src/components/admin/fields.tsx`: it accepts `name`, `label`, `type`, `dir`, `hint`, `defaultValue`, `inputMode`, `autoComplete`; and how field errors from the action's `FormState.errors` reach it, so the action's per-field messages show.)

- [ ] **Step 2: The page**

```tsx
// src/app/sales/units/[id]/offer/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { OfferForm } from "@/components/sales/offer-form";
import { SalesShell } from "@/components/sales/sales-shell";
import { planLabel, plansForType } from "@/lib/sales/budget";
import { loadSalesUnit, salesPlans } from "@/lib/sales/inventory";
import { requireSales } from "@/lib/sales/session";

export const metadata: Metadata = { title: "عرض سعر جديد" };

// A new price offer for one unit. Only an available unit, or one held by this salesperson, can get one.
export default async function NewOfferPage({ params }: PageProps<"/sales/units/[id]/offer">) {
  const me = await requireSales();
  const { id } = await params;
  const viewer = { id: me.id, role: me.role, developerId: me.developer.id };
  const unit = /^[a-z0-9]{10,40}$/i.test(id) ? await loadSalesUnit(viewer, id) : null;
  if (!unit) notFound();
  const [plansByProject, developer] = await Promise.all([
    salesPlans(me.developer.id, [unit.project.id]),
    db.developer.findUniqueOrThrow({ where: { id: me.developer.id }, select: { offerValidityDays: true, agentDiscountPct: true, leadDiscountPct: true } }),
  ]);
  const plans = plansForType(plansByProject.get(unit.project.id) ?? [], unit.typologyId);
  const mine = unit.state === "HELD" && unit.hold?.salesAccountId === me.id;
  const blocked =
    unit.state === "AVAILABLE" || mine
      ? null
      : unit.state === "HELD"
        ? `الوحدة محجوزة مؤقتًا لـ ${unit.hold?.holder ?? "زميل"}، فمينفعش يتعمل عليها عرض دلوقتي.`
        : "الوحدة دي مش متاحة، فمينفعش يتعمل عليها عرض.";
  return (
    <SalesShell
      me={me}
      title={
        <>
          عرض سعر · <bdi dir="ltr">{unit.label}</bdi>
        </>
      }
    >
      <Link href={`/sales/units/${unit.id}`} className="press -mt-3 inline-flex min-h-11 items-center gap-1.5 self-start text-sm sm:min-h-0">
        <span aria-hidden="true">→</span> الوحدة
      </Link>
      {blocked ? (
        <p className="admin-panel m-0 text-sm">{blocked}</p>
      ) : plans.length === 0 ? (
        <p className="admin-panel m-0 text-sm text-muted">مفيش خطط سداد سارية للوحدة دي، فمينفعش يتعمل عرض.</p>
      ) : (
        <section className="admin-panel flex flex-col gap-4">
          <p className="m-0 text-sm text-muted">
            العرض بيتحفظ بأرقام النهارده، وبعد ما يطلع هتظهرلك أزرار المشاركة. العرض مش بيحجز الوحدة{mine ? "؛ الحجز المؤقت بتاعك فاضل زي ما هو" : ""}.
          </p>
          <OfferForm
            unitId={unit.id}
            plans={plans.map((p) => ({ id: p.id, label: planLabel(p) }))}
            validityDays={developer.offerValidityDays}
            limits={{ agentDiscountPct: Number(developer.agentDiscountPct), leadDiscountPct: Number(developer.leadDiscountPct) }}
            role={me.role}
            price={unit.price}
            currency={unit.project.currency}
          />
        </section>
      )}
    </SalesShell>
  );
}
```

- [ ] **Step 3: «عرض سعر» on the unit page**

In `src/app/sales/units/[id]/page.tsx`, replace the two disabled buttons with:

```tsx
              {unit.state === "AVAILABLE" || (unit.state === "HELD" && unit.hold?.salesAccountId === me.id) ? (
                <Link href={`/sales/units/${unit.id}/offer`} className="press admin-btn min-h-11 sm:min-h-9">
                  عرض سعر
                </Link>
              ) : (
                <span className="inline-flex min-h-11 items-center text-sm text-muted sm:min-h-9">مينفعش عرض سعر على وحدة مش متاحة لك</span>
              )}
              <span className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-full border border-dashed border-line-strong px-4 text-sm text-muted select-none sm:min-h-9">
                إضافة للمقارنة
                <span className="admin-badge">قريبًا</span>
              </span>
```

- [ ] **Step 4: Check, look, commit**

Run: `npx next typegen && npx tsc --noEmit && npm run lint` — clean.
On `next dev` as an agent with limits 2% / 5%: the form fills the validity from the developer; typing 1.5 says the net price; 3 says it will wait for a lead; 6 shows «أقصى خصم 5%» in red; an empty name or a bad phone are refused by the action with their messages; a good form lands on `/sales/offers/<id>`. A unit held by a colleague shows the reason and no form. 360 px and 1280 px, light and dark.

```bash
git add src/app/sales/units src/components/sales/offer-form.tsx
git commit -m "Sales: new price offer from the unit page, with the discount's effect shown as it is typed"
```

---

### Task 22: Sales: the offer and its share screen

**Files:**
- Create: `src/app/sales/offers/[id]/page.tsx`, `src/components/sales/share-panel.tsx`, `src/components/sales/offer-state-badge.tsx`, `src/components/sales/offer-buttons.tsx`

- [ ] **Step 1: State badge and buttons**

```tsx
// src/components/sales/offer-state-badge.tsx
import { OFFER_STATE_LABELS, type OfferState } from "@/lib/sales/offers";

const CLASS: Record<OfferState, string> = {
  VALID: "admin-badge",
  PENDING: "admin-badge bg-brass-soft text-brass-dark",
  EXPIRED: "admin-badge-off",
  PRICE_CHANGED: "admin-badge-off",
  UNIT_TAKEN: "admin-badge-off",
  CANCELLED: "admin-badge-off",
};

export function OfferStateBadge({ state, className = "" }: { state: OfferState; className?: string }) {
  return <span className={`${CLASS[state]} ${className}`}>{OFFER_STATE_LABELS[state]}</span>;
}
```

```tsx
// src/components/sales/offer-buttons.tsx
import { AdminForm } from "@/components/admin/admin-form";
import { approveOfferAction, cancelOfferAction } from "@/app/sales/offer-actions";

const touch = "min-h-11 justify-center sm:min-h-0";

export function ApproveOfferButton({ offerId }: { offerId: string }) {
  return (
    <AdminForm action={approveOfferAction} submitLabel="موافقة" pendingLabel="جارٍ الموافقة…" submitClassName={`admin-btn ${touch}`} confirmText="توافق على الخصم؟ العرض هيطلع من دلوقتي وصلاحيته تبدأ من النهارده.">
      <input type="hidden" name="offerId" value={offerId} />
    </AdminForm>
  );
}

/** Reject (a pending offer, for a lead) or cancel (an issued one). */
export function CancelOfferButton({ offerId, reject = false }: { offerId: string; reject?: boolean }) {
  return (
    <AdminForm
      action={cancelOfferAction}
      submitLabel={reject ? "رفض" : "إلغاء العرض"}
      pendingLabel="جارٍ…"
      submitClassName={`admin-btn-ghost ${touch}`}
      confirmText={reject ? "ترفض العرض ده؟ السيلز هيشوفه «اتلغى»." : "تلغي العرض؟ العميل هيشوف إنه اتلغى لو فتح الرابط."}
    >
      <input type="hidden" name="offerId" value={offerId} />
    </AdminForm>
  );
}
```

- [ ] **Step 2: The share panel**

```tsx
// src/components/sales/share-panel.tsx
"use client";

import { useEffect, useState } from "react";
import { EnvelopeSimple, FilePdf, LinkSimple, ShareNetwork, TelegramLogo, WhatsappLogo } from "@phosphor-icons/react";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/fields";
import { emailOfferAction, recordShareAction } from "@/app/sales/offer-actions";

const button = "press inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm text-ink no-underline hover:border-ink sm:min-h-10";

/**
 * After an offer goes out (spec 7): WhatsApp (to the client's number when known), Telegram, email, the
 * phone's own share sheet with the PDF file when the browser can, and the link. Works without server
 * PDFs too: then the link goes out and the offer page's print button makes the PDF.
 */
export function SharePanel({
  offerId,
  url,
  whatsappUrl,
  telegramUrl,
  message,
  title,
  pdfHref,
  fileName,
  clientEmail,
}: {
  offerId: string;
  url: string;
  whatsappUrl: string;
  telegramUrl: string;
  message: string;
  title: string;
  /** The PDF route when server PDFs are on; null otherwise. */
  pdfHref: string | null;
  fileName: string;
  clientEmail: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);

  // The share sheet must open straight from the tap, so the PDF is fetched ahead, and only where files can be shared.
  useEffect(() => {
    if (!pdfHref || typeof navigator === "undefined" || typeof navigator.canShare !== "function") return;
    let gone = false;
    fetch(pdfHref)
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob || gone) return;
        const f = new File([blob], fileName, { type: "application/pdf" });
        if (navigator.canShare({ files: [f] })) setFile(f);
      })
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, [pdfHref, fileName]);

  const shareFile = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], title, text: message });
      void recordShareAction(offerId, "DEVICE");
    } catch {
      // Closed without sharing.
    }
  };

  return (
    <section aria-labelledby="share-title" className="admin-panel flex flex-col gap-4">
      <h2 id="share-title" className="font-display text-xl">
        ابعت العرض
      </h2>
      <div className="flex flex-wrap gap-2.5">
        <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className={button} onClick={() => void recordShareAction(offerId, "WHATSAPP")}>
          <WhatsappLogo size={20} weight="fill" aria-hidden="true" /> واتساب
        </a>
        <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className={button} onClick={() => void recordShareAction(offerId, "TELEGRAM")}>
          <TelegramLogo size={20} weight="fill" aria-hidden="true" /> تليجرام
        </a>
        {file && (
          <button type="button" className={button} onClick={shareFile}>
            <ShareNetwork size={20} aria-hidden="true" /> مشاركة الملف
          </button>
        )}
        {pdfHref ? (
          <a href={pdfHref} className={button}>
            <FilePdf size={20} aria-hidden="true" /> تحميل PDF
          </a>
        ) : (
          <a href={url} target="_blank" rel="noopener noreferrer" className={button}>
            <FilePdf size={20} aria-hidden="true" /> طباعة / حفظ PDF
          </a>
        )}
        <button
          type="button"
          className={button}
          onClick={() => navigator.clipboard.writeText(url).then(() => setCopied(true), () => undefined)}
        >
          <LinkSimple size={20} aria-hidden="true" /> <span aria-live="polite">{copied ? "اتنسخ ✓" : "نسخ الرابط"}</span>
        </button>
      </div>
      <AdminForm action={emailOfferAction} submitLabel="ابعت بالإيميل" pendingLabel="بنبعت…" submitClassName="admin-btn-ghost min-h-11 justify-center sm:min-h-0">
        <input type="hidden" name="offerId" value={offerId} />
        <TextField name="email" type="email" dir="ltr" label="إيميل العميل" defaultValue={clientEmail ?? undefined} autoComplete="off" hint={pdfHref ? "الـ PDF هيتبعت مرفق، والرد هيجيلك على إيميلك" : "هيتبعت رابط العرض، والرد هيجيلك على إيميلك"} />
      </AdminForm>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">
          <EnvelopeSimple size={16} aria-hidden="true" className="inline" /> نص الرسالة
        </summary>
        <p className="mt-2 whitespace-pre-line">{message}</p>
      </details>
    </section>
  );
}
```

- [ ] **Step 3: The page**

```tsx
// src/app/sales/offers/[id]/page.tsx
import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SalesShell } from "@/components/sales/sales-shell";
import { ApproveOfferButton, CancelOfferButton } from "@/components/sales/offer-buttons";
import { OfferStateBadge } from "@/components/sales/offer-state-badge";
import { SharePanel } from "@/components/sales/share-panel";
import { fill, formatDateAr, formatDateTimeAr, formatMoney } from "@/lib/format";
import { OFFER_COPY } from "@/lib/sales/offer-copy";
import { offerFileName, offerUrl, pdfAvailable } from "@/lib/sales/offer-pdf";
import { loadOffer } from "@/lib/sales/offer-service";
import { requireSales } from "@/lib/sales/session";
import { offerMessage, telegramShareUrl, whatsappNumber, whatsappShareUrl } from "@/lib/sales/share";

export const metadata: Metadata = { title: "عرض سعر" };

const CHANNELS = { WHATSAPP: "واتساب", TELEGRAM: "تليجرام", EMAIL: "إيميل", DEVICE: "مشاركة من الموبايل" } as const;

export default async function SalesOfferPage({ params }: PageProps<"/sales/offers/[id]">) {
  const me = await requireSales();
  const { id } = await params;
  const offer = /^[a-z0-9]{10,40}$/i.test(id) ? await loadOffer({ id: me.id, role: me.role, developerId: me.developer.id }, id) : null;
  if (!offer || !offer.snap) notFound();
  const snap = offer.snap;
  const money = (n: number) => formatMoney(n, "ar", snap.currency);
  const url = offerUrl(offer.token);
  const project = offer.language === "ar" ? snap.project.nameAr : snap.project.nameEn;
  const message = offerMessage({ language: offer.language, currency: snap.currency, unit: snap.unit.label, project, price: snap.price, down: snap.schedule.rows[0]?.amount ?? 0, cash: snap.plan.cash, validUntil: offer.validUntil });
  const facts: [string, ReactNode][] = [
    ["العميل", offer.clientName],
    ["موبايل العميل", offer.clientPhone && <bdi dir="ltr">{offer.clientPhone}</bdi>],
    ["الخطة", snap.plan.nameAr || snap.plan.nameEn || (snap.plan.custom ? "جدول سداد مخصص" : "—")],
    ["السعر", snap.discountPct ? <>{money(snap.price)} <span className="text-muted">(خصم {snap.discountPct}% من {money(snap.listPrice)})</span></> : money(snap.price)],
    ["لغة العرض", offer.language === "ar" ? "عربي" : "English"],
    ["اتعمل", formatDateTimeAr(offer.createdAt)],
    ["ساري لحد", formatDateAr(offer.validUntil, "long")],
    ["اتوافق عليه", offer.approvedBy && `${offer.approvedBy.nameAr}، ${formatDateTimeAr(offer.approvedAt!)}`],
    ["اتلغى", offer.cancelledBy && `${offer.cancelledBy.nameAr}، ${formatDateTimeAr(offer.cancelledAt!)}`],
    ["اتبعت على", offer.sentVia.length ? offer.sentVia.map((c) => CHANNELS[c]).join("، ") : null],
  ];
  return (
    <SalesShell
      me={me}
      title={
        <span className="flex flex-wrap items-baseline gap-x-4">
          <bdi dir="ltr">{snap.unit.label}</bdi>
          <span className="text-xl text-muted sm:text-2xl">{snap.project.nameAr}</span>
        </span>
      }
      actions={<OfferStateBadge state={offer.state} className="text-sm" />}
    >
      <Link href="/sales/offers" className="press -mt-3 inline-flex min-h-11 items-center gap-1.5 self-start text-sm sm:min-h-0">
        <span aria-hidden="true">→</span> عروضي
      </Link>
      {offer.state === "PENDING" && (
        <p className="admin-panel m-0 text-sm">
          {offer.canDecide
            ? `${offer.salesAccount.nameAr} طالب خصم ${offer.discountPct}%. لو وافقت، العرض يطلع وصلاحيته تبدأ من النهارده.`
            : "العرض مستني موافقة قائد الفريق على الخصم. الرابط مش هيفتح للعميل لحد ما يتوافق عليه."}
        </p>
      )}
      <section className="admin-panel">
        <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          {facts
            .filter(([, v]) => v)
            .map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <dt className="text-xs text-muted">{label}</dt>
                <dd className="m-0">{value}</dd>
              </div>
            ))}
        </dl>
        <div className="mt-5 flex flex-wrap gap-3 border-t border-divider pt-5">
          {offer.status === "ISSUED" && (
            <a href={url} target="_blank" rel="noreferrer" className="press admin-btn-ghost min-h-11 sm:min-h-9">
              افتح العرض <span aria-hidden="true">↗</span>
            </a>
          )}
          {offer.canDecide && <ApproveOfferButton offerId={offer.id} />}
          {offer.canCancel && <CancelOfferButton offerId={offer.id} reject={offer.canDecide} />}
        </div>
      </section>
      {offer.canShare && (offer.state === "VALID" || offer.state === "PRICE_CHANGED") && (
        <SharePanel
          offerId={offer.id}
          url={url}
          whatsappUrl={whatsappShareUrl(message, url, whatsappNumber(offer.clientPhone))}
          telegramUrl={telegramShareUrl(message, url)}
          message={message}
          title={fill(OFFER_COPY[offer.language].shareTitle, { unit: snap.unit.label, project })}
          pdfHref={pdfAvailable() || offer.pdfUrl ? `/sales/offers/${offer.id}/pdf` : null}
          fileName={offerFileName(snap.unit.label, snap.project.nameEn)}
          clientEmail={offer.clientEmail}
        />
      )}
      {offer.canShare && offer.state !== "VALID" && offer.state !== "PRICE_CHANGED" && (
        <p className="admin-panel m-0 text-sm text-muted">العرض ده مبقاش ينفع يتبعت ({offer.state === "EXPIRED" ? "صلاحيته انتهت" : "الوحدة مبقتش متاحة"}). اعمل عرض جديد من صفحة الوحدة.</p>
      )}
    </SalesShell>
  );
}
```

(A «السعر اتغيّر» offer can still be resent: it holds its issued figures until its date, spec 7; the badge warns the salesperson. Adjust if review prefers to block it.)

- [ ] **Step 4: Check, look, commit**

Run: `npx next typegen && npx tsc --noEmit && npm run lint` — clean.
On `next dev`: an issued offer shows its facts and the share panel; WhatsApp opens `wa.me/2010…?text=…` with the message and link, and `sentVia` gets `WHATSAPP` (reload the page: «اتبعت على: واتساب»); Telegram the same; without `OFFER_PDF` the PDF button opens the offer for printing; email without `RESEND_API_KEY` answers «الإيميل مااتبعتش…»; a pending offer shows the lead's approve/reject buttons to a lead only. 360 px and 1280 px, light and dark.

```bash
git add src/app/sales/offers src/components/sales/share-panel.tsx src/components/sales/offer-state-badge.tsx src/components/sales/offer-buttons.tsx
git commit -m "Sales: the offer page with approval, cancel and sharing by WhatsApp, Telegram, email and the phone"
```

---

### Task 23: Sales: «عروضي», approvals, the menu and «ملفي»

**Files:**
- Create: `src/app/sales/offers/page.tsx`, `src/components/sales/offer-list.tsx`
- Modify: `src/components/sales/sales-nav.tsx`, `src/app/sales/me/page.tsx`

- [ ] **Step 1: The list**

```tsx
// src/components/sales/offer-list.tsx
import Link from "next/link";
import { formatDateAr, formatMoney } from "@/lib/format";
import type { OfferRow } from "@/lib/sales/offer-service";
import { ApproveOfferButton, CancelOfferButton } from "./offer-buttons";
import { OfferStateBadge } from "./offer-state-badge";

/** Offers as rows: unit and project, client, price, state and date. With `decide`, a lead's approve and reject. */
export function OfferList({ offers, decide = false, showOwner = false }: { offers: OfferRow[]; decide?: boolean; showOwner?: boolean }) {
  return (
    <ul className="m-0 flex list-none flex-col divide-y divide-divider p-0">
      {offers.map((o) => (
        <li key={o.id} className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3">
          <Link href={`/sales/offers/${o.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5 no-underline">
            <span className="font-medium text-ink">
              <bdi dir="ltr">{o.snap?.unit.label ?? "—"}</bdi> · {o.snap?.project.nameAr ?? ""}
            </span>
            <span className="text-xs text-muted">
              {showOwner && <>{o.salesAccount.nameAr} · </>}
              {o.clientName} · {formatDateAr(o.createdAt)}
              {Number(o.discountPct) > 0 && <> · خصم {Number(o.discountPct)}%</>}
            </span>
          </Link>
          {o.snap && <span className="text-sm tabular-nums">{formatMoney(o.snap.price, "ar", o.snap.currency)}</span>}
          <OfferStateBadge state={o.state} />
          {decide && (
            <span className="flex gap-2">
              <ApproveOfferButton offerId={o.id} />
              <CancelOfferButton offerId={o.id} reject />
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 2: The page**

```tsx
// src/app/sales/offers/page.tsx
import type { Metadata } from "next";
import { Panel } from "@/components/admin/fields";
import { OfferList } from "@/components/sales/offer-list";
import { SalesShell } from "@/components/sales/sales-shell";
import { formatCountAr } from "@/lib/format";
import { myOffers, pendingApprovals } from "@/lib/sales/offer-service";
import { requireSales } from "@/lib/sales/session";

export const metadata: Metadata = { title: "عروضي" };

// My offers with their state now; a team lead also gets the team's offers waiting for approval
// (the full team page comes in phase 4).
export default async function SalesOffersPage() {
  const me = await requireSales();
  const actor = { id: me.id, role: me.role, developerId: me.developer.id };
  const [mine, pending] = await Promise.all([myOffers(actor), pendingApprovals(actor)]);
  return (
    <SalesShell me={me} title="عروضي">
      {me.role === "LEAD" && (
        <Panel title={`مستنية موافقتك (${formatCountAr(pending.length)})`}>
          {pending.length ? <OfferList offers={pending} decide showOwner /> : <p className="m-0 text-sm text-muted">مفيش عروض مستنية موافقة.</p>}
        </Panel>
      )}
      <Panel title="عروضي">
        {mine.length ? <OfferList offers={mine} /> : <p className="m-0 text-sm text-muted">لسه ماعملتش عروض. افتح وحدة من المخزون واضغط «عرض سعر».</p>}
      </Panel>
    </SalesShell>
  );
}
```

- [ ] **Step 3: Menu and «ملفي»**

`src/components/sales/sales-nav.tsx`, `LINKS`, after «حجوزاتي»: `{ href: "/sales/offers", label: "عروضي", also: "/sales/offers/" },`.

`src/app/sales/me/page.tsx`: load `offerCounts(actor)` and `myOffers(actor, new Date(), 5)` and add, before «بياناتك على العروض»:

```tsx
      <Panel title="عروضي">
        <p className="mb-4 text-sm">
          طلّعت {countAr(counts.total, OFFERS_NOUN)}، منهم {countAr(counts.recent, OFFERS_NOUN)} في آخر ٣٠ يوم.
        </p>
        {recent.length > 0 && <OfferList offers={recent} />}
        <Link href="/sales/offers" className="admin-btn-ghost mt-4">
          كل عروضي
        </Link>
      </Panel>
```

(Only issued offers count; offers waiting for approval or cancelled before going out don't.)

- [ ] **Step 4: Check, look, commit**

Run: `npx tsc --noEmit && npm run lint` — clean.
On `next dev`: the menu marks «عروضي» on the list and on an offer; a lead sees «مستنية موافقتك» and approves from the list; an agent never sees that panel; «ملفي» counts match the database. 360 px and 1280 px, light and dark.

```bash
git add src/app/sales/offers/page.tsx src/components/sales/offer-list.tsx src/components/sales/sales-nav.tsx src/app/sales/me/page.tsx
git commit -m "Sales: «عروضي» with each offer's state, approvals for team leads, offer counts on «ملفي»"
```

---

### Task 24: Docs

**Files:**
- Modify: `README.md`, `docs/ROADMAP.md`

- [ ] **Step 1: README**

In the pages table, add:

```markdown
| `/sales/units/[id]/offer` | Sales: a new price offer for one unit (client, plan, language, validity, optional discount within the role's limit) |
| `/sales/offers` | Sales: my offers with their state now (valid, waiting for approval, expired, price changed, unit taken, cancelled); team leads approve or reject discounts above an agent's limit |
| `/sales/offers/[id]` | Sales: one offer, its approval, and sharing by WhatsApp, Telegram, email or the phone's share sheet |
| `/o/[token]` | A client's price offer: landscape sheets (cover, project, master plan with the unit's zone, unit, schedule installment by installment, contact) in Arabic or English, printable; never indexed |
```

Add to the `/portal/team` row: `; how long offers stay valid and the discount each role may give`. Add to the admin and portal project rows: `the project's currency (pounds or dollars) and custom payment schedules`.

In "How the code is organised", add:

```markdown
- `src/lib/catalog/plan-steps.ts`, `src/lib/catalog/schedule.ts` — custom payment schedules: the notation typed in the admin, the portal and Excel (`0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100`), and the installment-by-installment math (whole pounds, the last installment takes the rounding). A stepped plan's down payment and years are derived from its steps when saved.
- `src/lib/sales/offers.ts`, `src/lib/sales/offer-service.ts`, `src/lib/sales/offer-pdf.ts` — price offers. Rules are pure (tested); an offer stores a snapshot of every figure at issue; "price changed" compares a plan fingerprint, since portal approvals recreate plans. PDFs are `/o/[token]` printed by headless Chromium (`OFFER_PDF=on`; `CHROME_PATH` locally) and kept in Vercel Blob; with it off, sharing sends the link and the page prints itself.
- Money: `formatMoney` / `formatMillions` take the project's currency; comparisons across projects (area figures, price filters and sort, "best" marks) use pound projects only.
```

- [ ] **Step 2: Roadmap**

Mark the phase-3 line done, in the style of the phase-2 line:

```markdown
- [x] AqarArena Sales, step 3: project currency (pounds or dollars), custom payment schedules (admin, portal, Excel), units on master-plan zones, offer settings per developer, price offers with discount approval, the client's offer page /o/[token] with PDF, sharing by WhatsApp, Telegram, email and the phone
```

and change the phase-2 follow-up `- [ ] Mark a unit's zone on the master plan …` to `- [ ] Floor plans per unit type (uploads are per project today)`.

- [ ] **Step 3: Commit**

```bash
git add README.md docs/ROADMAP.md
git commit -m "Docs: currency, payment schedules and AqarArena Sales price offers"
```

---

### Task 25: Full check and hand-off

- [ ] **Step 1: Automated checks**

Run: `npm run lint && npm test && npm run build`
Expected: lint clean; all tests pass; the build lists `/o/[token]`, `/sales/offers`, `/sales/offers/[id]`, `/sales/offers/[id]/pdf`, `/sales/units/[id]/offer`, and no `/api/pdf-check`.

- [ ] **Step 2: Test data (scratchpad, not committed)**

A scratch script (`node --conditions=react-server --env-file=.env --import tsx <file>`) that, with `hashPassword` from `src/lib/portal/password.ts`, prepares on the throwaway database:
- developer X (the seeded one with the most available units) with limits 2% / 5% and validity 7; developer Y with another published project;
- portal accounts for X and Y; sales accounts `x-agent1`, `x-agent2` (AGENT), `x-lead` (LEAD) for X, `y-agent` for Y, all `mustChangePassword: false`;
- one of X's projects in dollars; one plan of X with the sample schedule `0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100` and 10% maintenance; one unit priced 27,454,000 on it with a zone;
- the passwords in a scratchpad JSON file, never in chat.

- [ ] **Step 3: Browser checks on `next start` with headless Chrome over CDP**

The app's Browser pane doesn't hydrate when hidden, so drive Chrome directly. Build with the worktree `.env`, start `npm run start -- -p 3001` in the background (`NEXT_PUBLIC_SITE_URL=http://localhost:3001` so offer links point here), and reuse the CDP driver `cdp.mjs` from `docs/superpowers/plans/2026-11-16-phase-2-sales-search-and-holds.md` (Task 17, Step 4), adding one helper:

```js
/** Prints the current page to PDF through Chrome itself (the same engine the server uses). */
export const printPdf = async (send, file) => {
  const r = await send("Page.printToPDF", { printBackground: true, preferCSSPageSize: true });
  fs.writeFileSync(file, Buffer.from(r.result.data, "base64"));
};
```

(expose `send` from `browser()` for it). Check each scenario; note the result of each:

1. **Currency:** the dollar project shows «… دولار» / «USD …» on its card, page, calculator and compare column; comparing it with a pound project marks no "best" price; the area page's figures don't change when it is switched to dollars; `/ar/projects?max=5000000` doesn't list it. In Sales the budget has «بالجنيه / بالدولار» and a dollar budget lists only its units. Admin, portal draft (through review) and Excel each change the currency.
2. **Schedules:** the admin form shows «جدول مخصص» and derived 5% / 8 years for the sample plan; a portal draft with a schedule is reviewed and approved; the Excel round trip keeps it; wrong sums are refused with their message in all three.
3. **Zones:** set in the admin, the portal (immediately, and a zone of another project refused) and both Excel imports; the Sales unit page and the offer's master-plan sheet box it at the same spot; the public master plan's zones sit at the same place in Arabic and English.
4. **Settings:** portal «عروض الأسعار» refuses 0 / 31 days, 21%, 1.255% and agent > lead; saves 7 / 2 / 5.
5. **Offers:** `x-agent1` makes an Arabic offer for the sample unit with no discount → share screen; its schedule shows down 1,372,700, installments 797,052, the last 797,040, maintenance 915,133 / 915,133 / 915,134 on the 3rd, 7th and 11th installments, «33 شيك للوحدة · 3 شيك صيانة · 36 شيك في المجموع», and dates from the issue date; the calculator on the unit page gives the same down payment. With 3% → «مستني موافقة», `/o/<token>` is not found; `x-agent2` can't open it; `x-lead` approves from «مستنية موافقتك» and it opens, dated today. 6% is refused. `x-agent2` holds a unit → `x-agent1` can't make an offer on it; on his own held unit he can. A sold unit has no «عرض سعر».
6. **States:** raise the unit's price in the portal → «السعر اتغيّر» (the client's page has no banner); approve a portal draft that changes the plan → «السعر اتغيّر»; set `validUntil` in the past (move `issuedAt` back too, e.g. both by 30 days: the `SalesOffer_validity` CHECK needs `validUntil > issuedAt`) → «انتهت صلاحيته» and the client's banner; mark the unit sold → «الوحدة اتباعت أو اتحجزت» and the banner; cancel → «اتلغى» and the banner.
7. **Sharing:** WhatsApp opens `https://wa.me/20…?text=…` with the four lines and the link (read the `href`, don't follow it); Telegram `t.me/share/url?url=…&text=…`; both add to «اتبعت على»; email without `RESEND_API_KEY` answers that it wasn't sent; the 21st email in an hour is refused (call the action 21 times from a scratch script with a fake sender if needed). No real email is sent unless the user gives a test key and address.
8. **Permissions:** `y-agent` gets the not-found page for X's offer, 404 from its PDF route, and «العرض ده مش موجود» from cancel/approve posted by hand; an agent can't approve; an agent doesn't see a colleague's offer.
9. **The client's page and PDF:** `/o/<token>` in Arabic and English at 360 px and 1280 px; `Page.printToPDF` gives one landscape page per sheet (each page about 841.9 × 526.2 pt), nothing cut, Arabic shaped and right to left, figures equal to step 5. With `OFFER_PDF=on` and `CHROME_PATH` (and a test Blob store only if the user gives one), `/sales/offers/<id>/pdf` downloads the same PDF and a second request reuses it. `curl -sI` shows `X-Robots-Tag: noindex, nofollow`, `/robots.txt` disallows `/o/`, and `/o/x` is not redirected to `/ar`.
10. **Lists and profile:** «عروضي» shows each state; «ملفي» counts issued offers (total and last 30 days) and lists the last five; the menu marks «عروضي».
11. **Layout:** every new Sales screen at 360 px and 1280 px, light and dark: no horizontal page scroll, tap targets at least 44 px.

Fix anything that fails, re-run `npm run lint && npm test && npm run build`, and commit the fixes task by task.

- [ ] **Step 4: Code review**

Run the `code-review` skill on the branch diff against `main` and fix what it confirms.

- [ ] **Step 5: Hand-off**

Report what was built and checked, with any scenario that needed a fix, and the open item from Task 1 (the Vercel preview check of server PDFs, which needs a push). Do **not** clean up: leave the `aqararena-p3-test` database, the worktree `.env`, the `next start` server and the scratchpad files, and list them for the controller. Pushing and opening the PR (base: `main`) happens when the user asks. On Vercel, `OFFER_PDF` stays unset until the preview check passes.
