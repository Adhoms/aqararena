import "server-only";
import { db } from "@/lib/db";

/** Another unit of the project with the same building and number (case ignored), if any. */
export function findTwinUnit(projectId: string, building: string | null, unitNumber: string, exceptId?: string | null) {
  return db.unit.findFirst({
    where: {
      typology: { projectId },
      unitNumber: { equals: unitNumber, mode: "insensitive" },
      building: building ? { equals: building, mode: "insensitive" } : null,
      ...(exceptId && { NOT: { id: exceptId } }),
    },
    select: { id: true },
  });
}

/**
 * The zone, when it is one of the project's own (a unit can only sit in its project's master plan):
 * null for no zone, false for a zone of another project or one that is gone.
 */
export async function zoneOfProject(projectId: string, zoneId: string | null): Promise<string | null | false> {
  if (!zoneId) return null;
  const zone = await db.masterPlanZone.findFirst({ where: { id: zoneId, projectId }, select: { id: true } });
  return zone ? zone.id : false;
}
