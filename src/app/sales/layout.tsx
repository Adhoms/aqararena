import type { Metadata } from "next";
import { Suspense } from "react";
import { Alexandria, IBM_Plex_Sans_Arabic } from "next/font/google";
import "../globals.css";
import "../admin/admin.css";

const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic", "latin"], weight: ["400", "500", "600"] });
const alexandria = Alexandria({ variable: "--font-alexandria", subsets: ["arabic", "latin"], weight: ["300", "400", "500"] });

// Every /sales page checks the salesperson's session per request.
export const instant = false;

export const metadata: Metadata = {
  title: { default: "AqarArena Sales", template: "%s | AqarArena Sales" },
  robots: { index: false, follow: false },
};

// AqarArena Sales is its own root layout: Arabic, right-to-left, no public header or footer.
export default function SalesLayout({ children }: LayoutProps<"/sales">) {
  return (
    <html lang="ar" dir="rtl" className={`${plexArabic.variable} ${alexandria.variable} h-full antialiased`}>
      <body className="min-h-full bg-ground font-sans leading-relaxed text-ink">
        <Suspense fallback={<p className="p-8 text-muted">جارٍ التحميل…</p>}>{children}</Suspense>
      </body>
    </html>
  );
}
