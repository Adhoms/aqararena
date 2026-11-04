import { LOGO_DOTS } from "@/components/logo-mark-data";

// Shared pieces for the generated share images (WhatsApp, Facebook, X, LinkedIn).
// The image renderer can't join Arabic letters, so these images use English and numbers;
// the Arabic title and description travel with the link as text.

export const OG_SIZE = { width: 1200, height: 630 };

export const OG = {
  deep: "#0d221e",
  brand: "#1d4a42",
  brass: "#e2a84a",
  muted: "#a8bbb4",
  white: "#ffffff",
};

/** The Egypt-in-dots logo mark. */
export function OgMark({ size = 72 }: { size?: number }) {
  return (
    <div style={{ display: "flex", width: size, height: size, borderRadius: size * 0.27, background: OG.brand, alignItems: "center", justifyContent: "center" }}>
      <svg width={size * 0.9} height={size * 0.9} viewBox="0 0 40 40">
        {LOGO_DOTS.map(([cx, cy, r, o]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill={OG.brass} fillOpacity={o} />
        ))}
      </svg>
    </div>
  );
}

/** "AQAR ARENA" next to the mark. */
export function OgBrand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
      <OgMark />
      <div style={{ display: "flex", fontSize: 34, letterSpacing: 8, color: OG.white }}>
        <span style={{ fontWeight: 700 }}>AQAR</span>
        <span style={{ marginLeft: 14, color: OG.brass }}>ARENA</span>
      </div>
    </div>
  );
}

/** A faint field of dots in the background, echoing the logo. */
export function OgDotField() {
  const dots: React.ReactElement[] = [];
  for (let y = 0; y < 14; y++) {
    for (let x = 0; x < 26; x++) {
      const fade = Math.max(0, 1 - Math.hypot(x - 21, y - 10) / 14);
      if (fade < 0.05) continue;
      dots.push(<circle key={`${x}-${y}`} cx={x * 48 + 24} cy={y * 48 + 24} r={3 + fade * 3} fill={OG.brass} fillOpacity={fade * 0.35} />);
    }
  }
  return (
    <svg width={1200} height={630} viewBox="0 0 1200 630" style={{ position: "absolute", top: 0, left: 0 }}>
      {dots}
    </svg>
  );
}
