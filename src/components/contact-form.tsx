"use client";

import { useActionState, useRef, useEffect } from "react";
import { sendContactMessage, type ContactState } from "@/app/[lang]/contact/actions";

type Labels = {
  kind: string;
  kinds: Record<"SUGGESTION" | "COMPLAINT" | "HELP" | "REQUEST" | "OTHER", string>;
  name: string;
  email: string;
  phone: string;
  message: string;
  messageHint: string;
  send: string;
  sending: string;
  privacy: string;
};

const input =
  "min-h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-[15px] text-ink outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/15 aria-invalid:border-red-600";

/** The contact form: type of message, name, how to reach you, and the message. */
export function ContactForm({ locale, labels, initialKind }: { locale: "ar" | "en"; labels: Labels; initialKind?: string }) {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContactMessage, {});
  const form = useRef<HTMLFormElement>(null);
  const e = state.errors ?? {};

  useEffect(() => {
    if (state.ok) form.current?.reset();
  }, [state]);

  const field = (name: string, label: string, el: React.ReactNode) => (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-ink">{label}</span>
      {el}
      {e[name] && <span className="text-xs text-red-700 dark:text-red-300">{e[name]}</span>}
    </label>
  );

  return (
    <form ref={form} action={action} noValidate className="flex flex-col gap-5">
      <input type="hidden" name="locale" value={locale} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium text-ink">{labels.kind}</legend>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(labels.kinds) as (keyof Labels["kinds"])[]).map((k) => (
            <label key={k} className="cursor-pointer">
              <input type="radio" name="kind" value={k} defaultChecked={k === (initialKind ?? "HELP")} className="peer sr-only" />
              <span className="inline-flex min-h-10 items-center rounded-full border border-line-strong px-4 text-sm transition-colors peer-checked:border-brand peer-checked:bg-brand peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand/30">
                {labels.kinds[k]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {field("name", labels.name, <input name="name" autoComplete="name" aria-invalid={e.name ? true : undefined} className={input} />)}
      <div className="grid gap-5 sm:grid-cols-2">
        {field("email", labels.email, <input name="email" type="email" dir="ltr" autoComplete="email" aria-invalid={e.email ? true : undefined} className={input} />)}
        {field("phone", labels.phone, <input name="phone" type="tel" dir="ltr" autoComplete="tel" className={input} />)}
      </div>
      {field(
        "message",
        labels.message,
        <textarea name="message" rows={6} placeholder={labels.messageHint} aria-invalid={e.message ? true : undefined} className={`${input} min-h-36 py-3`} />,
      )}
      {/* Left empty by people; filled by bots. */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" disabled={pending} className="inline-flex min-h-12 items-center rounded-full bg-brand px-7 font-medium text-white transition-colors hover:bg-brand-2 disabled:opacity-60">
          {pending ? labels.sending : labels.send}
        </button>
        <p role="status" aria-live="polite" className={`text-sm ${state.ok ? "text-brand" : "text-red-700 dark:text-red-300"}`}>
          {!pending && state.message}
        </p>
      </div>
      <p className="text-xs text-muted">{labels.privacy}</p>
    </form>
  );
}
