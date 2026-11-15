import type { ReactNode } from "react";
import Link from "next/link";

/** Header and page frame for every signed-in admin page. */
export function AdminShell({ title, children, actions, back }: { title: ReactNode; children: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-ground/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
          <Link href="/admin" className="font-display text-lg text-ink no-underline">
            <span dir="ltr" className="tracking-[0.18em]">
              AQAR <span className="font-light text-brass">ARENA</span>
            </span> 
            <span className="text-sm text-muted">· لوحة التحكم</span>
          </Link>
          <nav className="flex flex-wrap gap-4 text-sm">
            <Link href="/admin">الرئيسية</Link>
            <Link href="/admin/developers/new">+ مطور</Link>
            <Link href="/admin/projects/new">+ مشروع</Link>
            <Link href="/admin/import">استيراد Excel</Link>
            <Link href="/admin/review">مراجعة المطورين</Link>
            <Link href="/admin/accounts">الحسابات</Link>
            <Link href="/admin/messages">الرسائل</Link>
            <Link href="/admin/alerts">المشتركين</Link>
            <Link href="/admin/stats">الإحصائيات</Link>
            <a href="/ar" target="_blank" rel="noreferrer">
              عرض الموقع ↗
            </a>
          </nav>
          <form action="/admin/logout" method="post" className="ms-auto">
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
              <Link href={back.href} className="text-sm">
                → {back.label}
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
