"use client";

import { useEffect, useRef, useState } from "react";
import { countAr, type CountNoun } from "@/lib/format";
import { SCHEDULE_HINT, formatPct, parseSteps } from "@/lib/catalog/plan-steps";

const PAYMENTS: CountNoun = { one: "دفعة", two: "دفعتين", few: "دفعات" };
const MONTHS: CountNoun = { one: "شهر", two: "شهرين", few: "شهور" };

/** What the typed schedule means, or what's wrong with it. Shared by the admin form and the portal editor. */
export function SchedulePreview({ text }: { text: string }) {
  if (!text.trim()) return null;
  const { steps, error } = parseSteps(text);
  if (error) return <span className="text-xs text-red-700 dark:text-red-300">{error}</span>;
  const pay = steps.filter((s) => s.kind === "PAYMENT");
  const care = steps.filter((s) => s.kind === "MAINTENANCE");
  const down = pay.filter((s) => s.monthOffset === 0).reduce((sum, s) => sum + s.pct, 0);
  const last = pay.at(-1)!.monthOffset;
  return (
    <span className="text-xs text-muted">
      ✓ {countAr(pay.length, PAYMENTS)}، المقدم <bdi dir="ltr">{formatPct(down)}%</bdi>، {last === 0 ? "كله عند التعاقد" : `آخر دفعة بعد ${countAr(last, MONTHS)}`}
      {care.length > 0 && <>، والصيانة على {countAr(care.length, PAYMENTS)}</>}
    </span>
  );
}

/**
 * The plan's custom schedule in the notation, with a live check under it. The server's message fills
 * the error slot, like the other admin fields. Uncontrolled, so the add form's reset empties it.
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
      <textarea ref={ref} name={name} className="admin-input font-mono" dir="ltr" rows={2} defaultValue={defaultValue} onChange={(e) => setText(e.target.value)} />
      <SchedulePreview text={text} />
      <span className="text-xs text-muted">{SCHEDULE_HINT}</span>
      <span data-error-for={name} className="text-xs text-red-700 empty:hidden dark:text-red-300" />
    </label>
  );
}
