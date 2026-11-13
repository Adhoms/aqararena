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
