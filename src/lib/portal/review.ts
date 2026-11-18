import "server-only";
import { db } from "@/lib/db";
import type { Fields, ProfileDraft, ProjectDraft } from "./draft-types";
import { draftFromDeveloper, draftFromProject, projectInclude } from "./drafts";
import { matchTypologies } from "./match-typologies";
import { ALL_PROFILE_FIELDS, ALL_PROJECT_FIELDS, DISTANCE_FIELDS, PLAN_FIELDS, PORTAL_MEDIA_KINDS, PORTAL_PHOTO_GROUPS, TYPOLOGY_FIELDS, type FieldDef } from "./fields";

// What the admin sees before approving: the live version next to the proposed one, field by field.

export type DiffRow = { label: string; before: string; after: string; changed: boolean };
export type DiffSection = { title: string; rows: DiffRow[] };
export type MediaDiff = { added: string[]; removed: string[]; kept: string[] };

function show(def: FieldDef, v: string | string[] | undefined, areas: Map<string, string>): string {
  if (v === undefined) return "";
  if (Array.isArray(v)) return v.map((x) => def.choices?.find((c) => c.value === x)?.label ?? x).join("، ");
  const t = v.trim();
  if (!t) return "";
  if (def.type === "area") return areas.get(t) ?? t;
  if (def.choices) return def.choices.find((c) => c.value === t)?.label ?? t;
  if (def.type === "number") {
    const n = Number(t.replace(/[,\s]/g, ""));
    return Number.isFinite(n) ? n.toLocaleString("ar-EG") : t;
  }
  return t;
}

function fieldRows(defs: FieldDef[], before: Fields | null, after: Fields, areas: Map<string, string>): DiffRow[] {
  return defs.map((d) => {
    const b = before ? show(d, before[d.key], areas) : "";
    const a = show(d, after[d.key], areas);
    return { label: d.label, before: b, after: a, changed: b !== a };
  });
}

const summary = (defs: FieldDef[], f: Fields, areas: Map<string, string>) =>
  defs
    .map((d) => [d.label, show(d, f[d.key], areas)] as const)
    .filter(([, v]) => v)
    .map(([l, v]) => `${l}: ${v}`)
    .join(" · ");

/** Rows matched by a key (unit type code); others compared as whole lines. */
function listRows(defs: FieldDef[], before: Fields[], after: Fields[], key: ((f: Fields) => string) | null, areas: Map<string, string>, name: string): DiffRow[] {
  const line = (f: Fields) => summary(defs, f, areas);
  if (key) {
    const old = new Map(before.map((f) => [key(f), f]));
    const rows: DiffRow[] = after.map((f) => {
      const prev = old.get(key(f));
      old.delete(key(f));
      const label = `${name} ${String(f.code ?? "")}`;
      if (!prev) return { label, before: "", after: line(f), changed: true };
      // An existing row: list only the fields that changed, so the change is easy to see.
      const changes = defs
        .map((d) => [d.label, show(d, prev[d.key], areas), show(d, f[d.key], areas)] as const)
        .filter(([, b, a]) => b !== a);
      if (!changes.length) return { label, before: line(prev), after: line(f), changed: false };
      return {
        label,
        before: changes.map(([l, b]) => `${l}: ${b || "—"}`).join(" · "),
        after: changes.map(([l, , a]) => `${l}: ${a || "—"}`).join(" · "),
        changed: true,
      };
    });
    for (const [k, f] of old) rows.push({ label: `${name} ${k}`, before: line(f), after: "(اتشال)", changed: true });
    return rows;
  }
  const b = before.map(line);
  const a = after.map(line);
  return [
    ...a.map((l) => ({ label: name, before: b.includes(l) ? l : "", after: l, changed: !b.includes(l) })),
    ...b.filter((l) => !a.includes(l)).map((l) => ({ label: name, before: l, after: "(اتشال)", changed: true })),
  ];
}

export async function projectReview(projectId: string | null, draft: ProjectDraft) {
  const [areasList, live] = await Promise.all([
    db.area.findMany({ select: { id: true, nameAr: true } }),
    projectId ? db.project.findUnique({ where: { id: projectId }, include: projectInclude }) : null,
  ]);
  const areas = new Map(areasList.map((a) => [a.id, a.nameAr]));
  const before = live ? draftFromProject(live) : null;
  // A renamed unit type keeps its live id, so it shows as a change rather than removed + added.
  const code = (f: Fields) => (typeof f.liveId === "string" && f.liveId) || String(f.code ?? "").trim().toLowerCase();

  const sections: DiffSection[] = [
    { title: "بيانات المشروع", rows: fieldRows(ALL_PROJECT_FIELDS.filter((d) => d.type !== "image"), before?.project ?? null, draft.project, areas) },
    { title: "نماذج الوحدات", rows: listRows(TYPOLOGY_FIELDS, before?.typologies ?? [], draft.typologies, code, areas, "نموذج") },
    { title: "أنظمة السداد", rows: listRows(PLAN_FIELDS, before?.plans ?? [], draft.plans, null, areas, "نظام") },
    { title: "المسافات", rows: listRows(DISTANCE_FIELDS, before?.distances ?? [], draft.distances, null, areas, "مسافة") },
  ];

  const beforeUrls = new Set([...(before?.media.map((m) => m.url) ?? []), ...(before?.project.masterPlanUrl ? [String(before.project.masterPlanUrl)] : [])]);
  const afterUrls = [...draft.media.map((m) => m.url), ...(draft.project.masterPlanUrl ? [String(draft.project.masterPlanUrl)] : [])];
  const media: MediaDiff = {
    added: afterUrls.filter((u) => !beforeUrls.has(u)),
    kept: afterUrls.filter((u) => beforeUrls.has(u)),
    removed: [...beforeUrls].filter((u) => !afterUrls.includes(u)),
  };
  const labels = new Map(draft.media.map((m) => [m.url, [PORTAL_MEDIA_KINDS.find((k) => k.value === m.kind)?.label, PORTAL_PHOTO_GROUPS.find((g) => g.value === m.group)?.label].filter(Boolean).join(" · ")]));
  if (draft.project.masterPlanUrl) labels.set(String(draft.project.masterPlanUrl), "الماستر بلان");

  // Live unit types the draft drops, with how many units go with them.
  let unitsLost: { code: string; units: number }[] = [];
  if (live) {
    const matches = matchTypologies(
      live.typologies.map((t) => ({ id: t.id, code: t.code })),
      draft.typologies.map((t) => ({ code: String(t.code ?? "").trim(), liveId: typeof t.liveId === "string" && t.liveId ? t.liveId : null })),
    );
    const kept = new Set(matches.values());
    const dropped = live.typologies.filter((t) => !kept.has(t.id));
    if (dropped.length) {
      const counts = await db.unit.groupBy({ by: ["typologyId"], where: { typologyId: { in: dropped.map((t) => t.id) } }, _count: { _all: true } });
      unitsLost = dropped
        .map((t) => ({ code: t.code, units: counts.find((c) => c.typologyId === t.id)?._count._all ?? 0 }))
        .filter((t) => t.units > 0);
    }
  }

  return { sections, media, mediaLabels: Object.fromEntries(labels), live: live ? { slug: live.slug, published: live.published } : null, unitsLost };
}

export async function profileReview(developerId: string, draft: ProfileDraft) {
  const dev = await db.developer.findUniqueOrThrow({ where: { id: developerId } });
  const before = draftFromDeveloper(dev);
  const rows = fieldRows(ALL_PROFILE_FIELDS.filter((d) => d.type !== "image"), before.profile, draft.profile, new Map());
  const media: MediaDiff = { added: [], removed: [], kept: [] };
  const a = String(draft.profile.logoUrl ?? "");
  const b = String(before.profile.logoUrl ?? "");
  if (a && a === b) media.kept.push(a);
  else {
    if (a) media.added.push(a);
    if (b) media.removed.push(b);
  }
  return {
    sections: [{ title: "بيانات الشركة", rows }],
    media,
    mediaLabels: { [a]: "الشعار", [b]: "الشعار" } as Record<string, string>,
    live: null as { slug: string; published: boolean } | null,
  };
}
