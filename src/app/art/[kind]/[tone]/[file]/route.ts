import { ART_KINDS, ART_TONES, artSvg, type ArtKind, type ArtTone } from "@/lib/art-svg";

// GET /art/<kind>/<tone>/<seed>.svg → the drawn scene for a project without photos.
// The same address always gives the same picture, so browsers and the CDN keep it for a year.
export async function GET(_: Request, ctx: RouteContext<"/art/[kind]/[tone]/[file]">) {
  const { kind, tone, file } = await ctx.params;
  const seed = decodeURIComponent(file.replace(/\.svg$/, ""));
  if (!ART_KINDS.includes(kind as ArtKind) || !ART_TONES.includes(tone as ArtTone) || !seed || seed.length > 200) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(artSvg(seed, kind as ArtKind, tone as ArtTone), {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
