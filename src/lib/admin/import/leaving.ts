import { projectLeavesSales } from "@/lib/sales/scope";
import type { AvailabilityValue } from "@/lib/sales/holds";

// What a checked workbook takes out of AqarArena Sales when it is saved, so the import can warn about
// the temporary holds that saving will release. Only rows for things already on the site count: a new
// project, type or unit has no holds yet. Pure, so it is unit-tested; the save itself releases holds by
// what the database then says (hold-service.ts releaseHoldsOfUnavailable and releaseHoldsOutOfSales).

export type LeavingInput = {
  /** Project rows: the project's developer (slug) and publishing before, and what the row sets. `published` undefined = no such column. */
  projects?: { before?: { id: string; developer: string; published: boolean }; developer: string; published?: boolean }[];
  /** Unit type rows: the existing type's id, and the starting price the row sets. */
  types?: { existingId?: string; priceFrom: number | null }[];
  /** Unit rows: the existing unit's id, and the status the row sets. */
  units?: { existingId?: string; availability: AvailabilityValue }[];
};

export type Leaving = { projectIds: string[]; typeIds: string[]; unitIds: string[] };

export function leavingSales({ projects = [], types = [], units = [] }: LeavingInput): Leaving {
  return {
    projectIds: projects.flatMap((p) => (p.before && projectLeavesSales(p.before, p) ? [p.before.id] : [])),
    typeIds: types.flatMap((t) => (t.existingId && t.priceFrom === null ? [t.existingId] : [])),
    unitIds: units.flatMap((u) => (u.existingId && u.availability !== "AVAILABLE" ? [u.existingId] : [])),
  };
}

/** True when nothing leaves. */
export const nothingLeaves = (l: Leaving) => !l.projectIds.length && !l.typeIds.length && !l.unitIds.length;
