"use client";

import { useEffect, useRef, useState } from "react";
import { countAr, type CountNoun } from "@/lib/format";
import { SCHEDULE_HINT, parseSteps } from "@/lib/catalog/plan-steps";

const PAYMENTS: CountNoun = { one: "دفعة", two: "دفعتين", few: "دفعات" };
const MONTHS: CountNoun = { one: "شهر", two: "شهرين", few: "شهور" };

/** A share in Arabic digits, like the rest of the preview: "٢٫٩٠٣٢٢٦٪". */
const pctAr = (pct: number) => `${pct.toLocaleString("ar-EG", { maximumFractionDigits: 6 })}٪`;

/** How to type a schedule, with its (Latin) example kept left to right. */
export function ScheduleHint() {
  return (
    <span className="text-xs text-muted">
      {SCHEDULE_HINT.before} <bdi dir="ltr">{SCHEDULE_HINT.example}</bdi>. {SCHEDULE_HINT.after}
    </span>
  );
}

/**
 * What the typed schedule means, or what's wrong with it, announced as it changes. Shared by the
 * admin form and the portal editor; while it shows a mistake, the field leaves out the server's copy.
 */
export function SchedulePreview({ text }: { text: string }) {
  const { steps, error } = text.trim() ? parseSteps(text) : { steps: [], error: null };
  let content = null;
  if (error) content = <span className="text-red-700 dark:text-red-300">{error}</span>;
  else if (steps.length) {
    const pay = steps.filter((s) => s.kind === "PAYMENT");
    const care = steps.filter((s) => s.kind === "MAINTENANCE");
    const first = pay[0].monthOffset;
    const down = pay.filter((s) => s.monthOffset === first).reduce((sum, s) => sum + s.pct, 0);
    const last = pay.at(-1)!.monthOffset;
    content = (
      <>
        ✓ {countAr(pay.length, PAYMENTS)}، {first === 0 ? "المقدم" : `أول دفعة بعد ${countAr(first, MONTHS)}`} {pctAr(down)}،{" "}
        {last === 0 ? "كله عند التعاقد" : `آخر دفعة بعد ${countAr(last, MONTHS)}`}
        {care.length > 0 && <>، والصيانة على {countAr(care.length, PAYMENTS)}</>}
      </>
    );
  }
  return (
    <span aria-live="polite" className="text-xs text-muted">
      {content}
    </span>
  );
}

/** True when the preview is already showing what's wrong with this text. */
export const previewShowsError = (text: string) => Boolean(text.trim() && parseSteps(text).error);

/** Shared by the admin and the portal: a schedule is typed in Latin characters, without spelling help. */
export const SCHEDULE_INPUT = { dir: "ltr", rows: 2, spellCheck: false, autoComplete: "off", className: "admin-input font-mono" } as const;

/**
 * The plan's custom schedule in the notation, with a live check under it. The server's message fills
 * the error slot, like the other admin fields, unless the live check already says the same.
 * Uncontrolled, so the add form's reset empties it.
 */
export function ScheduleField({ name, defaultValue = "" }: { name: string; defaultValue?: string }) {
  const [text, setText] = useState(defaultValue);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const form = ref.current?.form;
    const reset = () => setText(defaultValue);
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [defaultValue]);
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink">جدول سداد مخصص</span>
      <textarea ref={ref} name={name} {...SCHEDULE_INPUT} defaultValue={defaultValue} onChange={(e) => setText(e.target.value)} />
      <SchedulePreview text={text} />
      <ScheduleHint />
      <span data-error-for={name} className={`text-xs text-red-700 empty:hidden dark:text-red-300 ${previewShowsError(text) ? "hidden" : ""}`} />
    </label>
  );
}
