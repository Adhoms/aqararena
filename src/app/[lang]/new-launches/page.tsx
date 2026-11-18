import { Phone } from "@phosphor-icons/react/ssr";
import type { Metadata } from "next";
import Link from "next/link";
import { FavoriteButton } from "@/components/favorites/favorite-button";
import { ProjectCover } from "@/components/project-cover";
import { ArrowIcon, Container } from "@/components/ui";
import { currencyOf, listDevelopers, listProjects, summarize, type Project } from "@/lib/catalog";
import { fill, formatMillions, formatMoney, telHref } from "@/lib/format";
import { pageAlternates } from "@/lib/site";
import { getDictionary, getLocale } from "../dictionaries";

type Locale = "ar" | "en";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return { title: dict.newLaunches.title, description: dict.newLaunches.subtitle, alternates: pageAlternates(locale, "/new-launches") };
}

/** Lowest launch price for each unit type, one row per type (no repeated projects, no empty prices). */
function pricesByType(project: Project) {
  const best = new Map<Project["typologies"][number]["subType"], number>();
  for (const t of project.typologies) {
    if (t.priceFrom > 0 && (!best.has(t.subType) || t.priceFrom < best.get(t.subType)!)) best.set(t.subType, t.priceFrom);
  }
  return [...best.entries()].sort((a, b) => a[1] - b[1]);
}

const formatDate = (iso: string, locale: Locale) =>
  new Intl.DateTimeFormat(locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB", { month: "long", year: "numeric" }).format(new Date(iso));

export default async function NewLaunchesPage() {
  const [locale, dict, projects, developers] = await Promise.all([getLocale(), getDictionary(), listProjects(), listDevelopers()]);
  const n = dict.newLaunches;
  const devBySlug = new Map(developers.map((d) => [d.slug, d]));
  const launches = projects
    .filter((p) => p.status === "LAUNCH")
    .sort((a, b) => (b.launchDate ?? `${b.launchYear ?? 0}`).localeCompare(a.launchDate ?? `${a.launchYear ?? 0}`));

  return (
    <Container className="flex flex-col gap-10 pt-10 pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-4xl font-light tracking-[-0.015em] sm:text-[46px]">{n.title}</h1>
        <p className="max-w-[62ch] text-muted">{n.subtitle}</p>
      </div>

      {launches.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line-strong bg-surface p-10 text-center text-body">{n.empty}</p>
      ) : (
        <ol className="flex flex-col gap-6">
          {launches.map((project) => {
            const developer = devBySlug.get(project.developerSlug);
            const hotline = developer?.contacts.hotline ?? developer?.contacts.salesPhone;
            const s = summarize(project);
            const currency = currencyOf(project);
            const href = `/${locale}/projects/${project.slug}`;
            return (
              <li
                key={project.slug}
                className="grid overflow-hidden rounded-3xl border border-line bg-surface md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)_minmax(0,0.8fr)]"
              >
                {/* Render with the launch date */}
                <Link href={href} tabIndex={-1} aria-hidden="true" className="relative block min-h-56 overflow-hidden text-white no-underline hover:text-white">
                  <ProjectCover project={project} className="absolute inset-0 size-full" />
                  <span className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-deep/80 to-transparent" />
                  {(project.launchDate || project.launchYear) && (
                    <span className="absolute top-4 start-4 rounded-full bg-brass-light px-3 py-1 text-xs font-semibold text-deep">
                      {fill(n.launched, { date: project.launchDate ? formatDate(project.launchDate, locale) : String(project.launchYear) })}
                    </span>
                  )}
                </Link>

                {/* Project and its launch prices, one row per unit type */}
                <div className="flex flex-col gap-4 p-5 sm:p-6">
                  <div className="flex flex-col gap-0.5">
                    <Link href={href} className="font-display text-2xl font-medium text-ink no-underline hover:text-brass">
                      {project.name[locale]}
                    </Link>
                    <span className="text-sm text-muted">
                      {developer?.name[locale]} · <Link href={`/${locale}/areas/${project.areaSlug}`} className="text-muted hover:text-brass">{dict.areas[project.areaSlug]}</Link>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted">{n.types}</span>
                    <ul className="flex flex-col">
                      {pricesByType(project).map(([subType, price]) => (
                        <li key={subType} className="flex items-baseline justify-between gap-3 border-b border-divider py-2 last:border-0">
                          <span>{dict.subTypes[subType]}</span>
                          <span className="font-display">
                            <span className="text-xs text-muted">{n.from} </span>
                            {formatMillions(price, locale, currency)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {s.entryDown > 0 && (
                    <span className="text-[13px] text-body">
                      {fill(dict.budget.entryLine, { down: formatMoney(s.entryDown, locale, currency), monthly: formatMoney(s.entryMonthly, locale, currency) })}
                    </span>
                  )}
                </div>

                {/* Booking deposit and actions */}
                <div className="flex flex-col justify-between gap-5 border-line bg-plan/60 p-5 max-md:border-t sm:p-6 md:border-s">
                  {project.bookingFee ? (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-muted">{n.bookingFee}</span>
                      <span className="font-display text-3xl font-light text-brass">{formatMoney(project.bookingFee, locale, currency)}</span>
                      <span className="text-xs text-muted">{n.bookingNote}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-medium text-muted">{dict.common.startingFrom}</span>
                      <span className="font-display text-3xl font-light text-brass">{formatMillions(s.startingPrice, locale, currency)}</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <Link
                        href={href}
                        className="press group inline-flex min-h-11 flex-1 items-center justify-between gap-2 rounded-full bg-brand ps-5 pe-1.5 font-medium text-white no-underline hover:bg-brand-2 hover:text-white"
                      >
                        {n.view}
                        <span className="flex size-8 items-center justify-center rounded-full bg-white/12">
                          <ArrowIcon locale={locale} size={14} />
                        </span>
                      </Link>
                      <FavoriteButton slug={project.slug} labels={{ add: dict.favorites.add, remove: dict.favorites.remove }} />
                    </div>
                    {telHref(hotline) && (
                      <a
                        href={telHref(hotline)}
                        className="press inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-line-strong bg-surface text-ink no-underline hover:border-ink hover:text-ink"
                      >
                        <Phone size={18} aria-hidden="true" />
                        {n.call} <span dir="ltr">{hotline}</span>
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </Container>
  );
}
