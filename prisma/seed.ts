// Fills the database with the demo developers and projects from src/lib/catalog/sample-data.ts.
// Run with `npm run db:seed` (or automatically after `npx prisma migrate reset`).
//
// It REPLACES all developers, projects and areas. To protect real data it only runs against a
// database on this machine unless ALLOW_DEMO_SEED=1 is set.

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import ar from "../src/app/[lang]/dictionaries/ar.json";
import en from "../src/app/[lang]/dictionaries/en.json";
import { PrismaClient } from "../src/generated/prisma/client";
import { developers, projects } from "../src/lib/catalog/sample-data";

const FEDDAN_M2 = 4200.83;

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
const host = new URL(url).hostname;
if (!["localhost", "127.0.0.1", "::1"].includes(host) && process.env.ALLOW_DEMO_SEED !== "1") {
  throw new Error(
    `Refusing to load demo data into ${host}: it would replace every developer and project there. ` +
      "Set ALLOW_DEMO_SEED=1 if this database is meant to hold the demo data.",
  );
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
const midYear = (year: number) => new Date(Date.UTC(year, 5, 30));

async function main() {
  // Projects (and everything under them) are removed with their developer.
  await db.developer.deleteMany();
  await db.area.deleteMany();

  const areaIds = new Map<string, string>();
  for (const [slug, nameAr] of Object.entries(ar.areas)) {
    const area = await db.area.create({ data: { slug, nameAr, nameEn: en.areas[slug as keyof typeof en.areas] } });
    areaIds.set(slug, area.id);
  }

  const developerIds = new Map<string, string>();
  for (const d of developers) {
    const created = await db.developer.create({
      data: {
        slug: d.slug,
        nameAr: d.name.ar,
        nameEn: d.name.en,
        foundedYear: d.foundedYear,
        aboutAr: d.about.ar,
        aboutEn: d.about.en,
        verified: d.verified,
        hotline: d.contacts.hotline,
        salesPhone: d.contacts.salesPhone,
        whatsapp: d.contacts.whatsapp,
        email: d.contacts.email,
        website: d.contacts.website,
        hqAddressAr: d.contacts.hqAddress?.ar,
        hqAddressEn: d.contacts.hqAddress?.en,
      },
    });
    developerIds.set(d.slug, created.id);
  }

  for (const p of projects) {
    await db.project.create({
      data: {
        slug: p.slug,
        developerId: developerIds.get(p.developerSlug)!,
        areaId: areaIds.get(p.areaSlug)!,
        nameAr: p.name.ar,
        nameEn: p.name.en,
        descriptionAr: p.description.ar,
        descriptionEn: p.description.en,
        districtAr: p.district.ar,
        districtEn: p.district.en,
        categories: p.categories,
        landAreaM2: p.landFeddan ? Math.round(p.landFeddan * FEDDAN_M2) : undefined,
        footprintPct: p.greenPct !== undefined ? 100 - p.greenPct : undefined,
        unitsCount: p.unitsCount,
        status: p.status,
        launchDate: p.launchYear ? midYear(p.launchYear) : undefined,
        deliveryDate: midYear(p.deliveryYear),
        progressPct: p.progressPct,
        pricesUpdatedAt: p.pricesUpdated ? new Date(p.pricesUpdated) : undefined,
        amenities: p.amenities,
        isFeatured: p.isFeatured,
        published: true,
        typologies: {
          create: p.typologies.map((t) => ({
            code: t.code,
            nameAr: t.name.ar,
            nameEn: t.name.en,
            category: t.category,
            subType: t.subType,
            buaM2: t.buaM2,
            gardenM2: t.gardenM2,
            roofM2: t.roofM2,
            bedrooms: t.bedrooms,
            bathrooms: t.bathrooms,
            finishing: t.finishing,
            priceFrom: t.priceFrom,
            pricePerM2From: Math.round(t.priceFrom / t.buaM2),
          })),
        },
        paymentPlans: {
          create: p.paymentPlans.map((plan) => ({
            nameAr: plan.name.ar,
            nameEn: plan.name.en,
            downPaymentPct: plan.downPaymentPct,
            deliveryPaymentPct: plan.deliveryPaymentPct,
            years: plan.years,
            frequency: plan.frequency,
            cashDiscountPct: plan.cashDiscountPct,
            maintenancePct: p.fees.maintenancePct,
          })),
        },
        zones: {
          create: p.zones.map((z, i) => ({
            kind: z.kind,
            shortAr: z.short.ar,
            shortEn: z.short.en,
            nameAr: z.name.ar,
            nameEn: z.name.en,
            phaseAr: z.phase?.ar,
            phaseEn: z.phase?.en,
            descriptionAr: z.description.ar,
            descriptionEn: z.description.en,
            areaFeddan: z.areaFeddan,
            buildingsCount: z.buildings,
            unitsCount: z.units,
            unitSubTypes: z.subTypes,
            xPct: z.shape.x,
            yPct: z.shape.y,
            widthPct: z.shape.w,
            heightPct: z.shape.h,
            sortOrder: i,
          })),
        },
        distances: {
          create: p.distances.map((d, i) => ({ placeAr: d.place.ar, placeEn: d.place.en, minutes: d.minutes, sortOrder: i })),
        },
        media: {
          // No files yet: an empty URL means "show the placeholder".
          create: p.photos.map((ph, i) => ({ kind: "IMAGE", group: ph.group, url: "", captionAr: ph.caption.ar, captionEn: ph.caption.en, sortOrder: i })),
        },
      },
    });
  }

  console.log(`Seeded ${areaIds.size} areas, ${developers.length} developers and ${projects.length} projects.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
