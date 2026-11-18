-- Hold length in hours, 1 to 168 (src/lib/sales/holds.ts HOLD_HOURS_MIN/MAX), enforced by the database too.
-- Prisma's schema can't describe CHECK constraints and ignores them when diffing, so `prisma migrate dev`
-- won't drop them. A NULL Project.holdHours (use the developer's) passes.
ALTER TABLE "Developer" ADD CONSTRAINT "Developer_holdHours_range" CHECK ("holdHours" BETWEEN 1 AND 168);
ALTER TABLE "Project" ADD CONSTRAINT "Project_holdHours_range" CHECK ("holdHours" BETWEEN 1 AND 168);
