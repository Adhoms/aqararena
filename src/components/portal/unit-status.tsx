"use client";

import { useState, useTransition } from "react";
import { setPortalUnitStatus } from "@/app/portal/unit-actions";

const STATUSES = [
  ["AVAILABLE", "متاحة"],
  ["RESERVED", "محجوزة"],
  ["SOLD", "مباعة"],
] as const;

/** Changes a unit's status from the table; the sales team sees the change right away. */
export function UnitStatusSelect({ unitId, value, label }: { unitId: string; value: string; label: string }) {
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
          const before = current;
          setCurrent(next);
          setNote("");
          start(async () => {
            const res = await setPortalUnitStatus(unitId, next);
            if (res.ok) setNote("✓");
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
      <span aria-live="polite" className={`text-xs ${note === "✓" ? "text-brand" : "text-red-700"}`}>
        {pending ? "…" : note}
      </span>
    </span>
  );
}
