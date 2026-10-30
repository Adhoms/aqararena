"use client";

import { useActionState, useEffect, useRef, startTransition, type ReactNode } from "react";
import type { FormState } from "@/lib/admin/form";

type Action = (prev: FormState, data: FormData) => Promise<FormState>;

/**
 * A form wired to a server action. Submits without React's automatic reset, so typed values
 * stay put when validation fails. Field errors are shown next to inputs by name.
 */
export function AdminForm({
  action,
  children,
  submitLabel = "حفظ",
  resetOnSuccess = false,
  className = "",
}: {
  action: Action;
  children: ReactNode;
  submitLabel?: string;
  resetOnSuccess?: boolean;
  className?: string;
}) {
  const [state, dispatch, pending] = useActionState(action, {});
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
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(confirmText)) e.preventDefault();
      }}
    >
      {Object.entries(fields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <button type="submit" className="admin-btn-danger">
        {label}
      </button>
    </form>
  );
}
