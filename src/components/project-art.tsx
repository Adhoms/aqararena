import type { Project } from "@/lib/catalog/types";

// Generated architectural scenes that stand in for project photos until real media is
// uploaded. Every project gets its own scene, drawn the same way each time from its slug,
// so the site looks designed instead of a wall of grey boxes.

import { artUrl, type ArtKind, type ArtTone } from "@/lib/art-svg";

export type { ArtKind, ArtTone };

export function artKindFor(project: Pick<Project, "categories" | "typologies">): ArtKind {
  if (project.categories.includes("COASTAL")) return "coastal";
  if (!project.categories.includes("RESIDENTIAL")) return "towers";
  const houses = project.typologies.filter((t) => ["VILLA", "TWIN_HOUSE", "TOWNHOUSE", "MANSION"].includes(t.subType)).length;
  return houses > project.typologies.length / 2 ? "villas" : "residential";
}

type Props = {
  seed: string;
  kind: ArtKind;
  tone?: ArtTone;
  className?: string;
  /** Accessible name; omit for decorative use. */
  label?: string;
  /** For the picture at the top of a page: load it straight away. */
  eager?: boolean;
};

/** The scene as an image (drawn by /art/…svg and cached), covering its box like a photo. */
export function ProjectArt({ seed, kind, tone = "dusk", className = "", label, eager = false }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- a cached SVG, nothing for the image optimizer to do
    <img
      src={artUrl(seed, kind, tone)}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={800}
      height={500}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      className={`object-cover ${className}`}
    />
  );
}
