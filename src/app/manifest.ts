import type { MetadataRoute } from "next";

// Lets phones add the site to the home screen as an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AqarArena · عقار أرينا",
    short_name: "AqarArena",
    description: "كل مشروعات المطورين العقاريين في مصر: الأسعار وأنظمة السداد والماستر بلان وأرقام المطور الرسمية.",
    start_url: "/ar",
    scope: "/",
    display: "standalone",
    dir: "rtl",
    lang: "ar",
    background_color: "#f4f1ea",
    theme_color: "#1d4a42",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
