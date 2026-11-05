import type { Metadata } from "next";
import Link from "next/link";
import { InfoPageView } from "@/components/info-page";
import { PAGES } from "@/content/pages";
import { pageAlternates } from "@/lib/site";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const page = PAGES.privacy[locale];
  return { title: page.title, description: page.description, alternates: pageAlternates(locale, "/privacy") };
}

export default async function Page() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return (
    <InfoPageView
      page={PAGES.privacy[locale]}
      locale={locale}
      updatedLabel={dict.info.updated}
      after={
        <p className="rounded-2xl border border-line bg-surface p-5 text-body">
          {dict.info.questions}{" "}
          <Link href={`/${locale}/contact`}>{dict.footer.contactUs}</Link>
        </p>
      }
    />
  );
}
