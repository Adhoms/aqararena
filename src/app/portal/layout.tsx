import type { Metadata } from "next";
import { Suspense } from "react";
import { Alexandria, IBM_Plex_Sans_Arabic } from "next/font/google";
import "../globals.css";
import "../admin/admin.css";

const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic", "latin"], weight: ["400", "500", "600"] });
const alexandria = Alexandria({ variable: "--font-alexandria", subsets: ["arabic", "latin"], weight: ["300", "400", "500"] });

// Every portal page checks the developer's session per request.
export const instant = false;

export const metadata: Metadata = {
  title: "بوابة المطورين | AqarArena",
  robots: { index: false, follow: false },
};

// The developer portal is its own root layout: Arabic, right-to-left, the admin's plain styles.
export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return (
    <html lang="ar" dir="rtl" className={`${plexArabic.variable} ${alexandria.variable} h-full antialiased`}>
      <body className="min-h-full font-sans leading-relaxed">
        <Suspense fallback={<p className="p-8 text-muted">جارٍ التحميل…</p>}>{children}</Suspense>
      </body>
    </html>
  );
}
