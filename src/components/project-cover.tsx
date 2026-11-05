import type { Project } from "@/lib/catalog";
import { artKindFor, ProjectArt } from "./project-art";

/**
 * A project's picture: its uploaded cover photo, or the drawn scene when it has no photos yet.
 * Fills its (positioned) parent.
 */
export function ProjectCover({
  project,
  className = "",
  tone,
  eager = false,
}: {
  project: Pick<Project, "slug" | "cover" | "categories" | "typologies">;
  className?: string;
  tone?: "day" | "dusk" | "night";
  /** For the picture at the top of a page: load it straight away. */
  eager?: boolean;
}) {
  if (project.cover) {
    return (
      // Photos are already resized to WebP when uploaded, so a plain <img> is enough.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={project.cover}
        alt=""
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        decoding="async"
        className={`object-cover ${className}`}
      />
    );
  }
  const kind = artKindFor(project);
  return <ProjectArt seed={project.slug} kind={kind} tone={tone ?? (kind === "coastal" ? "day" : "dusk")} eager={eager} className={className} />;
}
