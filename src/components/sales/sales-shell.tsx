import type { ReactNode } from "react";
import Link from "next/link";
import { SalesNav } from "@/components/sales/sales-nav";
import { salesLogout } from "@/app/sales/actions";
import { ROLE_LABELS } from "@/lib/sales/fields";
import type { SalesUser } from "@/lib/sales/session";

const brand = (
  <span dir="ltr" className="font-display text-lg tracking-[0.18em] text-ink">
    AQAR <span className="font-light text-brass">ARENA</span>
    <span className="ms-2 rounded-full bg-brand px-2 py-0.5 align-middle font-sans text-[11px] font-medium tracking-normal text-white">Sales</span>
  </span>
);

/** Header and frame for every signed-in /sales page. */
export function SalesShell({ me, title, children, actions }: { me: SalesUser; title: ReactNode; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="sm:sticky sm:top-0 z-20 border-b border-line bg-ground/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link href="/sales" className="no-underline">
            {brand}
          </Link>
          <span className="admin-badge">{me.developer.nameAr}</span>
          <nav aria-label="قائمة المبيعات" className="flex flex-wrap gap-4 text-sm">
            <SalesNav />
          </nav>
          <div className="ms-auto flex items-center gap-3 text-sm">
            <span className="text-muted">
              {me.nameAr} · {ROLE_LABELS[me.role]}
            </span>
            <form action={salesLogout}>
              <button type="submit" className="admin-btn-ghost">
                خروج
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-light">{title}</h1>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}

/** The centred card used by the sign-in and password pages. */
export function SalesCard({ title, subtitle, children }: { title: string; subtitle?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="admin-panel flex w-full max-w-sm flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="self-start">{brand}</span>
          <h1 className="font-display text-2xl font-light">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
