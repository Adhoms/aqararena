import type { Metadata } from "next";
import { Suspense } from "react";
import { Alexandria, IBM_Plex_Sans_Arabic } from "next/font/google";
import "../globals.css";
import "./admin.css";

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600"],
});

const alexandria = Alexandria({
  variable: "--font-alexandria",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500"],
});

// Every admin page checks the session per request, so navigations here wait for the server.
// That's fine for an internal tool; it opts the area out of instant-navigation validation.
export const instant = false;

export const metadata: Metadata = {
  title: "لوحة التحكم | AqarArena",
  robots: { index: false, follow: false },
};

// The admin area is its own root layout: Arabic, right-to-left, no public header or footer.
// Every page reads the session cookie, so the content streams in behind one Suspense boundary.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="ar" dir="rtl" className={`${plexArabic.variable} ${alexandria.variable} h-full antialiased`}>
      <body className="min-h-full font-sans leading-relaxed">
        <Suspense fallback={<p className="p-8 text-muted">جارٍ التحميل…</p>}>{children}</Suspense>
      </body>
    </html>
  );
}
