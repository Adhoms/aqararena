import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { Currency, SubType } from "@/lib/property";
import { stepsOf } from "@/lib/catalog/plan-steps";
import { budgetFigure, fitsBudget, plansForType, type SalesPlan } from "./budget";
import { releaseExpired, salesHoldWhere } from "./hold-service";
import { effectiveHoldHours, salesState, SALES_STATE_RANK, type HoldActor, type SalesState } from "./holds";
import { unitLabel } from "./labels";
import { salesTypologyWhere, salesUnitWhere } from "./scope";
import type { SalesSearch } from "./search";

// What AqarArena Sales reads: one developer's published projects, their units and active plans.
// Every query is scoped by the signed-in salesperson's developer (the rule in scope.ts); another
// company's ids find nothing. A unit counts as held only by a hold of that developer's own salespeople.

/** Results per page, and how many units one search looks at (available ones first). */
export const PAGE_SIZE = 40;
export const SCAN_LIMIT = 2000;

const dec = (v: Prisma.Decimal | null) => (v === null ? null : Number(v));
/** Today on Cairo's calendar, as the UTC midnight a `@db.Date` column compares with: a plan "valid until" a day lasts all of that day in Cairo. */
const todayCairo = () => new Date(new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date()) + "T00:00:00Z");

export type SalesProject = {
  id: string;
  nameAr: string;
  currency: Currency;
  types: { id: string; code: string; nameAr: string | null; subType: SubType; bedrooms: number | null }[];
  /** Units free to hold: AVAILABLE and without a live hold (the search shows held units as their own state). */
  available: number;
  total: number;
};

/** The developer's published projects that have priced unit types, with available (not held) / total unit counts. */
export async function salesProjects(developerId: string, now = new Date()): Promise<SalesProject[]> {
  const types = salesTypologyWhere(developerId);
  const projects = await db.project.findMany({
    where: { typologies: { some: types } },
    orderBy: { nameAr: "asc" },
    select: { id: true, nameAr: true, currency: true, typologies: { where: types, orderBy: { priceFrom: "asc" }, select: { id: true, code: true, nameAr: true, subType: true, bedrooms: true } } },
  });
  const typeIds = projects.flatMap((p) => p.typologies.map((t) => t.id));
  const [counts, held] = typeIds.length
    ? await Promise.all([
        db.unit.groupBy({ by: ["typologyId", "availability"], where: { typologyId: { in: typeIds } }, _count: { _all: true } }),
        db.unit.groupBy({
          by: ["typologyId"],
          where: { typologyId: { in: typeIds }, availability: "AVAILABLE", holds: { some: salesHoldWhere(developerId, now) } },
          _count: { _all: true },
        }),
      ])
    : [[], []];
  const projectOf = new Map(projects.flatMap((p) => p.typologies.map((t) => [t.id, p.id] as const)));
  const totals = new Map<string, { available: number; total: number }>();
  for (const c of counts) {
    const projectId = projectOf.get(c.typologyId)!;
    const t = totals.get(projectId) ?? { available: 0, total: 0 };
    t.total += c._count._all;
    if (c.availability === "AVAILABLE") t.available += c._count._all;
    totals.set(projectId, t);
  }
  for (const h of held) {
    const t = totals.get(projectOf.get(h.typologyId)!);
    if (t) t.available -= h._count._all;
  }
  return projects.map((p) => ({ id: p.id, nameAr: p.nameAr, currency: p.currency, types: p.typologies, ...(totals.get(p.id) ?? { available: 0, total: 0 }) }));
}

/** Active plans that haven't passed their end date, by project, for the developer's published projects (all of them, or `projectIds`). */
export async function salesPlans(developerId: string, projectIds?: string[]): Promise<Map<string, SalesPlan[]>> {
  const rows = !projectIds || projectIds.length
    ? await db.paymentPlan.findMany({
        where: {
          ...(projectIds ? { projectId: { in: projectIds } } : {}),
          project: { developerId, published: true },
          isActive: true,
          OR: [{ validUntil: null }, { validUntil: { gte: todayCairo() } }],
        },
        orderBy: { createdAt: "asc" },
        include: { steps: { orderBy: { sortOrder: "asc" } } },
      })
    : [];
  const byProject = new Map<string, SalesPlan[]>();
  for (const p of rows) {
    const plan: SalesPlan = {
      id: p.id,
      typologyId: p.typologyId,
      name: { ar: p.nameAr ?? p.nameEn ?? "", en: p.nameEn ?? p.nameAr ?? "" },
      downPaymentPct: Number(p.downPaymentPct),
      deliveryPaymentPct: Number(p.deliveryPaymentPct),
      years: p.years,
      frequency: p.frequency,
      cashDiscountPct: dec(p.cashDiscountPct) ?? undefined,
      maintenancePct: dec(p.maintenancePct) ?? undefined,
      ...(p.steps.length > 0 && { steps: stepsOf(p.steps) }),
    };
    byProject.set(p.projectId, [...(byProject.get(p.projectId) ?? []), plan]);
  }
  return byProject;
}

export type SalesUnitRow = {
  id: string;
  label: string;
  projectName: string;
  typeCode: string;
  typeName: string | null;
  subType: SubType;
  bedrooms: number | null;
  floor: number | null;
  view: string | null;
  price: number;
  /** The project's currency, for every amount of the row. */
  currency: Currency;
  /** The down payment or monthly installment that met the budget (null for a total-price budget or none). */
  figure: number | null;
  state: SalesState;
  hold: { name: string; expiresAt: Date; mine: boolean } | null;
};

/** The units matching a search, available first, then by price. `capped` when more units matched than one search looks at. */
export async function searchUnits(
  me: { id: string; developerId: string },
  s: SalesSearch,
  plans: Map<string, SalesPlan[]>,
  now = new Date(),
): Promise<{ rows: SalesUnitRow[]; capped: boolean }> {
  const typology: Prisma.TypologyWhereInput = {
    ...(s.project ? { projectId: s.project } : {}),
    ...(s.model ? { id: s.model } : {}),
    ...(s.type ? { subType: s.type } : {}),
    ...(s.beds ? { bedrooms: s.beds >= 5 ? { gte: 5 } : s.beds } : {}),
  };
  const held = salesHoldWhere(me.developerId, now);
  const where: Prisma.UnitWhereInput = {
    AND: [
      salesUnitWhere(me.developerId),
      { typology },
      // A budget is in one currency: it only matches projects priced in it.
      ...(s.budget ? [{ typology: { project: { currency: s.cur ?? "EGP" } } }] : []),
    ],
    ...(s.floorMin !== undefined || s.floorMax !== undefined ? { floor: { gte: s.floorMin, lte: s.floorMax } } : {}),
    ...(s.view ? { view: s.view } : {}),
    // Held and available are told apart by a live hold, in the database, so the scan limit never cuts them short.
    ...(s.state === "HELD"
      ? { availability: "AVAILABLE", holds: { some: held } }
      : s.state === "AVAILABLE"
        ? { availability: "AVAILABLE", holds: { none: held } }
        : s.state
          ? { availability: s.state }
          : {}),
    // A total-price budget narrows the scan in the database too; the exact check is below.
    ...(s.budget && s.by === "total" ? { OR: [{ price: { lte: s.budget + 0.5 } }, { price: null, typology: { priceFrom: { lte: s.budget + 0.5 } } }] } : {}),
  };
  const units = await db.unit.findMany({
    where,
    // Cheapest first within each state, so a capped scan keeps the cheapest units: the unit's own price,
    // then (for units without one) the type's starting price.
    orderBy: [{ availability: "asc" }, { price: { sort: "asc", nulls: "last" } }, { typology: { priceFrom: "asc" } }, { id: "asc" }],
    take: SCAN_LIMIT + 1,
    select: {
      id: true,
      building: true,
      unitNumber: true,
      floor: true,
      view: true,
      price: true,
      availability: true,
      typologyId: true,
      typology: { select: { code: true, nameAr: true, subType: true, bedrooms: true, priceFrom: true, project: { select: { id: true, nameAr: true, currency: true } } } },
      holds: { where: held, take: 1, select: { salesAccountId: true, expiresAt: true, salesAccount: { select: { nameAr: true } } } },
    },
  });
  const rows: SalesUnitRow[] = [];
  for (const u of units.slice(0, SCAN_LIMIT)) {
    const hold = u.holds[0];
    const state = salesState(u.availability, Boolean(hold));
    // A safety net: the database filter above already matched the state.
    if (s.state && state !== s.state) continue;
    const price = Number(u.price ?? u.typology.priceFrom);
    let figure: number | null = null;
    if (s.budget) {
      const f = budgetFigure(price, plansForType(plans.get(u.typology.project.id) ?? [], u.typologyId), s.by, s.plan);
      if (!fitsBudget(f, s.budget)) continue;
      figure = s.by === "total" ? null : f.value;
    }
    rows.push({
      id: u.id,
      label: unitLabel(u),
      projectName: u.typology.project.nameAr,
      typeCode: u.typology.code,
      typeName: u.typology.nameAr,
      subType: u.typology.subType,
      bedrooms: u.typology.bedrooms,
      floor: u.floor,
      view: u.view,
      price,
      currency: u.typology.project.currency,
      figure,
      state,
      hold: hold ? { name: hold.salesAccount.nameAr, expiresAt: hold.expiresAt, mine: hold.salesAccountId === me.id } : null,
    });
  }
  rows.sort(
    (a, b) =>
      SALES_STATE_RANK[a.state] - SALES_STATE_RANK[b.state] ||
      // Prices are only compared within a currency: pounds first.
      Number(a.currency !== "EGP") - Number(b.currency !== "EGP") ||
      a.price - b.price ||
      a.projectName.localeCompare(b.projectName, "ar") ||
      a.label.localeCompare(b.label, "en", { numeric: true }),
  );
  return { rows, capped: units.length > SCAN_LIMIT };
}

/** A live hold as the viewer sees it. `clientNote` is null unless the viewer holds it or is a team lead. */
export type UnitHoldView = { id: string; salesAccountId: string; holder: string; expiresAt: Date; clientNote: string | null };

export type SalesUnitDetail = {
  id: string;
  label: string;
  typologyId: string;
  floor: number | null;
  view: string | null;
  orientation: string | null;
  price: number;
  state: SalesState;
  type: {
    code: string;
    nameAr: string | null;
    subType: SubType;
    finishing: string;
    buaM2: number;
    netM2: number | null;
    gardenM2: number | null;
    roofM2: number | null;
    terraceM2: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
  };
  project: { id: string; nameAr: string; slug: string; deliveryYear: number; holdHours: number; currency: Currency };
  /** The type's floor plans; until those can be uploaded per type, the project's. */
  floorPlans: { url: string; caption: string | null }[];
  floorPlansOfType: boolean;
  /** The master plan image. Units aren't linked to zones, so it can't be marked. */
  masterPlan: string | null;
  hold: UnitHoldView | null;
};

/**
 * One unit of the viewer's developer's published, priced inventory, or null. Opening it releases an expired
 * hold on it. Who the unit is held for (the client note) is only for the holder and the team leads.
 */
export async function loadSalesUnit(viewer: HoldActor, unitId: string, now = new Date()): Promise<SalesUnitDetail | null> {
  const { developerId } = viewer;
  const scope: Prisma.UnitWhereInput = { id: unitId, ...salesUnitWhere(developerId) };
  await releaseExpired(db, { unit: scope }, now);
  const unit = await db.unit.findFirst({
    where: scope,
    select: {
      id: true,
      building: true,
      unitNumber: true,
      floor: true,
      view: true,
      orientation: true,
      price: true,
      availability: true,
      typologyId: true,
      typology: {
        select: {
          code: true,
          nameAr: true,
          subType: true,
          finishing: true,
          buaM2: true,
          netM2: true,
          gardenM2: true,
          roofM2: true,
          terraceM2: true,
          bedrooms: true,
          bathrooms: true,
          priceFrom: true,
          media: { where: { kind: { in: ["FLOOR_PLAN_2D", "LAYOUT_SKETCH"] } }, orderBy: { sortOrder: "asc" }, select: { url: true, captionAr: true } },
          project: {
            select: {
              id: true,
              nameAr: true,
              slug: true,
              deliveryDate: true,
              holdHours: true,
              currency: true,
              masterPlanUrl: true,
              developer: { select: { holdHours: true } },
              media: { where: { kind: { in: ["MASTER_PLAN", "FLOOR_PLAN_2D", "LAYOUT_SKETCH"] } }, orderBy: { sortOrder: "asc" }, select: { kind: true, url: true, captionAr: true } },
            },
          },
        },
      },
      holds: { where: salesHoldWhere(developerId, now), take: 1, select: { id: true, salesAccountId: true, expiresAt: true, clientNote: true, salesAccount: { select: { nameAr: true } } } },
    },
  });
  if (!unit) return null;
  const t = unit.typology;
  const p = t.project;
  const hold = unit.holds[0];
  const seesNote = hold !== undefined && (hold.salesAccountId === viewer.id || viewer.role === "LEAD");
  const typePlans = t.media.map((m) => ({ url: m.url, caption: m.captionAr }));
  const projectPlans = p.media.filter((m) => m.kind !== "MASTER_PLAN").map((m) => ({ url: m.url, caption: m.captionAr }));
  return {
    id: unit.id,
    label: unitLabel(unit),
    typologyId: unit.typologyId,
    floor: unit.floor,
    view: unit.view,
    orientation: unit.orientation,
    price: Number(unit.price ?? t.priceFrom),
    state: salesState(unit.availability, Boolean(hold)),
    type: {
      code: t.code,
      nameAr: t.nameAr,
      subType: t.subType,
      finishing: t.finishing,
      buaM2: Number(t.buaM2),
      netM2: dec(t.netM2),
      gardenM2: dec(t.gardenM2),
      roofM2: dec(t.roofM2),
      terraceM2: dec(t.terraceM2),
      bedrooms: t.bedrooms,
      bathrooms: t.bathrooms,
    },
    project: { id: p.id, nameAr: p.nameAr, slug: p.slug, deliveryYear: p.deliveryDate.getUTCFullYear(), holdHours: effectiveHoldHours(p.holdHours, p.developer.holdHours), currency: p.currency },
    floorPlans: typePlans.length ? typePlans : projectPlans,
    floorPlansOfType: typePlans.length > 0,
    masterPlan: p.masterPlanUrl ?? p.media.find((m) => m.kind === "MASTER_PLAN")?.url ?? null,
    hold: hold ? { id: hold.id, salesAccountId: hold.salesAccountId, holder: hold.salesAccount.nameAr, expiresAt: hold.expiresAt, clientNote: seesNote ? hold.clientNote : null } : null,
  };
}
