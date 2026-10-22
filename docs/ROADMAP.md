# Roadmap

The goal of each phase is something real users can open. Build the buyer side first with data we enter ourselves; open the developer portal once the site shows value.

## Phase 0: Foundations (week 1)

- [ ] Next.js + TypeScript + Tailwind project, Arabic RTL by default, English toggle
- [ ] PostgreSQL database (Supabase or Neon) with Prisma schema from [DATA-MODEL.md](DATA-MODEL.md)
- [ ] Seed script with 10–20 real developers and their projects, entered by hand
- [ ] Deploy preview on Vercel on every push

## Phase 1: MVP for buyers (weeks 2–6)

- [ ] Home page: smart search (area, property type, down payment, monthly installment, developer)
- [ ] Developer page: profile, portfolio, direct contacts
- [ ] Project page: gallery, key facts, unit typologies with floor plans, payment plans
- [ ] Search results with filters and sorting
- [ ] Side-by-side comparison (up to 4 units), shareable link
- [ ] Reverse payment calculator: "I have X down payment and can pay Y monthly"
- [ ] SEO: server-rendered pages, sitemap, Arabic slugs

## Phase 2: Developer portal and revenue (weeks 7–12)

- [ ] Developer accounts and roles
- [ ] Self-service editing of projects, typologies, prices and offers
- [ ] Bulk upload from Excel/CSV templates
- [ ] "Request info" leads sent to the developer's sales team
- [ ] Subscription tiers (Basic / Pro / Enterprise) and featured listings

## Phase 3: Differentiators

- [ ] Interactive master plan (building → floor → unit)
- [ ] Map search (PostGIS)
- [ ] Price history and ROI / rental yield estimates
- [ ] Construction progress timeline
- [ ] AI advisor (natural-language search + comparison)
- [ ] PDF export of comparisons
- [ ] Mobile apps (Expo)
- [ ] CRM / API sync for large developers
