import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { finishingsOf, isAmenity, isAreaSlug, isSubType, type AreaSlug } from "@/lib/property";
import type { Developer, Project, Text } from "./types";
import { needsUnitMatch, type ProjectFilters } from "./filters";

// Reads developers and projects from PostgreSQL and turns the rows into the plain
// shapes in ./types.ts, so pages never see Prisma types (Decimal, Date, …).

const FEDDAN_M2 = 4200.83;
const num = (v: Prisma.Decimal | null | undefined) => (v === null || v === undefined ? undefined : Number(v));
const text = (ar: string | null | undefined, en: string | null | undefined, fallback = ""): Text => ({
  ar: ar ?? en ?? fallback,
  en: en ?? ar ?? fallback,
});

const projectInclude = {
  developer: { select: { slug: true } },
  area: { select: { slug: true } },
  typologies: { orderBy: { priceFrom: "asc" } },
  paymentPlans: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
  zones: { orderBy: { sortOrder: "asc" } },
  distances: { orderBy: { sortOrder: "asc" } },
  media: { where: { kind: { in: ["IMAGE", "BROCHURE", "MASTER_PLAN", "FLOOR_PLAN_2D", "LAYOUT_SKETCH"] } }, orderBy: { sortOrder: "asc" } },
  // Project-wide average only; the rows per unit type are kept for later.
} satisfies Prisma.ProjectInclude;

type ProjectRow = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;
type DeveloperRow = Prisma.DeveloperGetPayload<object>;

function toDeveloper(d: DeveloperRow): Developer {
  return {
    slug: d.slug,
    name: text(d.nameAr, d.nameEn),
    foundedYear: d.foundedYear ?? undefined,
    about: text(d.aboutAr, d.aboutEn),
    verified: d.verified,
    logoUrl: d.logoUrl ?? undefined,
    contacts: {
      hotline: d.hotline ?? undefined,
      salesPhone: d.salesPhone ?? undefined,
      whatsapp: d.whatsapp ?? undefined,
      email: d.email ?? undefined,
      website: d.website ?? undefined,
      hqAddress: d.hqAddressAr || d.hqAddressEn ? text(d.hqAddressAr, d.hqAddressEn) : undefined,
    },
  };
}

function toProject(p: ProjectRow): Project {
  const footprint = num(p.footprintPct);
  const land = num(p.landAreaM2);
  return {
    slug: p.slug,
    developerSlug: p.developer.slug,
    // Areas outside the starter list fall back to the first one until the area list comes from the database too.
    areaSlug: (isAreaSlug(p.area.slug) ? p.area.slug : "new-cairo") as AreaSlug,
    location: p.latitude !== null && p.longitude !== null ? { lat: Number(p.latitude), lng: Number(p.longitude) } : undefined,
    name: text(p.nameAr, p.nameEn),
    district: text(p.districtAr, p.districtEn),
    description: text(p.descriptionAr, p.descriptionEn),
    categories: p.categories.length ? p.categories : [...new Set(p.typologies.map((t) => t.category))],
    status: p.status,
    launchYear: p.launchDate?.getUTCFullYear(),
    launchDate: p.launchDate?.toISOString().slice(0, 10),
    bookingFee: num(p.bookingFee),
    brochureUrl: p.media.find((m) => m.kind === "BROCHURE")?.url,
    deliveryYear: p.deliveryDate.getUTCFullYear(),
    progressPct: p.progressPct ?? undefined,
    landFeddan: land ? Math.round(land / FEDDAN_M2) : undefined,
    greenPct: footprint !== undefined ? Math.round(100 - footprint) : undefined,
    unitsCount: p.unitsCount ?? undefined,
    amenities: p.amenities.filter(isAmenity),
    zones: p.zones.map((z) => ({
      id: z.id,
      kind: z.kind,
      short: text(z.shortAr, z.shortEn),
      name: text(z.nameAr, z.nameEn),
      phase: z.phaseAr || z.phaseEn ? text(z.phaseAr, z.phaseEn) : undefined,
      description: text(z.descriptionAr, z.descriptionEn),
      areaFeddan: num(z.areaFeddan),
      buildings: z.buildingsCount ?? undefined,
      units: z.unitsCount ?? undefined,
      subTypes: z.unitSubTypes.filter(isSubType),
      shape: { x: Number(z.xPct), y: Number(z.yPct), w: Number(z.widthPct), h: Number(z.heightPct) },
    })),
    typologies: p.typologies
      .filter((t) => t.priceFrom !== null && isSubType(t.subType))
      .map((t) => ({
        code: t.code,
        category: t.category,
        subType: t.subType as Project["typologies"][number]["subType"],
        // No name: pages describe the unit by its type and size instead of showing the code.
        name: text(t.nameAr, t.nameEn, ""),
        buaM2: Number(t.buaM2),
        bedrooms: t.bedrooms ?? undefined,
        bathrooms: t.bathrooms ?? undefined,
        gardenM2: num(t.gardenM2),
        roofM2: num(t.roofM2),
        finishing: t.finishing,
        priceFrom: Number(t.priceFrom),
      })),
    paymentPlans: p.paymentPlans.map((plan) => ({
      name: text(plan.nameAr, plan.nameEn),
      downPaymentPct: Number(plan.downPaymentPct),
      deliveryPaymentPct: Number(plan.deliveryPaymentPct),
      years: plan.years,
      frequency: plan.frequency,
      cashDiscountPct: num(plan.cashDiscountPct),
    })),
    fees: { maintenancePct: num(p.paymentPlans.find((plan) => plan.maintenancePct !== null)?.maintenancePct) },
    photos: p.media
      .filter((m) => m.kind === "IMAGE" && m.group)
      .map((m) => ({
        group: m.group!,
        caption: text(m.captionAr, m.captionEn),
        url: m.url,
        width: m.width ?? undefined,
        height: m.height ?? undefined,
      })),
    cover: (p.media.find((m) => m.kind === "IMAGE" && m.group === "EXTERIOR") ?? p.media.find((m) => m.kind === "IMAGE"))?.url,
    masterPlanUrl: p.masterPlanUrl ?? p.media.find((m) => m.kind === "MASTER_PLAN")?.url,
    floorPlans: p.media
      .filter((m) => m.kind === "FLOOR_PLAN_2D" || m.kind === "LAYOUT_SKETCH")
      .map((m) => ({ url: m.url, caption: text(m.captionAr, m.captionEn) })),
    distances: p.distances.map((d) => ({ place: text(d.placeAr, d.placeEn), minutes: d.minutes })),
    isFeatured: p.isFeatured,
    pricesUpdated: p.pricesUpdatedAt?.toISOString().slice(0, 10),
  };
}

/** Projects with no priced unit type can't be shown on cards or compared yet. */
const showable = (p: Project) => p.typologies.length > 0;

export async function dbDevelopers(): Promise<Developer[]> {
  const rows = await db.developer.findMany({ orderBy: { nameEn: "asc" } });
  return rows.map(toDeveloper);
}

export async function dbDeveloper(slug: string): Promise<Developer | undefined> {
  const row = await db.developer.findUnique({ where: { slug } });
  return row ? toDeveloper(row) : undefined;
}

export async function dbProjects(where: Prisma.ProjectWhereInput = {}): Promise<Project[]> {
  const rows = await db.project.findMany({
    where: { published: true, ...where },
    include: projectInclude,
    orderBy: { launchDate: "desc" },
  });
  return rows.map(toProject).filter(showable);
}

export async function dbProject(slug: string): Promise<Project | undefined> {
  const row = await db.project.findFirst({ where: { slug, published: true }, include: projectInclude });
  const project = row ? toProject(row) : undefined;
  return project && showable(project) ? project : undefined;
}

/** Turns the visitor's filters into a database query. Sorting by price happens after loading. */
export function filtersToWhere(f: ProjectFilters): Prisma.ProjectWhereInput {
  const q = f.q?.trim();
  const and: Prisma.ProjectWhereInput[] = [];
  if (q) {
    and.push({
      OR: [
        { nameAr: { contains: q, mode: "insensitive" } },
        { nameEn: { contains: q, mode: "insensitive" } },
        { developer: { nameAr: { contains: q, mode: "insensitive" } } },
        { developer: { nameEn: { contains: q, mode: "insensitive" } } },
      ],
    });
  }
  if (f.category) and.push({ categories: { has: f.category } });
  if (f.areas?.length) and.push({ area: { slug: { in: f.areas } } });
  if (f.developer) and.push({ developer: { slug: f.developer } });
  if (f.statuses?.length) and.push({ status: { in: f.statuses } });
  if (f.deliveryBy) and.push({ deliveryDate: { lte: new Date(Date.UTC(f.deliveryBy, 11, 31)) } });
  if (f.maxDownPct) and.push({ paymentPlans: { some: { isActive: true, years: { gt: 0 }, downPaymentPct: { lte: f.maxDownPct } } } });
  if (f.minYears) and.push({ paymentPlans: { some: { isActive: true, years: { gte: f.minYears } } } });
  if (needsUnitMatch(f)) {
    and.push({
      typologies: {
        some: {
          ...(f.subTypes?.length && { subType: { in: f.subTypes } }),
          ...(f.minBedrooms && { bedrooms: { gte: f.minBedrooms } }),
          ...(f.finishes?.length && { finishing: { in: finishingsOf(f.finishes) } }),
          ...((f.minPrice || f.maxPrice) && {
            priceFrom: { ...(f.minPrice && { gte: f.minPrice }), ...(f.maxPrice && { lte: f.maxPrice }) },
          }),
        },
      },
    });
  }
  return and.length ? { AND: and } : {};
}
