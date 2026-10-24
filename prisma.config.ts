import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // `npm run db:seed` and `prisma migrate reset` fill the database with the demo data.
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Migrations need a direct connection. On Neon/Supabase DATABASE_URL is the pooled one
    // (used by the site), so DIRECT_URL is set too; locally DATABASE_URL is enough.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
    // Only needed where Prisma can't create its own throwaway database (e.g. `prisma dev`).
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
