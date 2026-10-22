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
    url: process.env["DATABASE_URL"],
    // Only needed where Prisma can't create its own throwaway database (e.g. `prisma dev`).
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
