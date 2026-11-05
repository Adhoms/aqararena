import { ImageResponse } from "next/og";
import { LOGO_DOTS } from "@/components/logo-mark-data";

// The home-screen icon on iPhone and iPad: the Egypt-in-dots mark on the evergreen tile.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", alignItems: "center", justifyContent: "center", background: "#1d4a42" }}>
        <svg width={150} height={150} viewBox="0 0 40 40">
          {LOGO_DOTS.map(([cx, cy, r, o]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#e2a84a" fillOpacity={o} />
          ))}
        </svg>
      </div>
    ),
    size,
  );
}
