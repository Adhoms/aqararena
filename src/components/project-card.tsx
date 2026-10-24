import Link from "next/link";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/i18n/config";
import { summarize, type Developer, type Project, type ProjectValue } from "@/lib/catalog";
import { fill, formatMillions } from "@/lib/format";
import { CompareButton } from "./compare/compare-button";
import { ValueRing, valueText } from "./insights";
import { artKindFor, ProjectArt } from "./project-art";
import { Stat } from "./ui";

type Props = {
  project: Project;
  developer?: Developer;
  locale: Locale;
  dict: Dictionary;
  value?: ProjectValue;
  /** "large" for the home page, "compact" for result grids. */
  size?: "large" | "compact";
  badge?: "featured" | "status";
};

export function ProjectCard({ project, developer, locale, dict, value, size = "compact", badge = "status" }: Props) {
  const s = summarize(project);
  const href = `/${locale}/projects/${project.slug}`;
  const large = size === "large";
  const kind = artKindFor(project);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[22px] border border-line bg-surface transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-[0_24px_48px_-24px_rgba(15,43,45,0.45)]">
      <Link href={href} tabIndex={-1} aria-hidden="true" className={`relative block overflow-hidden ${large ? "h-64" : "h-52"}`}>
        <ProjectArt
          seed={project.slug}
          kind={kind}
          tone={kind === "coastal" ? "day" : "dusk"}
          className="absolute inset-0 size-full transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <span className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-black/45 to-transparent" />
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
        <span className="absolute bottom-3 start-4 font-display text-[22px] font-medium text-white drop-shadow">
          {formatMillions(s.startingPrice, locale)}
        </span>
      </Link>

      <div className={`flex flex-1 flex-col gap-3.5 ${large ? "p-5.5" : "p-4.5"}`}>
        <div className="flex flex-col gap-0.5">
          <Link
            href={href}
            className={`font-display font-medium text-ink no-underline after:absolute after:inset-0 after:content-[''] hover:text-brand ${large ? "text-[22px]" : "text-[19px]"}`}
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

        <div className="grid grid-cols-3 gap-2 border-y border-divider py-3">
          <Stat label={dict.common.lowestDown} value={`${s.minDownPct}%`} />
          <Stat label={dict.projectPage.planYears} value={s.maxYears ? fill(dict.common.years, { n: s.maxYears }) : "—"} />
          <Stat label={dict.common.delivery} value={project.deliveryYear} />
        </div>

        {large && <span className="text-sm text-body">{s.subTypes.map((t) => dict.subTypes[t]).join(" · ")}</span>}

        <div className="relative z-10 mt-auto flex gap-2.5">
          <CompareButton
            slug={project.slug}
            name={project.name}
            labels={{ add: dict.common.addToCompare, added: dict.common.inCompare }}
            className="flex-1"
          />
        </div>
      </div>
    </article>
  );
}
