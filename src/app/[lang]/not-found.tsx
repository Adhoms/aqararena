import Link from "next/link";
import { getDictionary, getLocale } from "./dictionaries";

export default async function NotFound() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <section className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-4 py-24 sm:px-6">
      <h1 className="text-3xl font-bold">{dict.notFound.title}</h1>
      <Link href={`/${locale}`} className="font-semibold">
        {dict.notFound.back}
      </Link>
    </section>
  );
}
