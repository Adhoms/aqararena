import Link from "next/link";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { PROPERTY_CATEGORIES } from "@/lib/property";
import { BrandMark } from "./brand-mark";
import { LanguageSwitcher } from "./language-switcher";

export async function SiteHeader() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const target = locale === "ar" ? "en" : "ar";

  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-4 py-3 sm:px-6">
        <Link href={`/${locale}`} aria-label={dict.nav.home} className="text-ink">
          <BrandMark />
        </Link>

        {/* Phones: its own swipeable row under the logo. Desktop: inline between logo and switcher. */}
        <nav
          aria-label={dict.nav.label}
          className="order-last -mx-4 flex w-[calc(100%+2rem)] gap-x-5 overflow-x-auto px-4 whitespace-nowrap md:order-none md:mx-0 md:w-auto md:flex-1 md:flex-wrap md:px-0"
        >
          {PROPERTY_CATEGORIES.map((category) => (
            <Link
              key={category}
              href={`/${locale}/search?category=${category}`}
              className="py-2.5 text-ink no-underline hover:text-brand"
            >
              {dict.categories[category]}
            </Link>
          ))}
        </nav>

        <span className="ms-auto md:ms-0" />
        <LanguageSwitcher
          target={target}
          label={dict.language.switchTo}
          ariaLabel={dict.language.switchToLabel}
        />
      </div>
    </header>
  );
}
