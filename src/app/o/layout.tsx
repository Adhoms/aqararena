import type { Metadata } from "next";
import { Alexandria, IBM_Plex_Sans_Arabic } from "next/font/google";
import "../globals.css";
import "./offer.css";

// The site's own faces, self-hosted by the build. The PDF browser on the server has no Arabic font
// of its own (and the function no system fonts), so the offer must never fall back to one.
const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic", "latin"], weight: ["400", "500", "600"] });
const alexandria = Alexandria({ variable: "--font-alexandria", subsets: ["arabic", "latin"], weight: ["300", "400", "500"] });

// Every offer is read from the database per request, and the page waits for it: no Suspense, no
// placeholder, so a link that doesn't open an offer never flashes an empty sheet first.
export const instant = false;

export const metadata: Metadata = {
  title: "عرض سعر · Price offer · AqarArena",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

// The client's offer is its own root layout: no site header or footer, always light. The offer's
// language and direction are set by the page on its own <main>, since only the offer knows them.
export default function OfferLayout({ children }: LayoutProps<"/o">) {
  return (
    <html lang="ar" className={`${plexArabic.variable} ${alexandria.variable} antialiased`}>
      <body className="min-h-dvh bg-ground font-sans leading-relaxed text-ink print:bg-white">
        {children}
      </body>
    </html>
  );
}
