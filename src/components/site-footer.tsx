import Link from "next/link";
import { getDictionary, getLocale } from "@/app/[lang]/dictionaries";
import { BrandMark } from "./brand-mark";

export async function SiteFooter() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const link = "text-on-dark no-underline hover:text-white";

  return (
    <footer className="bg-deep text-on-dark print:hidden">
      <div className="mx-auto flex max-w-310 flex-col gap-9 px-4 pt-14 pb-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <span className="text-white">
              <BrandMark onDark />
            </span>
            <p className="max-w-xs">{dict.footer.tagline}</p>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-white">{dict.footer.explore}</span>
            <Link href={`/${locale}/projects`} className={link}>{dict.nav.projects}</Link>
            <Link href={`/${locale}/developers`} className={link}>{dict.nav.developers}</Link>
            <Link href={`/${locale}#areas`} className={link}>{dict.nav.areas}</Link>
            <Link href={`/${locale}/compare`} className={link}>{dict.nav.compare}</Link>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-white">{dict.footer.forDevelopers}</span>
            {/* Pages for developers arrive with the developer portal (roadmap phase 2). */}
            <span>{dict.footer.listProject}</span>
            <span>{dict.footer.plans}</span>
            <span>{dict.footer.contactUs}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="font-semibold text-white">{dict.footer.language}</span>
            <span>
              <b className="text-white">{locale === "ar" ? "العربية" : "English"}</b>
              {" · "}
              <a href={locale === "ar" ? "/en" : "/ar"} hrefLang={locale === "ar" ? "en" : "ar"} className={link}>
                {dict.language.switchTo}
              </a>
            </span>
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-brand-2 pt-5 text-[13px] text-on-dark-muted">
          <p>{dict.footer.neutrality}</p>
          <p>
            © 2026 <span dir="ltr">AqarArena</span> · {dict.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
