import { ImageResponse } from "next/og";
import { OG, OG_SIZE, OgBrand, OgDotField } from "@/lib/og";

// The share image for every page that has no image of its own.
export const alt = "AqarArena: every real-estate project in Egypt, compared";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", padding: 72, background: OG.deep, position: "relative" }}>
        <OgDotField />
        <OgBrand />
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 68, lineHeight: 1.05, color: OG.white, maxWidth: 820 }}>Every real-estate project in Egypt, compared.</div>
          <div style={{ fontSize: 30, color: OG.muted }}>Prices · payment plans · master plans · official developer numbers</div>
        </div>
        <div style={{ display: "flex", fontSize: 26, color: OG.brass }}>aqararena.com</div>
      </div>
    ),
    size,
  );
}
