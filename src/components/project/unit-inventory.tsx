"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { fill } from "@/lib/format";
import { UNIT_AVAILABILITY, type UnitAvailability } from "@/lib/property";

// The project's units one by one, with the status the developer last reported. Rows arrive
// already worded and sorted from the server; this part only filters and pages them.

const SHOW_EVENT = "aqar:show-units";
const PAGE = 12;

export type InventoryRow = {
  id: string;
  /** Unit type code, matched against `models`. */
  model: string;
  modelName: string;
  label: string;
  floor?: string;
  view?: string;
  orientation?: string;
  price?: string;
  availability: UnitAvailability;
};

type Labels = {
  title: string;
  sub: string;
  updated?: string;
  model: string;
  allModels: string;
  all: string;
  unit: string;
  floor: string;
  view: string;
  orientation: string;
  price: string;
  status: string;
  more: string;
  none: string;
  availability: Record<UnitAvailability, string>;
};

const BADGE: Record<UnitAvailability, string> = {
  AVAILABLE: "bg-brand text-white",
  RESERVED: "bg-brass-soft text-brass-dark",
  SOLD: "border border-line-strong text-muted",
};
const BAR: Record<UnitAvailability, string> = { AVAILABLE: "bg-brand", RESERVED: "bg-brass-light", SOLD: "bg-line-strong" };

export function UnitInventory({ rows, models, labels }: { rows: InventoryRow[]; models: { code: string; name: string }[]; labels: Labels }) {
  const id = useId();
  const [model, setModel] = useState("");
  const [status, setStatus] = useState<UnitAvailability | "">("");
  const [shown, setShown] = useState(PAGE);

  // "See the units" on a unit-type card picks that type here.
  useEffect(() => {
    const pick = (event: Event) => {
      setModel((event as CustomEvent<string>).detail);
      setStatus("");
      setShown(PAGE);
    };
    window.addEventListener(SHOW_EVENT, pick);
    return () => window.removeEventListener(SHOW_EVENT, pick);
  }, []);

  const ofModel = model ? rows.filter((r) => r.model === model) : rows;
  const counts = Object.fromEntries(UNIT_AVAILABILITY.map((a) => [a, ofModel.filter((r) => r.availability === a).length])) as Record<UnitAvailability, number>;
  const list = status ? ofModel.filter((r) => r.availability === status) : ofModel;
  const page = list.slice(0, shown);
  const rest = list.length - page.length;

  const chip =
    "press inline-flex min-h-11 items-center gap-1.5 rounded-full border border-line-strong px-4 text-sm aria-pressed:border-brand aria-pressed:bg-brand aria-pressed:text-white";
  const cell = (value: string | undefined, head: string) => (
    <span className={value ? "" : "max-sm:hidden"}>
      {value && <span className="sm:hidden">{head}: </span>}
      {value ?? "-"}
    </span>
  );

  return (
    <section id="inventory" aria-labelledby={`${id}-title`} className="flex flex-col gap-5 rounded-3xl border border-line bg-surface p-5 sm:p-8 print:hidden">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex max-w-2xl flex-col gap-1.5">
          <h3 id={`${id}-title`} className="font-display text-2xl font-medium">
            {labels.title}
          </h3>
          <p className="text-sm text-muted">{labels.sub}</p>
        </div>
        {labels.updated && <span className="text-[13px] text-muted">{labels.updated}</span>}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex h-2.5 overflow-hidden rounded-full bg-divider" aria-hidden="true">
          {UNIT_AVAILABILITY.filter((a) => counts[a] > 0).map((a) => (
            <span key={a} className={BAR[a]} style={{ width: `${(counts[a] / ofModel.length) * 100}%` }} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {models.length > 1 && (
            <label className="flex items-center gap-2 text-sm">
              <span className="sr-only">{labels.model}</span>
              <select
                value={model}
                onChange={(e) => {
                  setModel(e.target.value);
                  setShown(PAGE);
                }}
                className="min-h-11 max-w-full rounded-full border border-line-strong bg-surface px-4 text-sm text-ink focus:border-brand focus:outline-none"
              >
                <option value="">{labels.allModels}</option>
                {models.map((m) => (
                  <option key={m.code} value={m.code}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(["", ...UNIT_AVAILABILITY] as const).map((a) => (
            <button
              key={a || "all"}
              type="button"
              aria-pressed={status === a}
              onClick={() => {
                setStatus(a);
                setShown(PAGE);
              }}
              className={chip}
            >
              {a ? labels.availability[a] : labels.all}
              <span className="text-xs opacity-75">{a ? counts[a] : ofModel.length}</span>
            </button>
          ))}
        </div>
      </div>

      <div aria-live="polite">
        {page.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line-strong px-5 py-6 text-sm text-muted">{labels.none}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col p-0 text-sm">
            <li aria-hidden="true" className="hidden grid-cols-[1.3fr_1.5fr_0.6fr_1fr_1fr_1.1fr_auto] gap-4 border-b border-line px-1 pb-2.5 text-xs font-semibold text-muted sm:grid">
              <span>{labels.unit}</span>
              <span>{labels.model}</span>
              <span>{labels.floor}</span>
              <span>{labels.view}</span>
              <span>{labels.orientation}</span>
              <span>{labels.price}</span>
              <span className="min-w-18 text-end">{labels.status}</span>
            </li>
            {page.map((r) => (
              <li
                key={r.id}
                className={`flex flex-col gap-1.5 border-b border-divider px-1 py-3.5 sm:grid sm:grid-cols-[1.3fr_1.5fr_0.6fr_1fr_1fr_1.1fr_auto] sm:items-center sm:gap-4 ${r.availability === "SOLD" ? "text-muted" : ""}`}
              >
                <span className="flex items-center justify-between gap-3 sm:contents">
                  <span className="font-semibold">{r.label}</span>
                  <span className={`inline-flex min-w-18 justify-center rounded-full px-2.5 py-0.5 text-xs font-semibold sm:order-last ${BADGE[r.availability]}`}>
                    {labels.availability[r.availability]}
                  </span>
                </span>
                <span>{r.modelName}</span>
                <span className="flex flex-wrap gap-x-4 gap-y-0.5 text-muted sm:contents">
                  {cell(r.floor, labels.floor)}
                  {cell(r.view, labels.view)}
                  {cell(r.orientation, labels.orientation)}
                </span>
                <span className="font-display text-[15px] font-medium">{r.price ?? "-"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {rest > 0 && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE * 2)}
          className="press inline-flex min-h-12 items-center justify-center self-center rounded-full border border-line-strong px-6 text-[15px] hover:border-ink"
        >
          {fill(labels.more, { n: Math.min(rest, PAGE * 2) })}
        </button>
      )}
    </section>
  );
}

/** On a unit-type card: jumps to the inventory with that type picked. */
export function ShowUnitsLink({ code, children, className = "" }: { code: string; children: ReactNode; className?: string }) {
  return (
    <a href="#inventory" onClick={() => window.dispatchEvent(new CustomEvent(SHOW_EVENT, { detail: code }))} className={className}>
      {children}
    </a>
  );
}
