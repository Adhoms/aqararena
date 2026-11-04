import Link from "next/link";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/i18n/config";
import { summarize, type BudgetFit, type Developer, type Project, type ProjectValue } from "@/lib/catalog";
import { fill, formatMillions, formatMoney } from "@/lib/format";
import { CompareButton } from "./compare/compare-button";
import { FavoriteButton } from "./favorites/favorite-button";
import { ValueRing, valueText } from "./insights";
import { ProjectCover } from "./project-cover";
import { Stat } from "./ui";

type Props = {
  project: Project;
  developer?: Developer;
  locale: Locale;
  dict: Dictionary;
  value?: ProjectValue;
  /** "feature" for the lead project on the home page, "large" for the home page, "compact" for result grids. */
  size?: "feature" | "large" | "compact";
  badge?: "featured" | "status";
  /** During a budget search: the best unit type and plan the visitor's budget covers. */
  fit?: BudgetFit;
};

export function ProjectCard({ project, developer, locale, dict, value, size = "compact", badge = "status", fit }: Props) {
  const s = summarize(project);
  const href = `/${locale}/projects/${project.slug}`;
  const feature = size === "feature";
  const large = size === "large" || feature;

  return (
    <article className="spotlight group relative flex h-full flex-col overflow-hidden rounded-3xl border border-line bg-surface transition-[transform,box-shadow,border-color] duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-y-1 hover:border-line-strong hover:shadow-[0_36px_70px_-34px_rgb(16_38_33/0.4)] dark:hover:shadow-[0_36px_70px_-34px_rgb(1_12_12/0.95)]">
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className={`relative block overflow-hidden ${feature ? "min-h-80 flex-1 lg:min-h-96" : large ? "h-64" : "h-52"}`}
      >
        <ProjectCover project={project} className="absolute inset-0 size-full transition-transform duration-700 group-hover:scale-[1.04]" />
        <span className={`absolute inset-x-0 bottom-0 bg-linear-to-t from-deep/80 to-transparent ${feature ? "h-32" : "h-20"}`} />
        <span className="absolute top-3.5 start-3.5 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-black/45 px-3 py-0.5 text-xs font-medium text-white backdrop-blur">{dict.categories[project.categories[0]]}</span>
          {badge === "featured" ? (
            <span className="rounded-full bg-brand/90 px-3 py-0.5 text-xs font-medium text-brass-light backdrop-blur">{dict.common.featured}</span>
          ) : (
            <span className="rounded-full bg-brand/90 px-3 py-0.5 text-xs font-medium text-white backdrop-blur">{dict.status[project.status]}</span>
          )}
        </span>
        {value && (
          <span className="absolute top-3 end-3">
            <ValueRing score={value.score} label={dict.insights.score} onDark />
          </span>
        )}
        <span className={`absolute bottom-3 start-4 font-display font-medium text-white drop-shadow ${feature ? "text-[30px]" : "text-[22px]"}`}>
          {formatMillions(s.startingPrice, locale)}
        </span>
      </Link>

      <div className={`flex flex-col gap-3.5 ${feature ? "p-6" : large ? "flex-1 p-5.5" : "flex-1 p-4.5"}`}>
        <div className="flex flex-col gap-0.5">
          <Link
            href={href}
            className={`font-display font-medium text-ink no-underline after:absolute after:inset-0 after:content-[''] hover:text-brass-dark ${feature ? "text-[28px]" : large ? "text-[22px]" : "text-[19px]"}`}
          >
            {project.name[locale]}
          </Link>
          <span className="text-sm text-muted">
            {developer?.name[locale]} · {dict.areas[project.areaSlug]}
          </span>
        </div>

        {value && (
          <span className={`text-[13px] font-medium ${value.vsAreaPct < -1 ? "text-link" : "text-muted"}`}>{valueText(value, dict)}</span>
        )}
        {fit ? (
          <BudgetFitLine fit={fit} locale={locale} dict={dict} />
        ) : (
          s.entryDown > 0 && (
            // The down payment in pounds next to the monthly figure of the same plan, never a monthly figure alone.
            <span className="text-[13px] text-body">
              {fill(dict.budget.entryLine, { down: formatMoney(s.entryDown, locale), monthly: formatMoney(s.entryMonthly, locale) })}
            </span>
          )
        )}

        <div className="grid grid-cols-3 gap-2 border-y border-divider py-3">
          <Stat label={dict.common.lowestDown} value={`${s.minDownPct}%`} />
          <Stat label={dict.projectPage.planYears} value={s.maxYears ? fill(dict.common.years, { n: s.maxYears }) : "-"} />
          <Stat label={dict.common.delivery} value={project.deliveryYear} />
        </div>

        {large && <span className="text-sm text-body">{s.subTypes.map((t) => dict.subTypes[t]).join(locale === "ar" ? "، " : ", ")}</span>}

        <div className="relative z-10 mt-auto flex gap-2.5">
          <CompareButton
            slug={project.slug}
            name={project.name}
            labels={{ add: dict.common.addToCompare, added: dict.common.inCompare }}
            className="flex-1"
          />
          <FavoriteButton slug={project.slug} labels={{ add: dict.favorites.add, remove: dict.favorites.remove }} />
        </div>
      </div>
    </article>
  );
}

function BudgetFitLine({ fit, locale, dict }: { fit: BudgetFit; locale: Locale; dict: Dictionary }) {
  const b = dict.budget;
  const unit = fit.typology.name[locale];
  const money = (n: number) => formatMoney(Math.round(n / 1000) * 1000, locale);
  return (
    <span className="flex flex-col gap-0.5 rounded-2xl bg-brass-soft px-3.5 py-2.5 text-[13px] text-ink">
      <span className="font-semibold text-link">{b.fitTitle}</span>
      <span>
        {fit.monthly
          ? fill(b.fitLine, { unit, down: money(fit.down), monthly: formatMoney(Math.round(fit.monthly / 100) * 100, locale) })
          : fill(b.fitCash, { unit, total: money(fit.down) })}
      </span>
      {fit.delivery > 0 && <span className="text-muted">{fill(b.fitDelivery, { amount: money(fit.delivery) })}</span>}
    </span>
  );
}
