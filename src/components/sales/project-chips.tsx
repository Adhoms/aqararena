import Link from "next/link";
import type { SalesProject } from "@/lib/sales/inventory";
import { searchHref, type SalesSearch } from "@/lib/sales/search";
import { formatCountAr as num } from "@/lib/format";

const chip =
  "press flex min-h-14 shrink-0 flex-col justify-center gap-0.5 rounded-2xl border border-line-strong bg-surface px-4 py-2 text-sm text-ink no-underline hover:border-ink hover:text-ink aria-[current=page]:border-brand aria-[current=page]:bg-brand aria-[current=page]:text-white";

/** One chip per project with how many units are available; picking one filters the search. Scrolls sideways on a phone. */
export function ProjectChips({ projects, search }: { projects: SalesProject[]; search: SalesSearch }) {
  const all = projects.reduce((t, p) => ({ available: t.available + p.available, total: t.total + p.total }), { available: 0, total: 0 });
  const items: { id?: string; nameAr: string; available: number; total: number }[] = [{ nameAr: "كل المشروعات", ...all }, ...projects];
  return (
    // Bleeds to the screen edges on a phone so the row reads as scrollable; the page itself never scrolls sideways.
    <nav aria-label="المشروعات" className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-1">
      <ul className="m-0 flex w-max list-none gap-2 p-0">
        {items.map((p) => (
          <li key={p.id ?? "all"} className="flex">
            <Link
              // Another project's type or plan means nothing here, so those are cleared.
              href={searchHref(search, { project: p.id, model: undefined, plan: undefined, page: 1 })}
              aria-current={search.project === p.id ? "page" : undefined}
              className={chip}
            >
              <span className="font-medium">{p.nameAr}</span>
              <span className="text-xs opacity-80">
                {p.total === 0 ? "مفيش وحدات لسه" : `${num(p.available)} متاحة من ${num(p.total)}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
