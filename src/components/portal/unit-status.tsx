"use client";

import { useState, useTransition } from "react";
import { setPortalUnitStatus } from "@/app/portal/unit-actions";

const STATUSES = [
  ["AVAILABLE", "متاحة"],
  ["RESERVED", "محجوزة"],
  ["SOLD", "مباعة"],
] as const;

/**
 * Changes a unit's status from the table; the sales team sees the change right away. `hold` is
 * "Name until time" when a salesperson holds the unit: changing its status then asks first.
 */
export function UnitStatusSelect({ unitId, value, label, hold }: { unitId: string; value: string; label: string; hold?: string }) {
  const [current, setCurrent] = useState(value);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <select
        aria-label={label}
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          // A live hold ends when the unit stops being available: ask first. Leaving `current` as it
          // was puts the select back.
          if (hold && next !== "AVAILABLE" && !window.confirm(`الوحدة دي محجوزة مؤقتًا لـ ${hold}. لو غيّرت حالتها الحجز هيتلغي. تكمل؟`)) return;
          const before = current;
          setCurrent(next);
          setNote("");
          start(async () => {
            const res = await setPortalUnitStatus(unitId, next);
            if (res.ok) setNote(res.released ? "✓ والحجز اتلغى" : "✓");
            else {
              setCurrent(before);
              setNote("ماتحفظش");
            }
          });
        }}
        className="admin-input w-auto py-1"
      >
        {STATUSES.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
      <span aria-live="polite" className={`text-xs ${note.startsWith("✓") ? "text-brand" : "text-red-700"}`}>
        {pending ? "…" : note}
      </span>
    </span>
  );
}
