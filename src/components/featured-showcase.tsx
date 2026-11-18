import Link from "next/link";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/i18n/config";
import {
  currencyOf,
  summarize,
  type Developer,
  type MarketInsights,
  type Project,
} from "@/lib/catalog";
import { fill, formatMillions, formatMoney } from "@/lib/format";
import { CompareButton } from "./compare/compare-button";
import { FavoriteButton } from "./favorites/favorite-button";
import { ValueRing, valueText } from "./insights";
import { ProjectCover } from "./project-cover";
import { ArrowIcon } from "./ui";

type Props = {
  projects: Project[];
  developers: Map<string, Developer>;
  values: MarketInsights["values"];
  locale: Locale;
  dict: Dictionary;
};

/**
 * Featured projects as an expanding gallery: tall panels side by side, the first one open.
 * Hovering or focusing another panel widens it and reveals its figures while the others narrow
 * (pure CSS, see `.acc` in globals.css). Phones get a vertical stack with everything shown.
 * Each panel is a double frame: an outer tray holding an inner plate with the render.
 */
export function FeaturedShowcase({
  projects,
  developers,
  values,
  locale,
  dict,
}: Props) {
  return (
    <ul className="acc">
      {projects.map((project) => {
        const s = summarize(project);
        const value = values[project.slug];
        const href = `/${locale}/projects/${project.slug}`;
        return (
          <li
            key={project.slug}
            className="spotlight rounded-[2rem] border border-line bg-surface p-1.5 shadow-(--card-shadow)"
          >
            <div className="group relative isolate flex h-full flex-col justify-end overflow-hidden rounded-[calc(2rem-0.375rem)] text-white">
              <ProjectCover project={project} className="acc-art absolute inset-0 -z-10 size-full" />
              <span
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-linear-to-t from-deep via-deep/55 to-deep/5"
              />

              <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-2">
                <span className="rounded-full bg-deep/55 px-3 py-0.5 text-xs font-medium backdrop-blur-sm">
                  {dict.categories[project.categories[0]]}
                </span>
                {value && (
                  <ValueRing score={value.score} label={dict.insights.score} />
                )}
              </div>

              <div className="flex flex-col gap-4 p-5 sm:p-6">
                <div className="flex flex-col gap-1">
                  <span className="truncate text-[13px] text-on-dark">
                    {developers.get(project.developerSlug)?.name[locale]} ·{" "}
                    {dict.areas[project.areaSlug]}
                  </span>
                  <Link
                    href={href}
                    className="acc-name group/name flex items-center gap-3 font-display leading-tight font-medium text-white no-underline after:absolute after:inset-0 after:content-[''] hover:text-white"
                  >
                    <span className="line-clamp-2">{project.name[locale]}</span>
                    {/* Arrow in its own circle, nudged forward on hover. */}
                    <span className="acc-arrow size-9 flex-none items-center justify-center rounded-full bg-white/12 transition-colors group-hover/name:bg-brass-light group-hover/name:text-deep">
                      <ArrowIcon locale={locale} size={16} />
                    </span>
                  </Link>
                </div>

                {/* Collapses to nothing in a narrow panel, so the name sits at the bottom. */}
                <div className="acc-reveal">
                  <div className="acc-more flex min-h-0 flex-col gap-4 overflow-hidden px-0.5 pb-0.5">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="font-display text-4xl font-light text-brass-light">
                        {formatMillions(s.startingPrice, locale, currencyOf(project))}
                      </span>
                      {value && (
                        <span className="text-[13px] text-on-dark">
                          {valueText(value, dict)}
                        </span>
                      )}
                      {s.entryDown > 0 && (
                        <span className="w-full text-[13px] text-on-dark">
                          {fill(dict.budget.entryLine, { down: formatMoney(s.entryDown, locale, currencyOf(project)), monthly: formatMoney(s.entryMonthly, locale, currencyOf(project)) })}
                        </span>
                      )}
                    </div>
                    <dl className="grid grid-cols-3 gap-3 border-t border-white/12 pt-4">
                      {[
                        [dict.common.lowestDown, `${s.minDownPct}%`],
                        [
                          dict.projectPage.planYears,
                          s.maxYears
                            ? fill(dict.common.years, { n: s.maxYears })
                            : "-",
                        ],
                        [dict.common.delivery, String(project.deliveryYear)],
                      ].map(([label, v]) => (
                        <div
                          key={label}
                          className="flex min-w-0 flex-col-reverse"
                        >
                          <dt className="truncate text-xs text-on-dark-muted">
                            {label}
                          </dt>
                          <dd className="font-display text-lg">{v}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="relative z-10 flex gap-2">
                      <CompareButton
                        slug={project.slug}
                        name={project.name}
                        labels={{
                          add: dict.common.addToCompare,
                          added: dict.common.inCompare,
                        }}
                        variant="onImage"
                      className="flex-1 rounded-full"
                      />
                      <FavoriteButton slug={project.slug} variant="onImage" labels={{ add: dict.favorites.add, remove: dict.favorites.remove }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
