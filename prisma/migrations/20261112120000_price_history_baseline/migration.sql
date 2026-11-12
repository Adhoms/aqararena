-- Starting points for the price history. No table changes: this only adds rows.
--
-- The site now records the price per m² every time a price changes, but a change can only be
-- shown against an earlier figure. This stores today's figures for every project that has no
-- history yet, dated when its prices were last confirmed, so the next change has something
-- to be compared with. Running it again adds nothing.

-- One row per priced unit type.
INSERT INTO "PriceHistory" ("id", "projectId", "typologyId", "recordedAt", "pricePerM2")
SELECT 'ph' || md5(random()::text || t."id"),
       t."projectId",
       t."id",
       COALESCE(p."pricesUpdatedAt", CURRENT_DATE),
       ROUND(t."priceFrom" / t."buaM2")
FROM "Typology" t
JOIN "Project" p ON p."id" = t."projectId"
WHERE t."priceFrom" > 0
  AND t."buaM2" > 0
  AND NOT EXISTS (SELECT 1 FROM "PriceHistory" h WHERE h."projectId" = t."projectId");

-- One row per project: the average across its unit types, rounded to 50 like the figure on the site.
INSERT INTO "PriceHistory" ("id", "projectId", "typologyId", "recordedAt", "pricePerM2")
SELECT 'ph' || md5(random()::text || p."id"),
       p."id",
       NULL,
       COALESCE(p."pricesUpdatedAt", CURRENT_DATE),
       ROUND(AVG(t."priceFrom" / t."buaM2") / 50) * 50
FROM "Project" p
JOIN "Typology" t ON t."projectId" = p."id"
WHERE t."priceFrom" > 0
  AND t."buaM2" > 0
  AND NOT EXISTS (SELECT 1 FROM "PriceHistory" h WHERE h."projectId" = p."id" AND h."typologyId" IS NULL)
GROUP BY p."id", p."pricesUpdatedAt";
