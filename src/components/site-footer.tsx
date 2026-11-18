import Link from "next/link";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { BrandMark } from "./brand-mark";

export async function SiteFooter() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  // Tall enough to tap comfortably on a phone.
  const link = "w-fit py-2 text-body no-underline transition-colors hover:text-brass-dark";

  return (
    <footer className="relative mt-10 border-t border-line bg-surface text-body print:hidden">
      <div aria-hidden="true" className="hairline" />
      <div className="mx-auto flex max-w-310 flex-col gap-9 px-4 pt-14 pb-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 text-sm sm:grid-cols-2 lg:grid-cols-5">
          <div className="flex flex-col gap-3">
            <span className="text-ink">
              <BrandMark />
            </span>
            <p className="max-w-xs">{dict.footer.tagline}</p>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-ink">{dict.footer.explore}</span>
            <Link href={`/${locale}/projects`} className={link}>{dict.nav.projects}</Link>
            <Link href={`/${locale}/developers`} className={link}>{dict.nav.developers}</Link>
            <Link href={`/${locale}/areas`} className={link}>{dict.nav.areas}</Link>
            <Link href={`/${locale}/new-launches`} className={link}>{dict.nav.newLaunches}</Link>
            <Link href={`/${locale}/compare`} className={link}>{dict.nav.compare}</Link>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-ink">{dict.footer.forDevelopers}</span>
            <Link href={`/${locale}/dev`} className={link}>{dict.footer.listProject}</Link>
            <Link href="/portal/login" className={link}>{dict.footer.developerLogin}</Link>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-ink">{dict.footer.company}</span>
            <Link href={`/${locale}/about`} className={link}>{dict.footer.about}</Link>
            <Link href={`/${locale}/contact`} className={link}>{dict.footer.contactUs}</Link>
            <Link href={`/${locale}/privacy`} className={link}>{dict.footer.privacy}</Link>
            <Link href={`/${locale}/terms`} className={link}>{dict.footer.terms}</Link>
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-ink">{dict.footer.language}</span>
            <span>
              <b className="text-ink">{locale === "ar" ? "العربية" : "English"}</b>
              {" · "}
              <a href={locale === "ar" ? "/en" : "/ar"} hrefLang={locale === "ar" ? "en" : "ar"} className={link}>
                {dict.language.switchTo}
              </a>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-line pt-5 text-[13px] text-muted">
          <p>{dict.footer.neutrality}</p>
          <p>
            © 2026 <span dir="ltr">AqarArena</span> · {dict.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
