import Link from "next/link";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { BrandMark } from "./brand-mark";
import { CompareLink } from "./compare/compare-link";
import { LanguageSwitcher } from "./language-switcher";
import { NavLinks } from "./nav-links";

export async function SiteHeader() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const target = locale === "ar" ? "en" : "ar";

  return (
    <header className="border-b border-line bg-surface print:hidden">
      <div className="mx-auto flex min-h-19 max-w-310 flex-wrap items-center gap-x-4 gap-y-1 px-4 sm:px-6 md:gap-x-9">
        <Link href={`/${locale}`} aria-label={dict.nav.home} className="py-3 text-ink no-underline hover:text-ink">
          <BrandMark />
        </Link>

        {/* Phones: its own swipeable row under the logo. Desktop: inline between logo and buttons. */}
        <nav
          aria-label={dict.nav.label}
          className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-x-7 overflow-x-auto px-4 whitespace-nowrap md:order-none md:mx-0 md:w-auto md:flex-1 md:px-0"
        >
          <NavLinks
            links={[
              { href: `/${locale}/projects`, label: dict.nav.projects },
              { href: `/${locale}/map`, label: dict.nav.map },
              { href: `/${locale}/developers`, label: dict.nav.developers },
              { href: `/${locale}#areas`, label: dict.nav.areas },
              { href: `/${locale}/compare`, label: dict.nav.compare },
            ]}
          />
        </nav>

        <div className="ms-auto flex items-center gap-2 py-3 sm:gap-2.5 md:ms-0">
          <LanguageSwitcher target={target} label={dict.language.switchTo} ariaLabel={dict.language.switchToLabel} />
          <CompareLink locale={locale} label={dict.nav.compareButton} countLabel={dict.nav.compareCount} />
        </div>
      </div>
    </header>
  );
}
