import type { ReactNode } from "react";

// Plain inputs for the admin forms. Each has a slot ([data-error-for]) that AdminForm fills
// with the server's message for that field.

type Common = { name: string; label: ReactNode; hint?: ReactNode; className?: string };

function Wrap({ name, label, hint, className = "", children }: Common & { children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
      <span data-error-for={name} className="text-xs text-red-700 empty:hidden dark:text-red-300" />
    </label>
  );
}

type Value = string | number | null | undefined;
const str = (v: Value) => (v === null || v === undefined ? "" : String(v));

export function TextField({
  type = "text",
  defaultValue,
  required,
  dir,
  placeholder,
  step,
  autoComplete,
  ...rest
}: Common & {
  type?: "text" | "number" | "url" | "email" | "tel" | "date" | "password";
  defaultValue?: Value;
  required?: boolean;
  dir?: "ltr" | "rtl";
  placeholder?: string;
  step?: string;
  autoComplete?: string;
}) {
  return (
    <Wrap {...rest}>
      <input
        name={rest.name}
        // Numbers use a text box with a numeric keyboard, so pasted values like "19,500,000"
        // reach the server (which strips the commas) instead of being dropped by the browser.
        type={type === "number" ? "text" : type}
        inputMode={type === "number" ? "decimal" : undefined}
        defaultValue={str(defaultValue)}
        required={required}
        dir={dir ?? (["url", "email", "tel", "number", "date"].includes(type) ? "ltr" : undefined)}
        placeholder={placeholder}
        step={step}
        autoComplete={autoComplete}
        className="admin-input"
      />
    </Wrap>
  );
}

export function TextArea({ defaultValue, dir, rows = 3, ...rest }: Common & { defaultValue?: Value; dir?: "ltr" | "rtl"; rows?: number }) {
  return (
    <Wrap {...rest}>
      <textarea name={rest.name} defaultValue={str(defaultValue)} dir={dir} rows={rows} className="admin-input" />
    </Wrap>
  );
}

export function Select({
  options,
  defaultValue,
  emptyLabel,
  ...rest
}: Common & { options: { value: string; label: string }[]; defaultValue?: Value; emptyLabel?: string }) {
  return (
    <Wrap {...rest}>
      <select name={rest.name} defaultValue={str(defaultValue)} className="admin-input">
        {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function Checkbox({ name, label, defaultChecked }: { name: string; label: ReactNode; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-brand" />
      <span>{label}</span>
    </label>
  );
}

export function CheckboxGroup({
  name,
  label,
  options,
  defaultValues = [],
}: {
  name: string;
  label: ReactNode;
  options: { value: string; label: string }[];
  defaultValues?: readonly string[];
}) {
  return (
    <fieldset className="flex flex-col gap-2 text-sm">
      <legend className="mb-1.5 font-medium text-ink">{label}</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map((o) => (
          <label key={o.value} className="flex items-center gap-1.5">
            <input type="checkbox" name={name} value={o.value} defaultChecked={defaultValues.includes(o.value)} className="size-4 accent-brand" />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
      <span data-error-for={name} className="text-xs text-red-700 empty:hidden dark:text-red-300" />
    </fieldset>
  );
}

/** Responsive grid of fields. */
export function Row({ children, cols = 2 }: { children: ReactNode; cols?: 2 | 3 | 4 }) {
  const c = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[cols];
  return <div className={`grid gap-4 ${c}`}>{children}</div>;
}

export function Panel({ title, children, actions, id }: { title: ReactNode; children: ReactNode; actions?: ReactNode; id?: string }) {
  return (
    <section id={id} className="admin-panel scroll-mt-20">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl">{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
