import Link from "next/link";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { BrandMark } from "./brand-mark";
import { CompareLink } from "./compare/compare-link";
import { LanguageSwitcher } from "./language-switcher";
import { NavLinks } from "./nav-links";
import { FavoritesLink } from "./favorites/favorites-link";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const target = locale === "ar" ? "en" : "ar";

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-ground/72 shadow-(--header-shadow) backdrop-blur-xl backdrop-saturate-150 print:hidden">
      <div className="mx-auto flex min-h-17 max-w-310 flex-wrap items-center gap-x-4 gap-y-1 px-4 sm:px-6 md:gap-x-5 xl:gap-x-9">
        <Link href={`/${locale}`} aria-label={dict.nav.home} className="py-3 text-ink no-underline hover:text-ink">
          <BrandMark />
        </Link>

        {/* Phones: its own swipeable row under the logo. Desktop: inline between logo and buttons. */}
        <nav
          aria-label={dict.nav.label}
          className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-x-1 [scrollbar-width:none] overflow-x-auto px-4 whitespace-nowrap max-md:[mask-image:linear-gradient(to_left,transparent,#000_40px)] max-md:rtl:[mask-image:linear-gradient(to_right,transparent,#000_40px)] md:order-none md:mx-0 md:w-auto md:flex-1 md:px-0"
        >
          <NavLinks
            links={[
              { href: `/${locale}/projects`, label: dict.nav.projects },
              { href: `/${locale}/map`, label: dict.nav.map },
              { href: `/${locale}/developers`, label: dict.nav.developers },
              { href: `/${locale}/areas`, label: dict.nav.areas },
              { href: `/${locale}/new-launches`, label: dict.nav.newLaunches },
              { href: `/${locale}/dev`, label: dict.footer.forDevelopers },
              { href: `/${locale}/favorites`, label: dict.nav.favorites, mobileOnly: true },
            ]}
          />
        </nav>

        <div className="ms-auto flex items-center gap-1.5 py-3 sm:gap-2.5 md:ms-0">
          <ThemeToggle toDark={dict.theme.toDark} toLight={dict.theme.toLight} />
          <FavoritesLink locale={locale} label={dict.nav.favorites} className="max-md:hidden" />
          <LanguageSwitcher target={target} label={dict.language.switchTo} ariaLabel={dict.language.switchToLabel} />
          <CompareLink locale={locale} label={dict.nav.compareButton} countLabel={dict.nav.compareCount} />
        </div>
      </div>
    </header>
  );
}
