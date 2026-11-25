// Which existing payment plan each row of the Excel plans sheet updates. Plans have no id column, so
// a row is recognised by its project and unit type, then by its schedule or its terms. Pure, so it is
// tested; the import's preview counts and its save both use it, so they agree.

export type PlanCandidate = {
  id: string;
  projectId: string;
  typologyId: string | null;
  downPaymentPct: number;
  years: number;
  frequency: string;
  /** The plan's schedule in the notation; "" for a plan paid by its terms. */
  steps: string;
};

export type PlanWanted = {
  /** Null for a project the sheet creates. */
  projectId: string | null;
  /** Undefined for a unit type the sheet creates: no existing plan can be its. */
  typologyId: string | null | undefined;
  downPaymentPct: number;
  years: number;
  frequency: string;
  /** The row's schedule ("" for none), or null when the sheet has no schedule column (an old template). */
  steps: string | null;
};

const sameTerms = (a: PlanWanted, b: PlanCandidate) => a.downPaymentPct === b.downPaymentPct && a.years === b.years && a.frequency === b.frequency;

/**
 * The existing plan each row updates, or null for a new plan. Candidates are tried in the order given
 * (oldest first), and no plan is claimed by two rows.
 * 1. A row with a schedule takes the plan with the same schedule (its terms come from it); a row
 *    without one takes a plan without one and the same terms; on an old template, the terms decide.
 * 2. A row still unmatched (its schedule was edited) takes a plan with the same terms that no row claimed.
 * So two schedules with the same derived terms are two plans, and editing a schedule updates its plan.
 */
export function matchPlans(rows: PlanWanted[], existing: PlanCandidate[]): (string | null)[] {
  const used = new Set<string>();
  const result: (string | null)[] = rows.map(() => null);
  const take = (i: number, fits: (row: PlanWanted, plan: PlanCandidate) => boolean) => {
    const row = rows[i];
    if (row.projectId === null || row.typologyId === undefined) return;
    const plan = existing.find((p) => !used.has(p.id) && p.projectId === row.projectId && p.typologyId === row.typologyId && fits(row, p));
    if (plan) {
      used.add(plan.id);
      result[i] = plan.id;
    }
  };
  rows.forEach((_, i) =>
    take(i, (row, plan) => (row.steps === null ? sameTerms(row, plan) : row.steps ? plan.steps === row.steps : !plan.steps && sameTerms(row, plan))),
  );
  rows.forEach((row, i) => {
    if (result[i] === null && row.steps !== null) take(i, sameTerms);
  });
  return result;
}
