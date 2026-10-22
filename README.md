# AqarArena

منصة دليل ومقارنة عقارية لكل المطورين والمشروعات في مصر (سكني، تجاري، إداري، طبي، ساحلي).
المستخدم يبحث ويقارن ويتواصل مع المطور مباشرة. المنصة لا تبيع ولا تحصّل أي مبالغ.

A neutral discovery and comparison platform for every real-estate developer and project in Egypt. Free for buyers; revenue comes from developer subscriptions, featured listings and qualified leads.

## Status

Phase 0 in progress: the Next.js app runs in Arabic (RTL, default) and English, and the Prisma schema is in place. No database is connected yet. See:

- [docs/ROADMAP.md](docs/ROADMAP.md): build phases, starting with the MVP
- [docs/DATA-MODEL.md](docs/DATA-MODEL.md): the database model in plain words
- [prisma/schema.prisma](prisma/schema.prisma): the database model as code

## Getting started

Requires Node.js 20 or newer.

```bash
npm install          # also generates the Prisma client
cp .env.example .env # then set DATABASE_URL (needed only for database commands)
npm run dev          # http://localhost:3000 → redirects to /ar
```

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
- `src/components/` — header, footer, logo, language switcher.
- `src/lib/db.ts` — Prisma client (PostgreSQL via the `pg` driver adapter).
- `prisma/schema.prisma` — database schema. The generated client goes to `src/generated/` (not committed).

## Planned stack

| Layer | Choice |
| --- | --- |
| Web app | Next.js 16 (App Router, TypeScript), Tailwind CSS 4, Arabic RTL + English |
| Database | PostgreSQL + PostGIS (managed: Supabase or Neon) |
| ORM | Prisma 7 |
| Search | Postgres full-text first; Meilisearch when listings grow |
| Media | Cloudflare R2 + CDN, images converted to WebP/AVIF |
| Mobile (later) | React Native (Expo), same API |
| Hosting | Vercel (web) |
