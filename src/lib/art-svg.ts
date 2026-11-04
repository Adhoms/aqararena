// The generated architectural scenes that stand in for project photos, drawn as an SVG file.
// Served from /art/<kind>/<tone>/<seed>.svg and cached for a year, so a page links a small
// image instead of carrying hundreds of shapes per card in its HTML. The same seed always
// draws the same scene.

export type ArtKind = "residential" | "villas" | "towers" | "coastal";
export type ArtTone = "dusk" | "day" | "night";

export const ART_KINDS: readonly ArtKind[] = ["residential", "villas", "towers", "coastal"];
export const ART_TONES: readonly ArtTone[] = ["dusk", "day", "night"];

/** Where a scene is served from. */
export const artUrl = (seed: string, kind: ArtKind, tone: ArtTone) => `/art/${kind}/${tone}/${encodeURIComponent(seed)}.svg`;

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

const n = (v: number) => Math.round(v * 10) / 10;

/** The scene as SVG markup. */
export function artSvg(seed: string, kind: ArtKind, tone: ArtTone): string {
  const r = rng(seed);
  const [skyTop, skyMid, skyGlow] = SKIES[tone];
  const ink = INK[tone];
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
  const out: string[] = [];

  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500" preserveAspectRatio="xMidYMid slice">`,
    `<defs>`,
    `<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyTop}"/><stop offset="0.62" stop-color="${skyMid}"/><stop offset="1" stop-color="${skyGlow}"/></linearGradient>`,
    `<radialGradient id="sun"><stop offset="0" stop-color="${ink.lit}" stop-opacity="0.9"/><stop offset="1" stop-color="${ink.lit}" stop-opacity="0"/></radialGradient>`,
    `<linearGradient id="water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${skyGlow}" stop-opacity="0.55"/><stop offset="1" stop-color="${skyTop}"/></linearGradient>`,
    `</defs>`,
    `<rect width="800" height="500" fill="url(#sky)"/>`,
    `<circle cx="${n(sunX)}" cy="${horizon - 40}" r="120" fill="url(#sun)"/>`,
    `<circle cx="${n(sunX)}" cy="${horizon - 40}" r="${tone === "night" ? 16 : 26}" fill="${ink.lit}" opacity="${tone === "day" ? 0.7 : 0.85}"/>`,
    `<g fill="${ink.far}" opacity="0.85">${far.map((b) => `<rect x="${n(b.x)}" y="${n(horizon - b.h)}" width="${n(b.w)}" height="${n(b.h + 10)}"/>`).join("")}</g>`,
  );

  if (kind === "coastal") {
    out.push(`<rect y="${horizon}" width="800" height="170" fill="url(#water)"/>`);
    for (let i = 0; i < 9; i++) {
      out.push(`<rect x="${n(r() * 760)}" y="${horizon + 12 + i * 15}" width="${n(30 + r() * 90)}" height="2" fill="${ink.lit}" opacity="${n(0.25 + r() * 0.3)}"/>`);
    }
  }

  for (const b of buildings) {
    const top = groundY - b.h;
    out.push(`<rect x="${n(b.x)}" y="${n(top)}" width="${n(b.w)}" height="${n(b.h)}" fill="${ink.mid}"/>`);
    out.push(`<rect x="${n(b.x)}" y="${n(top)}" width="${n(b.w * 0.18)}" height="${n(b.h)}" fill="${ink.near}" opacity="0.5"/>`);
    for (let f = 0; f < b.floors - 1; f++) {
      for (let c = 0; c < b.cols; c++) {
        if (r() > (tone === "day" ? 0.82 : 0.55)) {
          out.push(
            `<rect x="${n(b.x + 6 + c * ((b.w - 12) / b.cols))}" y="${n(top + 8 + f * (b.h / b.floors))}" width="${n(Math.max(3, (b.w - 12) / b.cols - 5))}" height="${n(Math.max(3, b.h / b.floors - 8))}" fill="${ink.lit}" opacity="${n(0.55 + r() * 0.4)}"/>`,
          );
        }
      }
    }
  }

  for (const h of houses) {
    const wall = kind === "coastal" ? "#f4efe6" : ink.mid;
    const roof = kind === "coastal" ? "#e6dccb" : ink.near;
    out.push(
      `<rect x="${n(h.x)}" y="${n(houseBase - h.h)}" width="${n(h.w)}" height="${n(h.h)}" fill="${wall}" opacity="${kind === "coastal" ? 0.92 : 1}"/>`,
      `<rect x="${n(h.x - 4)}" y="${n(houseBase - h.h - 5)}" width="${n(h.w + 8)}" height="6" fill="${roof}"/>`,
      `<rect x="${n(h.x + h.w * 0.15)}" y="${n(houseBase - h.h * 0.65)}" width="${n(h.w * 0.3)}" height="${n(h.h * 0.4)}" fill="${ink.lit}" opacity="${tone === "day" ? 0.5 : 0.85}"/>`,
      `<rect x="${n(h.x + h.w * 0.58)}" y="${n(houseBase - h.h * 0.65)}" width="${n(h.w * 0.25)}" height="${n(h.h * 0.4)}" fill="${ink.lit}" opacity="${tone === "day" ? 0.35 : 0.6}"/>`,
    );
  }

  if (kind !== "coastal") {
    out.push(`<rect y="${groundY}" width="800" height="60" fill="${ink.ground}"/>`, `<rect y="${groundY + 14}" width="800" height="2" fill="${ink.lit}" opacity="0.25"/>`);
  }

  out.push(`<g fill="${ink.near}">`);
  for (const t of trees) {
    const base = kind === "coastal" ? 372 : groundY;
    if (kind === "coastal" || kind === "villas") {
      // Palm: thin trunk and a fan of leaves.
      out.push(
        `<g transform="translate(${n(t.x)} ${base}) scale(${n(t.s)})"><rect x="-1.5" y="-46" width="3" height="46"/><path d="M0-46c-14-6-24-2-30 4 10-4 20-4 30-4zm0 0c14-6 24-2 30 4-10-4-20-4-30-4zm0 0c-6-12-16-16-24-14 10 2 18 8 24 14zm0 0c6-12 16-16 24-14-10 2-18 8-24 14z"/></g>`,
      );
    } else {
      out.push(`<circle cx="${n(t.x)}" cy="${n(base - 10 * t.s)}" r="${n(12 * t.s)}"/>`);
    }
  }
  out.push(`</g></svg>`);
  return out.join("");
}
