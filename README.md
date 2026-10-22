# AqarArena

دليل لعرض مشروعات المطورين العقاريين في مصر ومقارنتها: الماستر بلان، خطط الأسعار، أنواع الوحدات، صور المشروع، وأرقام المطور الرسمية. المنصة للعرض فقط: لا بيع ولا إيجار ولا وساطة، والتواصل مع المطور مباشرة.

A showcase of every real-estate developer project in Egypt: master plans, price plans, unit types, project photos and official developer phone numbers, plus project-vs-project comparison. Arabic (RTL, default) and English. Free for visitors; revenue comes from developer subscriptions and featured listings.

## Status

The public site is built from the [approved design](https://claude.ai/artifact/XPigMkPtbo1h3d6ezkWV3s) and runs on **demo data** (`src/lib/catalog/sample-data.ts`). No database is connected yet. See:

- [docs/ROADMAP.md](docs/ROADMAP.md): build phases and what's out of scope
- [docs/DATA-MODEL.md](docs/DATA-MODEL.md): the database model in plain words
- [prisma/schema.prisma](prisma/schema.prisma): the database model as code

## Pages

| URL | Page |
| --- | --- |
| `/ar`, `/en` | Home: search, featured projects, areas, comparison teaser, developers |
| `/ar/projects` | All projects with filters (type, area, developer, status, delivery, down payment, installment years) and sorting |
| `/ar/projects/[slug]` | Project: gallery, overview, interactive master plan, unit types, price plans, photos, location, developer contacts |
| `/ar/compare?p=a,b,c` | Project-vs-project comparison (up to 4), "differences only", share link, print / PDF |
| `/ar/developers`, `/ar/developers/[slug]` | Developer directory and profile with portfolio by area |

## Getting started

Requires Node.js 20 or newer.

```bash
npm install          # also generates the Prisma client
npm run dev          # http://localhost:3000 → redirects to /ar
```

`DATABASE_URL` in `.env` (copy `.env.example`) is only needed for database commands.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` / `npm run typecheck` | Checks |
| `npm run db:migrate` | Create/apply database migrations (needs `DATABASE_URL`) |
| `npm run db:studio` | Browse the database in Prisma Studio |

## How the code is organised

- `src/app/[lang]/` — every page lives under `/ar` or `/en`; `src/proxy.ts` redirects `/` to the visitor's last language (Arabic by default).
- `src/app/[lang]/dictionaries/` — all UI text. `ar.json` is the source of truth; `en.json` must have the same keys (TypeScript enforces this).
- `src/lib/catalog/` — **the only place pages get data from.** `index.ts` exposes `getProject`, `searchProjects`, `summarize`, … backed by `sample-data.ts` for now. Swap the function bodies for Prisma queries when the database is ready; pages don't change.
- `src/lib/property.ts` — lists that mirror the schema enums (categories, unit types, finishing, statuses, amenities, areas).
- `src/components/` — header, footer, project card, tabs, master plan, contact lists, comparison (`compare/`: saved list in localStorage, bottom bar, column pickers).
- `src/app/globals.css` — design tokens (colors, fonts) from the approved design.
- `prisma/schema.prisma` — database schema. The generated client goes to `src/generated/` (not committed).

## Stack

| Layer | Choice |
| --- | --- |
| Web app | Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4 |
| Type | Alexandria (headings) + IBM Plex Sans Arabic (text), via `next/font` |
| Database | PostgreSQL + PostGIS (managed: Supabase or Neon), Prisma 7 |
| Media | Cloudflare R2 + CDN, images converted to WebP/AVIF, tiled master plans |
| Mobile (later) | React Native (Expo), same data |
| Hosting | Vercel |
