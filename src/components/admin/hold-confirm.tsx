"use client";

import type { ReactNode } from "react";

/**
 * Wraps a unit form whose unit has a live Sales hold. Asks before submitting only when the chosen
 * status (the form's `availability` field) isn't AVAILABLE, since that is what cancels the hold.
 */
export function HoldConfirm({ message, children }: { message?: string; children: ReactNode }) {
  return (
    <div
      onSubmitCapture={(e) => {
        const status = new FormData(e.target as HTMLFormElement).get("availability");
        if (message && status !== "AVAILABLE" && !window.confirm(message)) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      {children}
    </div>
  );
}
