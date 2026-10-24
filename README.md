# AqarArena

دليل لعرض مشروعات المطورين العقاريين في مصر ومقارنتها: الماستر بلان، خطط الأسعار، أنواع الوحدات، صور المشروع، وأرقام المطور الرسمية. المنصة للعرض فقط: لا بيع ولا إيجار ولا وساطة، والتواصل مع المطور مباشرة.

A showcase of every real-estate developer project in Egypt: master plans, price plans, unit types, project photos and official developer phone numbers, plus project-vs-project comparison. Arabic (RTL, default) and English. Free for visitors; revenue comes from developer subscriptions and featured listings.

## Status

The public site is built from the [approved design](https://claude.ai/artifact/XPigMkPtbo1h3d6ezkWV3s) and reads from **PostgreSQL** through Prisma. The database currently holds the demo developers and projects (placeholder names and numbers) until real data is entered. Without a database the site falls back to the same demo data. See:

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
cp .env.example .env # local database settings (see the file for hosted Postgres)
npm run db:local     # start the local database in the background
npm run db:migrate   # create the tables
npm run db:seed      # load the demo developers and projects
npm run dev          # http://localhost:3000 → redirects to /ar
```

Skip the three `db:` steps (and leave `DATABASE_URL` out of `.env`) to run on the built-in demo data only.

**About the local database:** `npm run db:local` starts Prisma's built-in Postgres (`prisma dev`). It takes one connection at a time, so `.env` sets `DATABASE_POOL_MAX=1` and builds then render pages one by one. If it stops answering, run `npx prisma dev stop aqararena`, wait a few seconds, and run `npm run db:local` again. Its data stays on disk.

**For the live site:** create a Postgres database on Supabase or Neon, put its connection string in `DATABASE_URL` (in `.env` locally and in the hosting provider's settings), and run `npx prisma migrate deploy`.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run lint` / `npm run typecheck` | Checks |
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
- `src/components/` — header, footer, project card, tabs, master plan, contact lists, comparison (`compare/`: saved list in localStorage, bottom bar, column pickers).
- `src/app/globals.css` — design tokens (colors, fonts) from the approved design.
- `prisma/schema.prisma` — database schema. The generated client goes to `src/generated/` (not committed).

## Stack

| Layer | Choice |
| --- | --- |
| Web app | Next.js 16 (App Router, Cache Components), TypeScript, Tailwind CSS 4 |
| Type | Alexandria (headings) + IBM Plex Sans Arabic (text), via `next/font` |
| Database | PostgreSQL (managed: Supabase or Neon; local: `prisma dev`), Prisma 7. PostGIS arrives with map search. |
| Media | Cloudflare R2 + CDN, images converted to WebP/AVIF, tiled master plans |
| Mobile (later) | React Native (Expo), same data |
| Hosting | Vercel |
