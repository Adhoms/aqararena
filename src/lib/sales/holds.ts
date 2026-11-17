import type { FormReader } from "@/lib/admin/form";

// Rules for temporary holds (spec section 6) as pure functions, so they are unit-tested.
// The database allows one ACTIVE hold per unit; these decide who may do what and whether a hold
// still counts. A hold is "live" while ACTIVE and its time hasn't run out. Nothing runs on a
// schedule: an expired hold just isn't live, and is marked RELEASED the next time it is touched.

export const HOLD_HOURS_MIN = 1;
export const HOLD_HOURS_MAX = 168;
export const DEFAULT_HOLD_HOURS = 48;

export type HoldStatusValue = "ACTIVE" | "CONVERTED" | "RELEASED";
export type HoldReleaseReasonValue = "EXPIRED" | "CANCELLED" | "PORTAL_STATUS_CHANGE" | "ADMIN_STATUS_CHANGE";
export type AvailabilityValue = "AVAILABLE" | "RESERVED" | "SOLD";

/** The signed-in salesperson. */
export type HoldActor = { id: string; role: "AGENT" | "LEAD"; developerId: string };

/** What the rules need to know about a hold. `developerId` is the developer of the held unit. */
export type HoldFacts = { salesAccountId: string; developerId: string; status: HoldStatusValue; expiresAt: Date };

const inRange = (n: number | null | undefined): n is number =>
  typeof n === "number" && Number.isInteger(n) && n >= HOLD_HOURS_MIN && n <= HOLD_HOURS_MAX;

/** How long a new hold lasts: the project's own setting, else the developer's, else 48 hours. */
export function effectiveHoldHours(projectHours: number | null | undefined, developerHours: number | null | undefined): number {
  if (inRange(projectHours)) return projectHours;
  if (inRange(developerHours)) return developerHours;
  return DEFAULT_HOLD_HOURS;
}

export const holdExpiry = (from: Date, hours: number) => new Date(from.getTime() + hours * 60 * 60 * 1000);

/** Still holding the unit: ACTIVE and its time not yet up. */
export const isHoldLive = (hold: Pick<HoldFacts, "status" | "expiresAt">, now = new Date()) =>
  hold.status === "ACTIVE" && hold.expiresAt.getTime() > now.getTime();

/** Only the salesperson who holds it can turn a live hold into a reservation. */
export const canConvertHold = (actor: HoldActor, hold: HoldFacts, now = new Date()) =>
  isHoldLive(hold, now) && hold.developerId === actor.developerId && hold.salesAccountId === actor.id;

/** The holder, or a team lead of the same developer, can cancel a live hold. */
export const canCancelHold = (actor: HoldActor, hold: HoldFacts, now = new Date()) =>
  isHoldLive(hold, now) && hold.developerId === actor.developerId && (hold.salesAccountId === actor.id || actor.role === "LEAD");

/** What a salesperson sees for a unit. HELD = available, with a live hold on it. */
export const SALES_STATES = ["AVAILABLE", "HELD", "RESERVED", "SOLD"] as const;
export type SalesState = (typeof SALES_STATES)[number];

/** Search order: available first, then held, reserved and sold. */
export const SALES_STATE_RANK: Record<SalesState, number> = { AVAILABLE: 0, HELD: 1, RESERVED: 2, SOLD: 3 };

export const salesState = (availability: AvailabilityValue, held: boolean): SalesState =>
  availability === "AVAILABLE" && held ? "HELD" : availability;

/** Reads an hours field (whole hours, 1 to 168). Empty reads as null, and is an error only when required. */
export function readHoldHours(f: FormReader, name: string, { required = false } = {}): number | null {
  const hours = f.int(name, { required, min: HOLD_HOURS_MIN, max: HOLD_HOURS_MAX });
  if (f.errors[name] && f.errors[name] !== "هذا الحقل مطلوب") f.errors[name] = `اكتب عدد ساعات صحيح من ${HOLD_HOURS_MIN} لـ ${HOLD_HOURS_MAX}`;
  return hours;
}
