import type { Project } from "@/lib/catalog/types";

// Generated architectural scenes that stand in for project photos until real media is
// uploaded. Every project gets its own scene, drawn the same way each time from its slug,
// so the site looks designed instead of a wall of grey boxes.

export type ArtKind = "residential" | "villas" | "towers" | "coastal";
export type ArtTone = "dusk" | "day" | "night";

export function artKindFor(project: Pick<Project, "categories" | "typologies">): ArtKind {
  if (project.categories.includes("COASTAL")) return "coastal";
  if (!project.categories.includes("RESIDENTIAL")) return "towers";
  const houses = project.typologies.filter((t) => ["VILLA", "TWIN_HOUSE", "TOWNHOUSE", "MANSION"].includes(t.subType)).length;
  return houses > project.typologies.length / 2 ? "villas" : "residential";
}

function rng(seed: string) {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const SKIES: Record<ArtTone, [string, string, string]> = {
  dusk: ["#0f2b2d", "#2c5154", "#d8b57a"],
  day: ["#c9d8d6", "#e7ece8", "#f4ead8"],
  night: ["#081a1c", "#123134", "#2c5154"],
};
const INK: Record<ArtTone, { far: string; mid: string; near: string; lit: string; ground: string }> = {
  dusk: { far: "#24474a", mid: "#173b3e", near: "#0b2123", lit: "#e9cf98", ground: "#0b2123" },
  day: { far: "#b7c6c3", mid: "#8fa5a2", near: "#4d6866", lit: "#fbf3e2", ground: "#5b7471" },
  night: { far: "#123134", mid: "#0d2629", near: "#061416", lit: "#cdae74", ground: "#061416" },
};

type Props = {
  seed: string;
  kind: ArtKind;
  tone?: ArtTone;
  className?: string;
  /** Accessible name; omit for decorative use. */
  label?: string;
};

export function ProjectArt({ seed, kind, tone = "dusk", className = "", label }: Props) {
  const r = rng(seed);
  const [skyTop, skyMid, skyGlow] = SKIES[tone];
  const ink = INK[tone];
  const id = `art-${seed.replace(/[^a-z0-9]/gi, "")}-${tone}`;
  const horizon = kind === "coastal" ? 330 : 360;
  const sunX = 120 + r() * 560;

  // Distant skyline.
  const far: { x: number; w: number; h: number }[] = [];
  for (let x = -20; x < 820; ) {
    const w = 30 + r() * 60;
    far.push({ x, w, h: 40 + r() * (kind === "towers" ? 170 : 90) });
    x += w + r() * 10;
  }

  const buildings: { x: number; w: number; h: number; floors: number; cols: number }[] = [];
  const houses: { x: number; w: number; h: number }[] = [];
  const trees: { x: number; s: number }[] = [];

  if (kind === "residential" || kind === "towers") {
    const count = kind === "towers" ? 4 + Math.floor(r() * 3) : 6 + Math.floor(r() * 3);
    for (let i = 0; i < count; i++) {
      const w = kind === "towers" ? 60 + r() * 60 : 70 + r() * 50;
      const h = kind === "towers" ? 170 + r() * 150 : 90 + r() * 90;
      const x = (i / count) * 820 - 20 + r() * 30;
      buildings.push({ x, w, h, floors: Math.max(4, Math.round(h / 18)), cols: Math.max(3, Math.round(w / 16)) });
    }
  }
  if (kind === "villas" || kind === "residential" || kind === "coastal") {
    const count = kind === "residential" ? 4 : 9;
    for (let i = 0; i < count; i++) {
      const w = 60 + r() * 40;
      houses.push({ x: (i / count) * 820 + r() * 40 - 10, w, h: 34 + r() * 26 });
    }
  }
  for (let i = 0; i < 14; i++) trees.push({ x: r() * 820, s: 0.6 + r() * 0.8 });

  const groundY = 440;
  const houseBase = kind === "coastal" ? 360 : groundY;

  return (
    <svg
      viewBox="0 0 800 500"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="0.62" stopColor={skyMid} />
          <stop offset="1" stopColor={skyGlow} />
        </linearGradient>
        <radialGradient id={`${id}-sun`}>
          <stop offset="0" stopColor={ink.lit} stopOpacity="0.9" />
          <stop offset="1" stopColor={ink.lit} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${id}-water`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyGlow} stopOpacity="0.55" />
          <stop offset="1" stopColor={skyTop} />
        </linearGradient>
      </defs>

      <rect width="800" height="500" fill={`url(#${id}-sky)`} />
      <circle cx={sunX} cy={horizon - 40} r="120" fill={`url(#${id}-sun)`} />
      <circle cx={sunX} cy={horizon - 40} r={tone === "night" ? 16 : 26} fill={ink.lit} opacity={tone === "day" ? 0.7 : 0.85} />

      <g fill={ink.far} opacity="0.85">
        {far.map((b, i) => (
          <rect key={i} x={b.x} y={horizon - b.h} width={b.w} height={b.h + 10} />
        ))}
      </g>

      {kind === "coastal" && (
        <>
          <rect y={horizon} width="800" height="170" fill={`url(#${id}-water)`} />
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={r() * 760} y={horizon + 12 + i * 15} width={30 + r() * 90} height="2" fill={ink.lit} opacity={0.25 + r() * 0.3} />
          ))}
        </>
      )}

      {buildings.map((b, i) => {
        const top = groundY - b.h;
        return (
          <g key={i}>
            <rect x={b.x} y={top} width={b.w} height={b.h} fill={ink.mid} />
            <rect x={b.x} y={top} width={b.w * 0.18} height={b.h} fill={ink.near} opacity="0.5" />
            {Array.from({ length: b.floors - 1 }, (_, f) =>
              Array.from({ length: b.cols }, (_, c) =>
                r() > (tone === "day" ? 0.82 : 0.55) ? (
                  <rect
                    key={`${f}-${c}`}
                    x={b.x + 6 + c * ((b.w - 12) / b.cols)}
                    y={top + 8 + f * (b.h / b.floors)}
                    width={Math.max(3, (b.w - 12) / b.cols - 5)}
                    height={Math.max(3, b.h / b.floors - 8)}
                    fill={ink.lit}
                    opacity={0.55 + r() * 0.4}
                  />
                ) : null,
              ),
            )}
          </g>
        );
      })}

      {houses.map((h, i) => (
        <g key={i}>
          <rect x={h.x} y={houseBase - h.h} width={h.w} height={h.h} fill={kind === "coastal" ? "#f4efe6" : ink.mid} opacity={kind === "coastal" ? 0.92 : 1} />
          <rect x={h.x - 4} y={houseBase - h.h - 5} width={h.w + 8} height="6" fill={kind === "coastal" ? "#e6dccb" : ink.near} />
          <rect x={h.x + h.w * 0.15} y={houseBase - h.h * 0.65} width={h.w * 0.3} height={h.h * 0.4} fill={ink.lit} opacity={tone === "day" ? 0.5 : 0.85} />
          <rect x={h.x + h.w * 0.58} y={houseBase - h.h * 0.65} width={h.w * 0.25} height={h.h * 0.4} fill={ink.lit} opacity={tone === "day" ? 0.35 : 0.6} />
        </g>
      ))}

      {kind !== "coastal" && <rect y={groundY} width="800" height="60" fill={ink.ground} />}
      {kind !== "coastal" && <rect y={groundY + 14} width="800" height="2" fill={ink.lit} opacity="0.25" />}

      <g fill={ink.near}>
        {trees.map((t, i) => {
          const base = kind === "coastal" ? 372 : groundY;
          if (kind === "coastal" || kind === "villas") {
            // Palm: thin trunk and a fan of leaves.
            return (
              <g key={i} transform={`translate(${t.x} ${base}) scale(${t.s})`}>
                <rect x="-1.5" y="-46" width="3" height="46" />
                <path d="M0-46c-14-6-24-2-30 4 10-4 20-4 30-4zm0 0c14-6 24-2 30 4-10-4-20-4-30-4zm0 0c-6-12-16-16-24-14 10 2 18 8 24 14zm0 0c6-12 16-16 24-14-10 2-18 8-24 14z" />
              </g>
            );
          }
          return <circle key={i} cx={t.x} cy={base - 10 * t.s} r={12 * t.s} />;
        })}
      </g>
    </svg>
  );
}
