# AqarArena

دليل لعرض مشروعات المطورين العقاريين في مصر ومقارنتها: الماستر بلان، خطط الأسعار، أنواع الوحدات، صور المشروع، وأرقام المطور الرسمية. المنصة للعرض فقط: لا بيع ولا إيجار ولا وساطة، والتواصل مع المطور مباشرة.

A showcase of every real-estate developer project in Egypt: master plans, price plans, unit types, project photos and official developer phone numbers, plus project-vs-project comparison. Arabic (RTL, default) and English. Free for visitors; revenue comes from developer subscriptions and featured listings.

## Status

Live at **https://aqararena.com** (Vercel + Neon). The public site is built from the [approved design](https://claude.ai/artifact/XPigMkPtbo1h3d6ezkWV3s) and reads from **PostgreSQL** through Prisma. The database currently holds the demo developers and projects (placeholder names and numbers) until real data is entered. Without a database the site falls back to the same demo data. See:

- [docs/ROADMAP.md](docs/ROADMAP.md): build phases and what's out of scope
- [docs/DATA-MODEL.md](docs/DATA-MODEL.md): the database model in plain words
- [prisma/schema.prisma](prisma/schema.prisma): the database model as code

## Pages

| URL | Page |
| --- | --- |
| `/ar`, `/en` | Home: search, featured projects, areas, comparison teaser, developers |
| `/ar/projects` | All projects with filters (type, area, developer, status, delivery, down payment, installment years) and sorting |
| `/ar/projects/[slug]` | Project: gallery, overview, interactive master plan, unit types, price plans, photos, location, developer contacts |
| `/ar/compare?p=a,b,c` | Project-vs-project comparison (up to 4), "differences only", share link (copy / system share), print / PDF |
| `/ar/developers`, `/ar/developers/[slug]` | Developer directory and profile with portfolio by area |
| `/ar/dev` | Developers' landing page: the portal and AqarArena Sales (`/ar/for-developers` redirects here) |
| `/portal` | Developer portal (Arabic): sign in, request an account, edit company and projects, send for review (including the project's currency, pounds or dollars, and custom payment schedules); per-project visitor statistics |
| `/portal/projects/[id]/units` | Developer inventory: unit statuses and prices, live at once (no review) for the sales team (AqarArena Sales), with Excel download / upload; not shown on the public site; shows who holds a unit in AqarArena Sales and sets the project's hold length; each unit's zone on the master plan (live at once, only this project's zones). Changing a held unit's status (one by one or by Excel) asks first and releases the hold |
| `/portal/team` | Developer portal: the company's sales team (accounts, roles, temporary passwords; the names and phones shown on offers), how long a temporary hold lasts (1 to 168 hours); how long offers stay valid (1 to 30 days) and the discount each role may give (agent up to the lead's limit, lead up to 20%) |
| `/sales` | AqarArena Sales (Arabic): a developer's salespeople sign in with their own accounts. Inventory search across the company's published projects (project, model, type, bedrooms, floor, view, status including temporarily held, and a budget as total price, down payment or monthly installment); filters live in the address so a search can be shared |
| `/sales/units/[id]` | Sales: one unit with its details, floor plans, the master plan with the unit's zone boxed, payment calculator on every active plan (custom schedules installment by installment), the temporary hold (hold with a note, confirm to reserve, cancel) and «عرض سعر» (only on an available unit or one the salesperson holds) |
| `/sales/units/[id]/offer` | Sales: a new price offer for one unit (client, plan, language, validity, optional discount within the role's limit; above the agent's limit it waits for a team lead) |
| `/sales/offers` | Sales («عروضي»): my offers with their state now (valid, waiting for approval, expired, price changed, unit taken, cancelled); team leads see the team's and approve or reject discounts above an agent's limit («مستنية موافقتك») |
| `/sales/offers/[id]` | Sales: one offer, its approval, cancelling, and sharing by WhatsApp, Telegram, email or the phone's share sheet (each channel used is recorded) |
| `/sales/offers/[id]/pdf` | Sales: the offer's PDF (made on the server only with `OFFER_PDF=on` and Vercel Blob; otherwise, or for an offer that no longer holds, a redirect to the client's page) |
| `/o/[token]` | A client's price offer: landscape sheets (cover, project, master plan with the unit's zone, unit, schedule installment by installment, contact) in Arabic or English, printable; a banner once it is expired, re-priced, taken or cancelled (and no PDF link); never indexed, and a link that never went out (pending or rejected) never opens |
| `/sales/holds` | Sales («حجوزاتي»): my live holds and the last 30 days; team leads also see and can cancel the team's holds |
| `/sales/me` | Sales («ملفي»): profile and password, offers issued (total and last 30 days) and the last five |
| `/admin/stats` | Visitor statistics for every published project (last 30 days against the 30 before) |
| `/admin` | Admin: data entry, Excel import, review of developer changes, developer accounts; a project's currency (pounds or dollars), custom payment schedules and each unit's master-plan zone (forms and Excel). The units list shows a Sales hold badge; an admin status change (form or Excel import) releases the hold |

## Getting started

Requires Node.js 20 or newer.

```bash
npm install          # also generates the Prisma client
cp .env.example .env # local database settings (see the file for hosted Postgres)
npm run db:local     # start the local database in the background
npm run db:migrate   # create the tables
npm run db:seed      # load the demo developers and projects
npm run dev          # http://localhost:3000 → redirects to /ar
```

Skip the three `db:` steps (and leave `DATABASE_URL` out of `.env`) to run on the built-in demo data only.

**About the local database:** `npm run db:local` starts Prisma's built-in Postgres (`prisma dev`). It takes one connection at a time, so `.env` sets `DATABASE_POOL_MAX=1` and builds then render pages one by one. If it stops answering, run `npx prisma dev stop aqararena`, wait a few seconds, and run `npm run db:local` again. Its data stays on disk.

**For the live site:** follow [docs/DEPLOY.md](docs/DEPLOY.md) (Vercel + Neon, step by step in Arabic). On Vercel the `vercel-build` script applies migrations before building.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` / `npm run typecheck` | Checks |
| `npm test` | Unit tests (payment sums and schedules, price history, Sales holds, search and offers; Node's test runner, files named `*.test.ts`) |
| `npm run db:local` | Start the local development database |
| `npm run db:migrate` | Create/apply database migrations (needs `DATABASE_URL`) |
| `npm run db:seed` | Replace all developers and projects with the demo data (local databases only, unless `ALLOW_DEMO_SEED=1`) |
| `npm run db:reset` | Drop everything, re-apply migrations and seed |
| `npm run db:studio` | Browse the database in Prisma Studio |

## How the code is organised

- `src/app/[lang]/` — every page lives under `/ar` or `/en`; `src/proxy.ts` redirects `/` to the visitor's last language (Arabic by default).
- `src/app/[lang]/dictionaries/` — all UI text. `ar.json` is the source of truth; `en.json` must have the same keys (TypeScript enforces this).
- `src/lib/catalog/` — **the only place pages get data from.** `index.ts` exposes `getProject`, `searchProjects`, `summarize`, …; they query the database (`db-source.ts`, which turns rows into plain objects) or, without `DATABASE_URL`, serve `sample-data.ts`. Results are cached for an hour under the `catalog` tag: call `revalidateTag("catalog")` after changing data.
- `prisma/seed.ts` — loads the demo data into the database. `prisma/migrations/` — the database history; commit every new migration.
- `src/lib/property.ts` — lists that mirror the schema enums (categories, unit types, finishing, statuses, amenities, areas).
- `src/lib/catalog/payment.ts` — what a buyer pays on a plan. The calculator and the Sales offers read it, so they always agree.
- `src/lib/catalog/plan-steps.ts`, `src/lib/catalog/schedule.ts` — custom payment schedules: the notation typed in the admin, the portal and Excel (`0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100`: month offsets, ranges every N months, and percentages that must add up), and the installment-by-installment math (whole pounds, the last installment takes the rounding). A stepped plan's down payment and years are derived from its steps when saved; the public calculator, the Sales calculator and the offer show the same first payment.
- Money: `formatMoney` / `formatMillions` in `src/lib/format.ts` take the project's currency (`Project.currency`, EGP or USD). Comparisons across projects (area figures, price filters and sort, "best" marks in the comparison, the Sales budget) use pound projects only, or the chosen currency.
- `src/lib/stats.ts`, `src/lib/stats-events.ts`, `src/components/stats/tracker.tsx` — visitor statistics: an element with `data-track="EVENT:slug"` counts when clicked (once per browser session), `<TrackView>` counts a page view. Only daily totals per project are stored.
- `src/app/portal/unit-actions.ts` — the one place a developer's change goes live without review (units), with its limits: approved unit types only, no unit priced under its type's starting price, the admin emailed at most hourly per project.
- `src/lib/sales/holds.ts`, `src/lib/sales/hold-service.ts` — AqarArena Sales temporary holds. The rules are pure functions (tested); every write is one transaction that locks the unit row with a 3-second `lock_timeout` (a busy unit answers with a "try again" message instead of waiting). One active hold per unit is guaranteed by the partial unique index `UnitHold_unitId_active_key`, written by hand in the `sales_holds` migration, and hold lengths by the CHECK constraints (1 to 168 hours) in `hold_hours_range` (Prisma's schema can describe neither): never drop them. Any new code that changes a unit's status must call `releaseHoldsOfUnavailable` in the same transaction (the portal, the admin and both Excel imports already do).
- `scripts/hold-race.ts` — fires two simultaneous holds on one unit and checks only one wins (`node --conditions=react-server --env-file=.env --import tsx scripts/hold-race.ts`). The local `prisma dev` database (PGlite) runs one transaction at a time, so a local pass doesn't prove the locking: run it once against a real PostgreSQL (a Neon branch) before release.
- `src/lib/sales/budget.ts`, `src/lib/sales/search.ts`, `src/lib/sales/inventory.ts` — the Sales search: budget math on `catalog/payment.ts`, filters in the URL, and the developer-scoped queries (another developer's project id in the address is ignored).
- `src/lib/sales/offers.ts`, `src/lib/sales/offer-service.ts`, `src/lib/sales/offer-snapshot.ts` — price offers. The rules are pure (tested): discount limits per role, states, who may see, approve, cancel or share. An offer stores a snapshot of every figure at issue (approval re-issues it from that day); "price changed" compares a plan fingerprint, since portal approvals recreate plans. A pending offer that is rejected or cancelled gets a new token, so its link never opens. Cancelling also clears and deletes the stored PDF.
- `src/lib/sales/pdf.ts`, `src/lib/sales/offer-pdf.ts` — offer PDFs: `/o/[token]` printed by headless Chromium (`@sparticuz/chromium` on Vercel, `CHROME_PATH` locally), one at a time, stored once in Vercel Blob under a random name and reused. Off unless `OFFER_PDF=on` and `BLOB_READ_WRITE_TOKEN` are set; then sharing sends the link and the client's page prints itself («طباعة / حفظ PDF»).
- `src/lib/sales/share.ts`, `src/app/sales/offer-actions.ts` — sharing: WhatsApp (`wa.me`) and Telegram links with the offer's text and link, the phone's share sheet with the PDF, and email to the client through Resend (`src/lib/email.ts`; needs `RESEND_API_KEY`; at most 20 an hour per salesperson; replies go to the salesperson).
- `src/app/o/[token]/` — the client's offer page, with its own root layout (the offer's language on `<html>`). `src/proxy.ts` keeps `/o/` out of the language redirect and answers malformed `/o` paths with a real 404; `next.config.ts` sends `X-Robots-Tag: noindex, nofollow` on `/o/*` and `robots.txt` disallows `/o/`.
- `src/lib/price-history.ts` — records the price per m² whenever a price changes (admin forms, Excel import, approved developer edits). Call `recordPriceHistory` from any new code that writes prices.
- `src/components/` — header, footer, project card, tabs, master plan, contact lists, comparison (`compare/`: saved list in localStorage, bottom bar, column pickers).
- `src/app/globals.css` — design tokens (colors, fonts) from the approved design.
- `prisma/schema.prisma` — database schema. The generated client goes to `src/generated/` (not committed).

## Stack

| Layer | Choice |
| --- | --- |
| Web app | Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4 |
| Type | Alexandria (headings) + IBM Plex Sans Arabic (text), via `next/font` |
| Database | PostgreSQL (managed: Supabase or Neon; local: `prisma dev`), Prisma 7. PostGIS arrives with map search. |
| Media | Vercel Blob (uploaded from `/admin`; photos resized to WebP in the browser) |
| Mobile (later) | React Native (Expo), same data |
| Hosting | Vercel |
