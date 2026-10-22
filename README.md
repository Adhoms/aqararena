# AqarArena

منصة دليل ومقارنة عقارية لكل المطورين والمشروعات في مصر (سكني، تجاري، إداري، طبي، ساحلي).
المستخدم يبحث ويقارن ويتواصل مع المطور مباشرة. المنصة لا تبيع ولا تحصّل أي مبالغ.

A neutral discovery and comparison platform for every real-estate developer and project in Egypt. Free for buyers; revenue comes from developer subscriptions, featured listings and qualified leads.

## Status

Planning. No application code yet. See:

- [docs/ROADMAP.md](docs/ROADMAP.md): build phases, starting with the MVP
- [docs/DATA-MODEL.md](docs/DATA-MODEL.md): first draft of the database model

## Planned stack

| Layer | Choice |
| --- | --- |
| Web app | Next.js (App Router, TypeScript), Tailwind CSS, Arabic RTL + English |
| Database | PostgreSQL + PostGIS (managed: Supabase or Neon) |
| ORM | Prisma |
| Search | Postgres full-text first; Meilisearch when listings grow |
| Media | Cloudflare R2 + CDN, images converted to WebP/AVIF |
| Mobile (later) | React Native (Expo), same API |
| Hosting | Vercel (web) |
