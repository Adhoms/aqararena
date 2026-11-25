import { countAr, formatCountAr, type CountNoun } from "@/lib/format";
import type { InstallmentFrequency } from "@/lib/property";

// A plan's custom payment schedule (spec section 4) and the short notation developers type it in,
// the same in the admin, the portal and Excel:
//
//   0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100
//
// "M:P" is P% at month M after the contract (0 = at contract). "A-B/S:T" spreads T% evenly over months
// A, A+S, …, B. An entry starting with «صيانة» (or "maintenance") is a share of the maintenance deposit
// instead of the unit price. Payments must add up to exactly 100%, maintenance to 100% or nothing.
// Percentages keep 6 decimals and are added in millionths, so the sums are exact. Pure, so it is tested.

export const STEP_KINDS = ["PAYMENT", "MAINTENANCE"] as const;
export type StepKind = (typeof STEP_KINDS)[number];
export type PlanStepInput = { monthOffset: number; pct: number; kind: StepKind };

export const MAX_STEP_MONTH = 360;
export const MAX_STEPS = 400;
/** The longest schedule text read; longer text is refused before any work. */
export const MAX_SCHEDULE_LENGTH = 5000;

/** Help under the schedule field, in the admin and the portal. The example is Latin text: show it in `<bdi dir="ltr">`. */
export const SCHEDULE_HINT = {
  before: "اختياري، لو الخطة مش أقساط متساوية. اكتب الشهر:النسبة مفصولين بفاصلة، و«من-لحد/كل:النسبة» لدفعات متساوية، و«صيانة» قبل دفعات الصيانة. مثال:",
  example: "0:5, 3:5, 6-96/3:90, صيانة 9-33/12:100",
  after: "لو كتبته، المقدم والسنين ونوع الأقساط بيتحسبوا منه.",
};

const PAYMENTS: CountNoun = { one: "دفعة", two: "دفعتين", few: "دفعات" };
const MONTHS: CountNoun = { one: "شهر", two: "شهرين", few: "شهور" };

const SCALE = 1_000_000;
const HUNDRED = 100 * SCALE;
const units = (pct: number) => Math.round(pct * SCALE);
const pctOf = (u: number) => u / SCALE;
const sumUnits = (steps: PlanStepInput[]) => steps.reduce((sum, s) => sum + units(s.pct), 0);

/** `total`% over `count` steps: each the same share rounded to 6 decimals, the last takes what is left. */
export function spreadEvenly(total: number, count: number): number[] {
  const t = units(total);
  const each = Math.round(t / count);
  return Array.from({ length: count }, (_, i) => pctOf(i === count - 1 ? t - each * (count - 1) : each));
}

/** A percentage as written back: up to 6 decimals, no trailing zeros ("2.903226", "5"). */
export const formatPct = (pct: number) => String(Number(pct.toFixed(6)));

/** Payments first, then maintenance, each by month. */
export const sortSteps = (steps: PlanStepInput[]) =>
  [...steps].sort((a, b) => (a.kind === b.kind ? a.monthOffset - b.monthOffset : a.kind === "PAYMENT" ? -1 : 1));

/**
 * Western digits, "." for decimals, "%" and "-" as typed on any keyboard; Arabic commas, semicolons and
 * new lines separate entries. Direction marks (pasted from Arabic text) are dropped.
 */
const normalise = (text: string) =>
  text
    .replace(/[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\u066b/g, ".")
    .replace(/\u066a/g, "%")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u060c\u061b;\r\n]/g, ",");

const ENTRY = /^(?:((?:ال)?صيان[ةه]|maintenance)\s*)?(\d+)(?:\s*-\s*(\d+)\s*\/\s*(\d+))?\s*:\s*(\d+(?:\.\d+)?)\s*%?$/i;

export type StepsResult = { steps: PlanStepInput[]; error: string | null };

/** Reads the notation. Empty text is no custom schedule; any mistake is explained in Arabic. */
export function parseSteps(text: string): StepsResult {
  const fail = (error: string): StepsResult => ({ steps: [], error });
  if (text.length > MAX_SCHEDULE_LENGTH) return fail(`الجدول أطول من ${formatCountAr(MAX_SCHEDULE_LENGTH)} حرف`);
  const tooMany = `الجدول فيه أكتر من ${formatCountAr(MAX_STEPS)} دفعة`;
  const steps: PlanStepInput[] = [];
  for (const raw of normalise(text).split(",")) {
    const entry = raw.trim();
    if (!entry) continue;
    const m = ENTRY.exec(entry);
    if (!m) return fail(`مش فاهم «${entry}». اكتب الشهر:النسبة زي 0:10، أو من-لحد/كل:النسبة زي 3-96/3:90`);
    if ((m[5].split(".")[1] ?? "").length > 6) return fail(`النسبة في «${entry}» فيها أكتر من 6 أرقام بعد العلامة`);
    const kind: StepKind = m[1] ? "MAINTENANCE" : "PAYMENT";
    const from = Number(m[2]);
    const pct = Number(m[5]);
    if (m[3] === undefined) {
      if (steps.length + 1 > MAX_STEPS) return fail(tooMany);
      steps.push({ monthOffset: from, pct, kind });
      continue;
    }
    const to = Number(m[3]);
    const every = Number(m[4]);
    if (to > MAX_STEP_MONTH) return fail(`الشهر ${to} في «${entry}» برّه المدى (من 0 لـ ${MAX_STEP_MONTH})`);
    if (every < 1) return fail(`«${entry}»: الفاصل بين الدفعات لازم يبقى شهر أو أكتر`);
    if (to <= from || (to - from) % every !== 0)
      return fail(`«${entry}»: من شهر ${formatCountAr(from)} لشهر ${formatCountAr(to)} كل ${countAr(every, MONTHS)} مش بتيجي مظبوطة`);
    const count = (to - from) / every + 1;
    if (steps.length + count > MAX_STEPS) return fail(`«${entry}» فيها ${countAr(count, PAYMENTS)}، والجدول كله ميزيدش عن ${formatCountAr(MAX_STEPS)} دفعة`);
    const shares = spreadEvenly(pct, count);
    if (shares.some((p) => units(p) <= 0)) return fail(`«${entry}»: النسبة صغيرة على ${countAr(count, PAYMENTS)}`);
    shares.forEach((p, i) => steps.push({ monthOffset: from + i * every, pct: p, kind }));
  }
  const sorted = sortSteps(steps);
  const error = checkSteps(sorted);
  return error ? fail(error) : { steps: sorted, error: null };
}

/** Why these steps can't be saved, or null. No steps at all is fine: the plan has no custom schedule. */
export function checkSteps(steps: PlanStepInput[]): string | null {
  if (steps.length === 0) return null;
  if (steps.length > MAX_STEPS) return `الجدول فيه أكتر من ${formatCountAr(MAX_STEPS)} دفعة`;
  const seen = new Set<string>();
  const sums: Record<StepKind, number> = { PAYMENT: 0, MAINTENANCE: 0 };
  for (const s of steps) {
    if (!Number.isInteger(s.monthOffset) || s.monthOffset < 0 || s.monthOffset > MAX_STEP_MONTH) return `الشهر ${s.monthOffset} برّه المدى (من 0 لـ ${MAX_STEP_MONTH})`;
    const u = units(s.pct);
    if (!(u > 0) || u > HUNDRED) return `النسبة ${formatPct(s.pct)}% لازم تبقى أكبر من صفر ولحد 100`;
    const key = `${s.kind}:${s.monthOffset}`;
    if (seen.has(key)) return `الشهر ${s.monthOffset} متكرر في ${s.kind === "PAYMENT" ? "الدفعات" : "الصيانة"}`;
    seen.add(key);
    sums[s.kind] += u;
  }
  if (sums.PAYMENT !== HUNDRED) return `مجموع الدفعات ${formatPct(pctOf(sums.PAYMENT))}% ولازم يبقى 100%`;
  if (sums.MAINTENANCE !== 0 && sums.MAINTENANCE !== HUNDRED) return `مجموع الصيانة ${formatPct(pctOf(sums.MAINTENANCE))}% ولازم يبقى 100% أو من غير صيانة خالص`;
  return null;
}

/**
 * One kind's steps (sorted by month) as entries, in one pass: a run at a steady gap whose shares are
 * all equal, except perhaps a last one that takes the rounding (what spreadEvenly makes), becomes a
 * range when it has three steps or more.
 */
function entries(list: PlanStepInput[]): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < list.length) {
    let taken = 1;
    if (i + 2 < list.length) {
      const gap = list[i + 1].monthOffset - list[i].monthOffset;
      const share = units(list[i].pct);
      let end = i;
      while (end + 1 < list.length && list[end + 1].monthOffset - list[end].monthOffset === gap && units(list[end + 1].pct) === share) end++;
      taken = end - i + 1;
      // The step after the equal ones may be the run's last, holding the rounding.
      if (end + 1 < list.length && list[end + 1].monthOffset - list[end].monthOffset === gap) {
        const run = list.slice(i, end + 2);
        const even = spreadEvenly(pctOf(sumUnits(run)), run.length);
        if (even.every((p, k) => units(p) === units(run[k].pct))) taken = run.length;
      }
    }
    if (taken >= 3) {
      const run = list.slice(i, i + taken);
      out.push(`${run[0].monthOffset}-${run[taken - 1].monthOffset}/${run[1].monthOffset - run[0].monthOffset}:${formatPct(pctOf(sumUnits(run)))}`);
    } else {
      taken = 1;
      out.push(`${list[i].monthOffset}:${formatPct(list[i].pct)}`);
    }
    i += taken;
  }
  return out;
}

/** The steps in the notation, in its shortest form. */
export function formatSteps(steps: PlanStepInput[]): string {
  const sorted = sortSteps(steps);
  const pay = entries(sorted.filter((s) => s.kind === "PAYMENT"));
  const care = entries(sorted.filter((s) => s.kind === "MAINTENANCE")).map((e) => `صيانة ${e}`);
  return [...pay, ...care].join(", ");
}

const GAP_FREQUENCY: Record<number, InstallmentFrequency> = { 1: "MONTHLY", 3: "QUARTERLY", 6: "SEMI_ANNUAL", 12: "ANNUAL" };

/** The installment frequency the schedule mostly follows: its most common gap of 1, 3, 6 or 12 months (the shorter on a tie). */
function frequencyOf(pay: PlanStepInput[]): InstallmentFrequency | null {
  const gaps = new Map<number, number>();
  for (let i = 1; i < pay.length; i++) {
    const gap = pay[i].monthOffset - pay[i - 1].monthOffset;
    if (GAP_FREQUENCY[gap]) gaps.set(gap, (gaps.get(gap) ?? 0) + 1);
  }
  const best = [...gaps].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
  return best ? GAP_FREQUENCY[best[0]] : null;
}

/**
 * A stepped plan's headline terms, stored on the plan so cards, filters, the budget search and the
 * calculator keep working:
 * - the down payment is the share of the first payment, whatever its month: what the buyer must have
 *   to start ("3:50, 13:50" asks for 50% first, not 0% down);
 * - the term is the last payment's month in years, rounded up;
 * - the frequency is the schedule's most common gap (null when none is 1, 3, 6 or 12 months);
 * - there is no separate delivery payment.
 */
export function termsFromSteps(steps: PlanStepInput[]) {
  const pay = sortSteps(steps.filter((s) => s.kind === "PAYMENT"));
  const first = pay[0]?.monthOffset ?? 0;
  const down = pctOf(sumUnits(pay.filter((s) => s.monthOffset === first)));
  const last = Math.max(0, ...pay.map((s) => s.monthOffset));
  return { downPaymentPct: Math.round(down * 100) / 100, deliveryPaymentPct: 0, years: Math.ceil(last / 12), frequency: frequencyOf(pay) };
}

/** Rows for `PlanStep`, in order. */
export const toStepRows = (steps: PlanStepInput[]) =>
  sortSteps(steps).map((s, i) => ({ monthOffset: s.monthOffset, pct: s.pct, kind: s.kind, sortOrder: i }));

/** Database rows (Decimal percentages) as steps. */
export const stepsOf = (rows: { monthOffset: number; pct: { toString(): string } | number; kind: StepKind }[]): PlanStepInput[] =>
  sortSteps(rows.map((r) => ({ monthOffset: r.monthOffset, pct: Number(r.pct), kind: r.kind })));
