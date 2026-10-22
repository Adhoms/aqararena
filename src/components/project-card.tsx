import Link from "next/link";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/i18n/config";
import { summarize, type Developer, type Project } from "@/lib/catalog";
import { formatMillions } from "@/lib/format";
import { CompareButton } from "./compare/compare-button";
import { PhotoPlaceholder, Pill, Stat } from "./ui";

type Props = {
  project: Project;
  developer?: Developer;
  locale: Locale;
  dict: Dictionary;
  /** "large" for the home page, "compact" for result grids. */
  size?: "large" | "compact";
  badge?: "featured" | "status";
};

export function ProjectCard({ project, developer, locale, dict, size = "compact", badge = "status" }: Props) {
  const s = summarize(project);
  const href = `/${locale}/projects/${project.slug}`;
  const large = size === "large";

  return (
    <article className="flex flex-col overflow-hidden rounded-[20px] border border-line bg-surface">
      <PhotoPlaceholder label={dict.common.photo} className={large ? "h-60" : "h-48"}>
        <span className="absolute top-4 start-4">
          <Pill>{dict.categories[project.categories[0]]}</Pill>
        </span>
        <span className="absolute top-4 end-4">
          {badge === "featured" ? (
            <span className="inline-flex rounded-full bg-brand px-3 py-0.5 text-xs font-medium text-brass-light">{dict.common.featured}</span>
          ) : (
            <Pill tone="dark">{dict.status[project.status]}</Pill>
          )}
        </span>
      </PhotoPlaceholder>

      <div className={`flex flex-1 flex-col gap-4 ${large ? "p-5.5" : "p-4.5"}`}>
        <div className="flex flex-col gap-0.5">
          <Link
            href={href}
            className={`font-display font-medium text-ink no-underline hover:text-brand ${large ? "text-[22px]" : "text-[19px]"}`}
          >
            {project.name[locale]}
          </Link>
          <span className="text-sm text-muted">
            {developer?.name[locale]} · {dict.areas[project.areaSlug]}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 border-y border-divider py-3.5">
          <Stat label={dict.common.startingFrom} value={formatMillions(s.startingPrice, locale)} />
          <Stat label={dict.common.lowestDown} value={`${s.minDownPct}%`} />
          <Stat label={dict.common.delivery} value={project.deliveryYear} />
        </div>

        {large && <span className="text-sm text-body">{s.subTypes.map((t) => dict.subTypes[t]).join(" · ")}</span>}

        <div className="mt-auto flex gap-2.5">
          <Link
            href={href}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-brand px-4 font-medium text-white no-underline hover:bg-brand-2 hover:text-white"
          >
            {dict.common.viewProject}
          </Link>
          <CompareButton
            slug={project.slug}
            name={project.name}
            labels={{ add: large ? dict.common.addToCompare : dict.common.addShort, added: dict.common.inCompare }}
            className="flex-1"
          />
        </div>
      </div>
    </article>
  );
}
