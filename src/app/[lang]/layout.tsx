import Script from "next/script";
import type { Metadata } from "next";
import { Alexandria, IBM_Plex_Sans_Arabic } from "next/font/google";
import { directionOf, locales } from "@/i18n/config";
import { AmbientBackground } from "@/components/ambient-background";
import { CompareTray } from "@/components/compare/compare-tray";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Spotlight } from "@/components/spotlight";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
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
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://aqararena.vercel.app"),
    title: { default: dict.meta.title, template: "%s | AqarArena" },
    description: dict.meta.description,
    alternates: {
      languages: Object.fromEntries(locales.map((l) => [l, `/${l}`])),
    },
    openGraph: {
      type: "website",
      siteName: "AqarArena",
      title: dict.meta.title,
      description: dict.meta.description,
      locale: locale === "ar" ? "ar_EG" : "en_US",
    },
    twitter: { card: "summary_large_image", title: dict.meta.title, description: dict.meta.description },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={`${plexArabic.variable} ${alexandria.variable} h-full antialiased`}
      // The inline script below may set data-theme="dark" before React loads.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col font-sans leading-relaxed">
        <a
          href="#main"
          className="press fixed top-3 start-3 z-50 -translate-y-24 rounded-full bg-brass-light px-5 py-2.5 font-medium text-deep no-underline transition-transform focus:translate-y-0 hover:text-deep"
        >
          {dict.nav.skip}
        </a>
        <AmbientBackground locale={locale} />
        <Spotlight />
        <p className="bg-brass-soft px-4 py-1.5 text-center text-xs text-brass-dark print:hidden">{dict.demoNotice}</p>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="flex-1 outline-none">{children}</main>
        <SiteFooter />
        <CompareTray
          locale={locale}
          labels={{
            tray: fill(dict.common.trayLabel, { n: "{n}", max: MAX_COMPARE }),
            compareNow: dict.common.compareNow,
            clear: dict.common.clearCompare,
          }}
        />
        {/* Vercel Web Analytics and Speed Insights: cookieless page views and real-visitor speed.
            Only on Vercel, where these scripts are served. */}
        {process.env.VERCEL && (
          <>
            <Script id="vercel-insights-queue" strategy="afterInteractive">
              {"window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};window.si=window.si||function(){(window.siq=window.siq||[]).push(arguments)};"}
            </Script>
            <Script src="/_vercel/insights/script.js" strategy="afterInteractive" />
            <Script src="/_vercel/speed-insights/script.js" strategy="afterInteractive" />
          </>
        )}
      </body>
    </html>
  );
}
