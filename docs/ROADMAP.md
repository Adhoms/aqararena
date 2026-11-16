# Roadmap

AqarArena is a showcase: every developer project in Egypt with its master plan, price plans, unit types, photos and the developer's official phone numbers, plus project-vs-project comparison. We don't sell, rent, broker, take payments or collect buyer leads.

The goal of each phase is something real users can open.

## Phase 0: Foundations

- [x] Next.js + TypeScript + Tailwind project, Arabic RTL by default, English toggle
- [x] Prisma schema from [DATA-MODEL.md](DATA-MODEL.md)
- [x] Approved visual design: [design canvas](https://claude.ai/artifact/XPigMkPtbo1h3d6ezkWV3s) (palette, type, page layouts)
- [x] PostgreSQL schema and first migration; local development database (`prisma dev`) with demo seed
- [x] Hosted PostgreSQL (Neon) for the live site, migrations applied with `prisma migrate deploy`
- [ ] Seed script with 10–20 real developers and their projects, entered by hand
- [x] Deploy on Vercel on every push (preview per pull request)
- [x] Own domain: https://aqararena.com (www redirects to it)

## Phase 1: Public site (MVP)

- [x] Home page: search by project, developer, area and project type; featured projects; areas; developers
- [x] Projects page with filters (type, area, developer, status, delivery year, down payment, installment years) and sorting
- [x] Project page: gallery, overview, interactive master plan (zones), unit types with floor plans, price plans, photos by tab, location, official developer contacts
- [x] Developer page: profile, official contacts, portfolio filtered by area
- [x] Project-vs-project comparison (up to 4), shareable link, "differences only", print / PDF
- [x] Unit-by-unit availability (entered in the admin or the portal, or imported from the Excel "units" sheet). Moved off the public site; it will show in AqarArena Sales
- [x] Printable offer sheet and WhatsApp sharing: built, then taken off the public site; they move to AqarArena Sales (PDF offers sent by WhatsApp, Telegram or email)
- [x] Pages read from the database through `src/lib/catalog` (cached, demo-data fallback without a database)
- [x] Photo, floor plan, master plan and brochure uploads from the admin to Vercel Blob (photos resized to WebP in the browser)
- [ ] Tiled deep-zoom master plans
- [ ] SEO: sitemap, Open Graph images, structured data (JSON-LD)

## Phase 2: Developer portal and revenue

- [x] Developer accounts: request from `/dev` or created by the admin, username + password, temporary passwords
- [x] Developer portal (`/portal`): developers edit their company profile and projects (unit types, payment plans, photos, distances); every change waits for admin approval with a before/after review
- [ ] Master-plan zones in the developer portal (admin only for now)
- [x] Units in the developer portal: statuses and prices go live at once within limits (approved unit types, price not under the type's starting price), Excel download / upload, admin emailed at most hourly. Renaming a unit type's code keeps its units; the review page warns when a removal would delete units.
- [x] Visitor statistics per project (views, favorites, comparisons, contact clicks, brochure, price-alert subscribers) for developers in the portal and for the admin, daily totals only
- [x] Bulk import from an Excel template (developers, projects, unit types, payment plans), with a check step
- [ ] Subscription tiers (Basic / Pro / Enterprise) and featured listings

## Phase 3: Later

- [ ] Map search (add the PostGIS extension and a location column in its own migration)
- [ ] Polygon master-plan zones and deep zoom
- [x] Price history per project (average price per m² at each change). Still recorded; the chart is off the public site and comes back in Sales
- [ ] Mobile apps (Expo), same API

## Out of scope (by decision)

Buying or renting through the site, lead forms ("register interest", "book a visit"), payment handling, the reverse payment calculator and the AI advisor.
