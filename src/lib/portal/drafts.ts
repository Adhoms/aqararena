import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { FormReader } from "@/lib/admin/form";
import { MEDIA_KINDS } from "@/lib/admin/labels";
import { FEDDAN_M2, readDeveloper, readPaymentPlan, readProject, readTypology } from "@/lib/admin/readers";
import { recordPriceHistory } from "@/lib/price-history";
import { PHOTO_GROUPS } from "@/lib/property";
import { LIMITS, type DraftErrors, type Fields, type MediaItem, type ProfileDraft, type ProjectDraft } from "./draft-types";
import { ALL_PROFILE_FIELDS, ALL_PROJECT_FIELDS, DISTANCE_FIELDS, PLAN_FIELDS, TYPOLOGY_FIELDS } from "./fields";

// Turning live records into drafts, checking drafts with the admin's rules, and writing an
// approved draft to the live tables.

// ─── Live record → draft ────────────────────────────────────────────────

const str = (v: { toString(): string } | null | undefined) => (v === null || v === undefined ? "" : v.toString());
const day = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

export const projectInclude = {
  typologies: { orderBy: { code: "asc" } },
  paymentPlans: { where: { isActive: true }, orderBy: { createdAt: "asc" }, include: { typology: { select: { code: true } } } },
  media: { orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] },
  distances: { orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProjectInclude;

export type LiveProject = Prisma.ProjectGetPayload<{ include: typeof projectInclude }>;

export function draftFromProject(p: LiveProject): ProjectDraft {
  return {
    project: {
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      areaId: p.areaId,
      districtAr: p.districtAr ?? "",
      districtEn: p.districtEn ?? "",
      descriptionAr: p.descriptionAr ?? "",
      descriptionEn: p.descriptionEn ?? "",
      categories: p.categories,
      status: p.status,
      deliveryDate: day(p.deliveryDate),
      launchDate: day(p.launchDate),
      progressPct: str(p.progressPct),
      bookingFee: str(p.bookingFee),
      landFeddan: p.landAreaM2 ? String(Math.round((Number(p.landAreaM2) / FEDDAN_M2) * 100) / 100) : "",
      footprintPct: str(p.footprintPct),
      unitsCount: str(p.unitsCount),
      latitude: str(p.latitude),
      longitude: str(p.longitude),
      masterPlanUrl: p.masterPlanUrl ?? "",
      amenities: p.amenities,
    },
    typologies: p.typologies.map((t) => ({
      code: t.code,
      subType: t.subType,
      category: t.category,
      finishing: t.finishing,
      buaM2: str(t.buaM2),
      priceFrom: str(t.priceFrom),
      bedrooms: str(t.bedrooms),
      bathrooms: str(t.bathrooms),
      gardenM2: str(t.gardenM2),
      roofM2: str(t.roofM2),
      nameAr: t.nameAr ?? "",
      nameEn: t.nameEn ?? "",
    })),
    plans: p.paymentPlans.map((pl) => ({
      typologyCode: pl.typology?.code ?? "",
      nameAr: pl.nameAr ?? "",
      nameEn: pl.nameEn ?? "",
      downPaymentPct: str(pl.downPaymentPct),
      deliveryPaymentPct: str(pl.deliveryPaymentPct),
      years: str(pl.years),
      frequency: pl.frequency,
      cashDiscountPct: str(pl.cashDiscountPct),
      maintenancePct: str(pl.maintenancePct),
      garageFee: str(pl.garageFee),
      clubFee: str(pl.clubFee),
      validUntil: day(pl.validUntil),
    })),
    media: p.media
      .filter((m) => (MEDIA_KINDS as readonly string[]).includes(m.kind))
      .map((m) => ({
        kind: m.kind,
        group: m.group ?? "",
        url: m.url,
        captionAr: m.captionAr ?? "",
        captionEn: m.captionEn ?? "",
        width: m.width ?? undefined,
        height: m.height ?? undefined,
      })),
    distances: p.distances.map((d) => ({ placeAr: d.placeAr, placeEn: d.placeEn, minutes: String(d.minutes) })),
  };
}

export function draftFromDeveloper(d: {
  nameAr: string;
  nameEn: string;
  foundedYear: number | null;
  logoUrl: string | null;
  aboutAr: string | null;
  aboutEn: string | null;
  hotline: string | null;
  salesPhone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  hqAddressAr: string | null;
  hqAddressEn: string | null;
}): ProfileDraft {
  const profile: Fields = {};
  for (const f of ALL_PROFILE_FIELDS) profile[f.key] = str((d as Record<string, unknown>)[f.key] as string | number | null);
  return { profile };
}

// ─── Untrusted JSON → draft ─────────────────────────────────────────────

const MAX_TEXT = 5000;

function cleanFields(input: unknown, keys: string[]): Fields {
  const out: Fields = {};
  if (!input || typeof input !== "object") return out;
  for (const key of keys) {
    const v = (input as Record<string, unknown>)[key];
    if (typeof v === "string") out[key] = v.slice(0, MAX_TEXT);
    else if (Array.isArray(v)) out[key] = v.filter((x): x is string => typeof x === "string").slice(0, 50).map((x) => x.slice(0, 100));
  }
  return out;
}

const list = (v: unknown, max: number): unknown[] => (Array.isArray(v) ? v.slice(0, max) : []);
const keys = (defs: { key: string }[]) => defs.map((d) => d.key);

/** Keeps only known fields with string values, so a draft can't carry anything unexpected. */
export function parseProjectDraft(input: unknown): ProjectDraft {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    project: cleanFields(o.project, keys(ALL_PROJECT_FIELDS)),
    typologies: list(o.typologies, LIMITS.typologies).map((t) => cleanFields(t, keys(TYPOLOGY_FIELDS))),
    plans: list(o.plans, LIMITS.plans).map((p) => cleanFields(p, keys(PLAN_FIELDS))),
    media: list(o.media, LIMITS.media).map((m) => {
      const f = cleanFields(m, ["kind", "group", "url", "captionAr", "captionEn"]);
      const n = (k: string) => {
        const v = (m as Record<string, unknown>)?.[k];
        return typeof v === "number" && Number.isInteger(v) && v > 0 && v < 100000 ? v : undefined;
      };
      return {
        kind: String(f.kind ?? ""),
        group: String(f.group ?? ""),
        url: String(f.url ?? ""),
        captionAr: String(f.captionAr ?? ""),
        captionEn: String(f.captionEn ?? ""),
        width: n("width"),
        height: n("height"),
      } satisfies MediaItem;
    }),
    distances: list(o.distances, LIMITS.distances).map((d) => cleanFields(d, keys(DISTANCE_FIELDS))),
  };
}

export function parseProfileDraft(input: unknown): ProfileDraft {
  const o = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return { profile: cleanFields(o.profile, keys(ALL_PROFILE_FIELDS)) };
}

// ─── Checking ───────────────────────────────────────────────────────────

function form(fields: Fields): FormData {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) v.forEach((x) => data.append(k, x));
    else if (v.trim()) data.set(k, v);
  }
  return data;
}

function run<T>(fields: Fields, read: (f: FormReader) => T, prefix: string, errors: DraftErrors, extra?: (f: FormReader) => void) {
  const f = new FormReader(form(fields));
  const values = read(f);
  extra?.(f);
  // Developers never type a slug; a missing English name explains it.
  if (f.errors.slug) {
    f.errors.nameEn ??= "اكتب الاسم بالإنجليزية بحروف إنجليزية";
    delete f.errors.slug;
  }
  for (const [k, m] of Object.entries(f.errors)) errors[`${prefix}.${k}`] = m;
  return values;
}

export type CheckedProject = {
  project: ReturnType<typeof readProject>;
  areaId: string | null;
  typologies: ReturnType<typeof readTypology>[];
  plans: (ReturnType<typeof readPaymentPlan> & { typologyCode: string | null })[];
  media: { kind: (typeof MEDIA_KINDS)[number]; group: (typeof PHOTO_GROUPS)[number] | null; url: string; captionAr: string | null; captionEn: string | null; width: number | null; height: number | null }[];
  distances: { placeAr: string; placeEn: string; minutes: number }[];
};

export async function checkProjectDraft(draft: ProjectDraft): Promise<{ errors: DraftErrors; values: CheckedProject }> {
  const errors: DraftErrors = {};
  const project = run(draft.project, readProject, "project", errors);
  const areaId = typeof draft.project.areaId === "string" && draft.project.areaId ? draft.project.areaId : null;
  if (!areaId) errors["project.areaId"] = "اختار المنطقة";
  else if (!(await db.area.findUnique({ where: { id: areaId }, select: { id: true } }))) errors["project.areaId"] = "منطقة غير معروفة";

  const codes = new Set<string>();
  const typologies = draft.typologies.map((t, i) => {
    const v = run(t, readTypology, `typologies.${i}`, errors);
    const code = v.code.toLowerCase();
    if (code && codes.has(code)) errors[`typologies.${i}.code`] = "الكود ده متكرر";
    codes.add(code);
    return v;
  });
  if (typologies.length === 0) errors["typologies"] = "أضف نموذج وحدة واحد على الأقل بسعر";

  const plans = draft.plans.map((p, i) => {
    const v = run({ ...p, isActive: "on" }, readPaymentPlan, `plans.${i}`, errors);
    const code = typeof p.typologyCode === "string" && p.typologyCode.trim() ? p.typologyCode.trim() : null;
    if (code && !codes.has(code.toLowerCase())) errors[`plans.${i}.typologyCode`] = "مافيش نموذج بالكود ده";
    return { ...v, typologyCode: code };
  });

  const media = draft.media.map((m, i) => {
    const kind = (MEDIA_KINDS as readonly string[]).includes(m.kind) ? (m.kind as (typeof MEDIA_KINDS)[number]) : null;
    const group = (PHOTO_GROUPS as readonly string[]).includes(m.group) ? (m.group as (typeof PHOTO_GROUPS)[number]) : null;
    if (!kind) errors[`media.${i}.kind`] = "اختار النوع";
    if (kind === "IMAGE" && !group) errors[`media.${i}.group`] = "اختار التبويب";
    if (!/^https:\/\/\S+$/.test(m.url)) errors[`media.${i}.url`] = "رابط غير صالح";
    return {
      kind: kind ?? "IMAGE",
      group: kind === "IMAGE" ? group : null,
      url: m.url,
      captionAr: m.captionAr.trim().slice(0, 300) || null,
      captionEn: m.captionEn.trim().slice(0, 300) || null,
      width: m.width ?? null,
      height: m.height ?? null,
    };
  });

  const distances = draft.distances.map((d, i) => {
    const f = new FormReader(form(d));
    const v = { placeAr: f.requiredText("placeAr", 200), placeEn: f.requiredText("placeEn", 200), minutes: f.int("minutes", { required: true, min: 0, max: 600 }) ?? 0 };
    for (const [k, m] of Object.entries(f.errors)) errors[`distances.${i}.${k}`] = m;
    return v;
  });

  return { errors, values: { project, areaId, typologies, plans, media, distances } };
}

export function checkProfileDraft(draft: ProfileDraft) {
  const errors: DraftErrors = {};
  const values = run(draft.profile, readDeveloper, "profile", errors);
  return { errors, values };
}

// ─── Approving ──────────────────────────────────────────────────────────

const today = () => new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");

async function uniqueSlug(tx: Prisma.TransactionClient, base: string) {
  for (let n = 1; n < 100; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    if (!(await tx.project.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
  return `${base}-${Date.now()}`;
}

/**
 * Writes an approved project draft. Unit types are matched by code and photos by link, so
 * unchanged rows keep their ids; plans and distances are replaced. Returns the project id and
 * the links of files no longer used by this project (to delete from storage if unused elsewhere).
 */
export async function applyProjectDraft(
  tx: Prisma.TransactionClient,
  { developerId, projectId, values, publish }: { developerId: string; projectId: string | null; values: CheckedProject; publish: boolean },
): Promise<{ projectId: string; removedUrls: string[] }> {
  // The admin decides about publishing and featuring; the slug stays once set.
  const { isFeatured: _f, published: _p, slug, pricesUpdatedAt: _d, ...fields } = values.project;
  void _f;
  void _p;
  void _d;
  const relations = { developer: { connect: { id: developerId } }, area: { connect: { id: values.areaId! } } };
  const removedUrls: string[] = [];

  let id = projectId;
  if (id) {
    const live = await tx.project.findUnique({ where: { id }, select: { masterPlanUrl: true } });
    if (live?.masterPlanUrl && live.masterPlanUrl !== fields.masterPlanUrl) removedUrls.push(live.masterPlanUrl);
    await tx.project.update({ where: { id }, data: { ...fields, ...relations, pricesUpdatedAt: today(), ...(publish && { published: true }) } });
  } else {
    const created = await tx.project.create({
      data: { ...fields, ...relations, slug: await uniqueSlug(tx, slug), published: publish, pricesUpdatedAt: today() },
      select: { id: true },
    });
    id = created.id;
  }

  // Unit types by code.
  const existing = await tx.typology.findMany({ where: { projectId: id }, select: { id: true, code: true } });
  const keep = new Set(values.typologies.map((t) => t.code.toLowerCase()));
  const gone = existing.filter((t) => !keep.has(t.code.toLowerCase()));
  if (gone.length) await tx.typology.deleteMany({ where: { id: { in: gone.map((t) => t.id) } } });
  const typId = new Map<string, string>();
  for (const t of values.typologies) {
    const match = existing.find((e) => e.code.toLowerCase() === t.code.toLowerCase());
    const saved = match
      ? await tx.typology.update({ where: { id: match.id }, data: t, select: { id: true } })
      : await tx.typology.create({ data: { ...t, projectId: id }, select: { id: true } });
    typId.set(t.code.toLowerCase(), saved.id);
  }

  await recordPriceHistory([id], tx);

  // Plans: replaced as a whole.
  await tx.paymentPlan.deleteMany({ where: { projectId: id } });
  for (const { typologyCode, ...p } of values.plans) {
    await tx.paymentPlan.create({ data: { ...p, projectId: id, typologyId: typologyCode ? (typId.get(typologyCode.toLowerCase()) ?? null) : null } });
  }

  // Photos and files by link.
  const liveMedia = await tx.media.findMany({ where: { projectId: id }, select: { id: true, url: true } });
  const wanted = new Set(values.media.map((m) => m.url));
  const dropped = liveMedia.filter((m) => !wanted.has(m.url));
  if (dropped.length) {
    await tx.media.deleteMany({ where: { id: { in: dropped.map((m) => m.id) } } });
    removedUrls.push(...dropped.map((m) => m.url));
  }
  for (const [sortOrder, m] of values.media.entries()) {
    const match = liveMedia.find((l) => l.url === m.url);
    if (match) await tx.media.update({ where: { id: match.id }, data: { ...m, sortOrder } });
    else await tx.media.create({ data: { ...m, sortOrder, projectId: id } });
  }

  // Distances: replaced as a whole.
  await tx.projectDistance.deleteMany({ where: { projectId: id } });
  if (values.distances.length) {
    await tx.projectDistance.createMany({ data: values.distances.map((d, sortOrder) => ({ ...d, sortOrder, projectId: id })) });
  }

  return { projectId: id, removedUrls };
}

/** Writes an approved company profile. The admin-only fields (slug, verified) are left as they are. */
export async function applyProfileDraft(tx: Prisma.TransactionClient, developerId: string, values: ReturnType<typeof readDeveloper>) {
  const { slug: _s, verified: _v, ...fields } = values;
  void _s;
  void _v;
  const live = await tx.developer.findUnique({ where: { id: developerId }, select: { logoUrl: true } });
  await tx.developer.update({ where: { id: developerId }, data: fields });
  return live?.logoUrl && live.logoUrl !== fields.logoUrl ? [live.logoUrl] : [];
}
