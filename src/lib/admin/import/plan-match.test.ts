import assert from "node:assert/strict";
import { test } from "node:test";
import { matchPlans, type PlanCandidate, type PlanWanted } from "./plan-match";

const terms = { downPaymentPct: 5, years: 8, frequency: "QUARTERLY" };
const existing = (id: string, steps: string, over: Partial<PlanCandidate> = {}): PlanCandidate => ({ id, projectId: "p", typologyId: null, ...terms, steps, ...over });
const row = (steps: string | null, over: Partial<PlanWanted> = {}): PlanWanted => ({ projectId: "p", typologyId: null, ...terms, steps, ...over });

const A = "0:5, 3:5, 6-96/3:90";
const B = "0:5, 6-96/6:95";

test("two schedules with the same derived terms are two plans", () => {
  assert.deepEqual(matchPlans([row(A), row(B)], [existing("a", A)]), ["a", null]);
  assert.deepEqual(matchPlans([row(B), row(A)], [existing("a", A)]), [null, "a"], "the row with the plan's own schedule wins, whatever the order");
  assert.deepEqual(matchPlans([row(A), row(B)], [existing("a", A), existing("b", B)]), ["a", "b"]);
});

test("no plan is claimed twice, oldest first", () => {
  assert.deepEqual(matchPlans([row(""), row("")], [existing("old", ""), existing("new", "")]), ["old", "new"]);
  assert.deepEqual(matchPlans([row(""), row(""), row("")], [existing("old", "")]), ["old", null, null]);
});

test("an edited schedule updates its plan", () => {
  assert.deepEqual(matchPlans([row(B)], [existing("a", A)]), ["a"]);
  assert.deepEqual(matchPlans([row(A), row("0:5, 3-96/3:95")], [existing("a", A), existing("b", B)]), ["a", "b"]);
});

test("an old template (no schedule column) matches by terms", () => {
  assert.deepEqual(matchPlans([row(null)], [existing("a", A)]), ["a"]);
  assert.deepEqual(matchPlans([row(null, { years: 7 })], [existing("a", A)]), [null]);
});

test("a plan paid by its terms isn't taken by a schedule's row in the first pass", () => {
  assert.deepEqual(matchPlans([row(""), row(A)], [existing("flat", ""), existing("a", A)]), ["flat", "a"]);
  assert.deepEqual(matchPlans([row(A), row("")], [existing("flat", ""), existing("a", A)]), ["a", "flat"]);
});

test("new projects and unit types match nothing; unit types and projects are kept apart", () => {
  assert.deepEqual(matchPlans([row(A, { projectId: null }), row(A, { typologyId: undefined })], [existing("a", A)]), [null, null]);
  assert.deepEqual(matchPlans([row(A, { typologyId: "t1" })], [existing("a", A)]), [null]);
  assert.deepEqual(matchPlans([row(A, { projectId: "q" })], [existing("a", A)]), [null]);
});
