import Link from "next/link";
import { EgyptBlueprint } from "@/components/egypt-blueprint";
import { getDictionary, getLocale } from "./dictionaries";

export default async function NotFound() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const nf = dict.notFound;

  return (
    <section className="relative isolate mx-auto grid min-h-[70dvh] max-w-310 items-center gap-10 px-4 py-24 sm:px-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="flex flex-col items-start gap-5">
        <span className="font-display text-sm tracking-[0.14em] text-brass">{nf.code}</span>
        <h1 className="font-display text-4xl font-light tracking-[-0.015em] sm:text-[52px]">{nf.title}</h1>
        <p className="max-w-[48ch] text-lg text-body">{nf.text}</p>
        <div className="flex flex-wrap items-center gap-3 pt-2">
          <Link
            href={`/${locale}/projects`}
            className="press inline-flex min-h-12 items-center rounded-full bg-brass-light px-6 font-semibold text-deep no-underline hover:bg-brass-dark hover:text-deep"
          >
            {nf.projects}
          </Link>
          <Link href={`/${locale}`} className="press inline-flex min-h-12 items-center rounded-full px-5 font-medium no-underline">
            {nf.back}
          </Link>
        </div>
      </div>
      <EgyptBlueprint locale={locale} className="mx-auto hidden h-[420px] w-auto opacity-70 md:block" />
    </section>
  );
}
