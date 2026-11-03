import type { ReactNode } from "react";
import Link from "next/link";
import { portalLogout } from "@/app/portal/actions";

/** Header and frame for every signed-in portal page. */
export function PortalShell({
  company,
  title,
  children,
  actions,
  back,
}: {
  company: string;
  title: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
  back?: boolean;
}) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-ground/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link href="/portal" className="font-display text-lg text-ink no-underline">
            AqarArena <span className="text-sm text-muted">· بوابة المطورين</span>
          </Link>
          <span className="admin-badge">{company}</span>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link href="/portal">مشروعاتي</Link>
            <Link href="/portal/password">كلمة المرور</Link>
            <a href="/ar" target="_blank" rel="noreferrer">
              الموقع ↗
            </a>
          </nav>
          <form action={portalLogout} className="ms-auto">
            <button type="submit" className="admin-btn-ghost">
              خروج
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            {back && (
              <Link href="/portal" className="text-sm">
                → مشروعاتي
              </Link>
            )}
            <h1 className="font-display text-3xl font-light">{title}</h1>
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}

/** The centred card used by the sign-in, request and password pages. */
export function PortalCard({ title, subtitle, children, wide }: { title: string; subtitle?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className={`admin-panel flex w-full flex-col gap-5 ${wide ? "max-w-2xl" : "max-w-sm"}`}>
        <div className="flex flex-col gap-1">
          <Link href="/ar" className="font-display text-sm text-muted no-underline">
            AqarArena · بوابة المطورين
          </Link>
          <h1 className="font-display text-2xl font-light">{title}</h1>
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
