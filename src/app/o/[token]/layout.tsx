import type { Metadata } from "next";
import { Alexandria, IBM_Plex_Sans_Arabic } from "next/font/google";
import { publicOffer } from "@/components/offer/load";
import { fill } from "@/lib/format";
import { OFFER_COPY } from "@/lib/sales/offer-copy";
import "../../globals.css";
import "./offer.css";

// The site's own faces, self-hosted by the build. The PDF browser on the server has no Arabic font
// of its own (and the function no system fonts), so the offer must never fall back to one.
const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic", "latin"], weight: ["400", "500", "600"] });
const alexandria = Alexandria({ variable: "--font-alexandria", subsets: ["arabic", "latin"], weight: ["300", "400", "500"] });

// Every offer is read from the database per request, and the page waits for it: no Suspense, no
// placeholder, so a link that doesn't open an offer never flashes an empty sheet first.
export const instant = false;

type Params = { params: Promise<{ token: string }> };

/**
 * A root layout's parameter needs one value at build time. "-" is never a token, so it prerenders the
 * not-found page and touches no database; every real link is rendered when asked for.
 */
export function generateStaticParams() {
  return [{ token: "-" }];
}

/** The tab's title in the offer's language; both languages on a link that doesn't open one. */
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const offer = await publicOffer((await params).token);
  const base: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
  if (!offer) return { ...base, title: "عرض سعر · Price offer · AqarArena" };
  const c = OFFER_COPY[offer.language];
  const { snap } = offer;
  const project = offer.language === "ar" ? snap.project.nameAr || snap.project.nameEn : snap.project.nameEn || snap.project.nameAr;
  return { ...base, title: `${fill(c.shareTitle, { unit: snap.unit.label, project })} · AqarArena` };
}

// The client's offer is its own root layout, under the token so the whole page carries the offer's
// language and direction: no site header or footer, always light. A link that doesn't open an offer
// gets Arabic, with the not-found page's English line marked as such.
export default async function OfferLayout({ children, params }: LayoutProps<"/o/[token]">) {
  const offer = await publicOffer((await params).token);
  const language = offer?.language ?? "ar";
  return (
    <html lang={language} dir={language === "ar" ? "rtl" : "ltr"} className={`${plexArabic.variable} ${alexandria.variable} antialiased`}>
      <body className="min-h-dvh bg-ground font-sans leading-relaxed text-ink print:bg-white">{children}</body>
    </html>
  );
}
