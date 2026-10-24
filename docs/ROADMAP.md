# Roadmap

AqarArena is a showcase: every developer project in Egypt with its master plan, price plans, unit types, photos and the developer's official phone numbers, plus project-vs-project comparison. We don't sell, rent, broker, take payments or collect buyer leads.

The goal of each phase is something real users can open.

## Phase 0: Foundations

- [x] Next.js + TypeScript + Tailwind project, Arabic RTL by default, English toggle
- [x] Prisma schema from [DATA-MODEL.md](DATA-MODEL.md)
- [x] Approved visual design: [design canvas](https://claude.ai/artifact/XPigMkPtbo1h3d6ezkWV3s) (palette, type, page layouts)
- [x] PostgreSQL schema and first migration; local development database (`prisma dev`) with demo seed
- [ ] Hosted PostgreSQL (Supabase or Neon) for the live site, migrations applied with `prisma migrate deploy`
- [ ] Seed script with 10–20 real developers and their projects, entered by hand
- [ ] Deploy preview on Vercel on every push

## Phase 1: Public site (MVP)

- [x] Home page: search by project, developer, area and project type; featured projects; areas; developers
- [x] Projects page with filters (type, area, developer, status, delivery year, down payment, installment years) and sorting
- [x] Project page: gallery, overview, interactive master plan (zones), unit types with floor plans, price plans, photos by tab, location, official developer contacts
- [x] Developer page: profile, official contacts, portfolio filtered by area
- [x] Project-vs-project comparison (up to 4), shareable link, "differences only", print / PDF
- [x] Pages read from the database through `src/lib/catalog` (cached, demo-data fallback without a database)
- [ ] Real photos, floor plans and master plans from Cloudflare R2 (WebP/AVIF, tiled master plans)
- [ ] SEO: sitemap, Open Graph images, structured data (JSON-LD)

## Phase 2: Developer portal and revenue

- [ ] Developer accounts and roles
- [ ] Self-service editing of projects, unit types, price plans, photos and master plans
- [ ] Bulk upload from Excel/CSV templates
- [ ] Subscription tiers (Basic / Pro / Enterprise) and featured listings

## Phase 3: Later

- [ ] Map search (add the PostGIS extension and a location column in its own migration)
- [ ] Polygon master-plan zones and deep zoom
- [ ] Price history per project
- [ ] Mobile apps (Expo), same API

## Out of scope (by decision)

Buying or renting through the site, lead forms ("register interest", "book a visit"), payment handling, the reverse payment calculator and the AI advisor.
