import type { Metadata } from "next";
import { Alexandria, IBM_Plex_Sans_Arabic } from "next/font/google";
import { directionOf, locales } from "@/i18n/config";
import { AmbientBackground } from "@/components/ambient-background";
import { CompareTray } from "@/components/compare/compare-tray";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { MAX_COMPARE } from "@/lib/compare";
import { fill } from "@/lib/format";
import { getDictionary, getLocale } from "./dictionaries";
import "../globals.css";

// Body text: covers Arabic and Latin, so one family serves both languages.
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600"],
});

// Headings and figures: a light geometric display face with Arabic and Latin.
const alexandria = Alexandria({
  variable: "--font-alexandria",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500"],
});

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return {
    title: { default: dict.meta.title, template: "%s | AqarArena" },
    description: dict.meta.description,
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={`${plexArabic.variable} ${alexandria.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans leading-relaxed">
        <AmbientBackground locale={locale} />
        <p className="bg-brass-soft px-4 py-1.5 text-center text-xs text-brass-dark print:hidden">{dict.demoNotice}</p>
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <CompareTray
          locale={locale}
          labels={{
            tray: fill(dict.common.trayLabel, { n: "{n}", max: MAX_COMPARE }),
            compareNow: dict.common.compareNow,
            clear: dict.common.clearCompare,
          }}
        />
      </body>
    </html>
  );
}
