"use client";

import { useActionState, useEffect, useLayoutEffect, useRef, useState, startTransition, type ReactNode } from "react";
import type { FormState } from "@/lib/admin/form";

type Action = (prev: FormState, data: FormData) => Promise<FormState>;

/**
 * A form wired to a server action. Submits without React's automatic reset, so typed values
 * stay put when validation fails. Field errors are shown next to inputs by name.
 */
export function AdminForm({ secret = false, ...props }: FormProps) {
  const [epoch, setEpoch] = useState(0);
  if (!secret) return <FormBody {...props} />;
  // With `secret`, the form starts over (state, message and the value shown once) when its page is
  // hidden: with cacheComponents a page left behind stays mounted, and so would the password.
  return <FormBody key={epoch} {...props} onHide={() => setEpoch((e) => e + 1)} />;
}

type FormProps = {
  action: Action;
  children: ReactNode;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  className?: string;
  /** The reply carries a value shown once (a temporary password): clear it when the page is hidden. */
  secret?: boolean;
  /** Ask before submitting (a window.confirm), for actions that can't be undone. */
  confirmText?: string;
};

function FormBody({
  action,
  children,
  submitLabel = "حفظ",
  resetOnSuccess = false,
  className = "",
  confirmText,
  onHide,
}: Omit<FormProps, "secret"> & { onHide?: () => void }) {
  const [state, dispatch, pending] = useActionState(action, {});
  const [copied, setCopied] = useState(false);

  // Once a secret has been shown, drop the form's state when Activity hides the page (or on unmount).
  // Not before: StrictMode runs effect cleanups on mount in development, which would loop.
  const shown = useRef(false);
  useEffect(() => {
    if (state.secret) shown.current = true;
  }, [state.secret]);
  useLayoutEffect(
    () => () => {
      if (shown.current) {
        shown.current = false;
        onHide?.();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const ref = useRef<HTMLFormElement>(null);

  // Mark invalid fields and show their messages.
  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    form.querySelectorAll("[data-error-for]").forEach((el) => (el.textContent = ""));
    form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    for (const [name, message] of Object.entries(state.errors ?? {})) {
      const out = form.querySelector(`[data-error-for="${CSS.escape(name)}"]`);
      if (out) out.textContent = message;
      form.querySelectorAll(`[name="${CSS.escape(name)}"]`).forEach((el) => el.setAttribute("aria-invalid", "true"));
    }
    if (state.ok && resetOnSuccess) form.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      // Before hydration the browser posts straight to the server action;
      // after it, onSubmit below takes over.
      action={dispatch}
      noValidate
      className={`flex flex-col gap-4 ${className}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmText && !window.confirm(confirmText)) return;
        setCopied(false);
        const data = new FormData(e.currentTarget);
        startTransition(() => dispatch(data));
      }}
    >
      {children}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className="admin-btn">
          {pending ? "جارٍ الحفظ…" : submitLabel}
        </button>
        <p role="status" aria-live="polite" className={`text-sm ${state.ok ? "text-brand" : "text-red-700 dark:text-red-300"}`}>
          {!pending && state.message}
        </p>
      </div>
      {!pending && state.secret && (
        <div className="flex flex-wrap items-center gap-3">
          <code dir="ltr" className="select-all rounded bg-ground px-2 py-1 text-base">
            {state.secret}
          </code>
          <button
            type="button"
            className="admin-btn-ghost"
            onClick={() => {
              navigator.clipboard?.writeText(state.secret ?? "").then(
                () => setCopied(true),
                () => {},
              );
            }}
          >
            {copied ? "اتنسخ" : "نسخ"}
          </button>
        </div>
      )}
    </form>
  );
}

/** A small form with one button that runs a delete action after a confirm(). */
export function DeleteButton({
  action,
  fields,
  confirmText = "حذف نهائي؟ لا يمكن التراجع.",
  label = "حذف",
}: {
  action: (data: FormData) => Promise<void>;
  fields: Record<string, string>;
  confirmText?: string;
  label?: string;
}) {
  return <ConfirmForm action={action} fields={fields} confirmText={confirmText} label={label} className="admin-btn-danger" />;
}

/** A small form for a status toggle; asks first when `confirmText` is set. */
export function ConfirmForm({
  action,
  fields,
  confirmText,
  label,
  className,
}: {
  action: (data: FormData) => Promise<void>;
  fields: Record<string, string>;
  confirmText?: string;
  label: string;
  className: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (confirmText && !window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className={className}>
        {label}
      </button>
    </form>
  );
}
