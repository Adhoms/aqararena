"use client";

import { useActionState } from "react";
import { subscribePriceAlert, type AlertState } from "@/app/[lang]/alerts/actions";

type Labels = { name: string; email: string; phone: string; optional: string; send: string; sending: string; privacy: string };

const input =
  "min-h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-[15px] text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 aria-invalid:border-red-600";

/** Name and email (phone optional) to hear when a project's prices or plans change. */
export function PriceAlertForm({ locale, project, labels }: { locale: "ar" | "en"; project: string; labels: Labels }) {
  const [state, action, pending] = useActionState<AlertState, FormData>(subscribePriceAlert, {});
  const e = state.errors ?? {};

  if (state.ok) {
    return (
      <p role="status" className="rounded-2xl bg-brand/10 px-5 py-4 font-medium text-brand">
        {state.message}
      </p>
    );
  }

  const field = (name: string, label: string, el: React.ReactNode) => (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {el}
      {e[name] && <span className="text-xs text-red-700 dark:text-red-300">{e[name]}</span>}
    </label>
  );

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="project" value={project} />
      <div className="grid gap-4 sm:grid-cols-3">
        {field("name", labels.name, <input name="name" autoComplete="name" required aria-invalid={e.name ? true : undefined} className={input} />)}
        {field(
          "email",
          labels.email,
          <input name="email" type="email" dir="ltr" autoComplete="email" required aria-invalid={e.email ? true : undefined} className={input} />,
        )}
        {field(
          "phone",
          `${labels.phone} (${labels.optional})`,
          <input name="phone" type="tel" dir="ltr" autoComplete="tel" aria-invalid={e.phone ? true : undefined} className={input} />,
        )}
      </div>
      {/* Left empty by people; filled by bots. */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-12 items-center rounded-full bg-brand px-7 font-medium text-white transition-colors hover:bg-brand-2 disabled:opacity-60"
        >
          {pending ? labels.sending : labels.send}
        </button>
        <p role="status" aria-live="polite" className="text-sm text-red-700 dark:text-red-300">
          {!pending && state.message}
        </p>
      </div>
      <p className="text-xs text-muted">{labels.privacy}</p>
    </form>
  );
}
