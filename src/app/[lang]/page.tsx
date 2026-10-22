import Link from "next/link";
import { AREA_SLUGS, PROPERTY_CATEGORIES } from "@/lib/property";
import { getDictionary, getLocale } from "./dictionaries";

const fieldClass =
  "min-h-12 w-full rounded-[10px] border border-line bg-surface px-3 text-[15px] text-ink focus:border-brand focus:outline-none";
const labelClass = "flex flex-col gap-1.5 text-[13px] font-medium text-muted";

export default async function HomePage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <>
      <section className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-14 pb-6 sm:px-6">
        <h1 className="max-w-3xl text-4xl leading-tight font-bold sm:text-5xl sm:leading-tight">
          {dict.hero.title}
        </h1>
        <p className="max-w-2xl text-lg text-muted">{dict.hero.subtitle}</p>

        <form
          action={`/${locale}/search`}
          method="get"
          aria-label={dict.search.heading}
          className="mt-3 grid grid-cols-1 items-end gap-3 rounded-2xl border border-line bg-surface p-5 sm:grid-cols-2 lg:grid-cols-5"
        >
          <label className={labelClass}>
            {dict.search.area}
            <select name="area" defaultValue="" className={fieldClass}>
              <option value="">{dict.search.anyArea}</option>
              {AREA_SLUGS.map((slug) => (
                <option key={slug} value={slug}>
                  {dict.areas[slug]}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            {dict.search.category}
            <select name="category" defaultValue="" className={fieldClass}>
              <option value="">{dict.search.anyCategory}</option>
              {PROPERTY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {dict.categories[category]}
                </option>
              ))}
            </select>
          </label>

          <label className={labelClass}>
            {dict.search.downPayment}
            <input
              name="down"
              type="number"
              min={0}
              step={50000}
              inputMode="numeric"
              placeholder={dict.search.amountPlaceholder}
              className={fieldClass}
            />
          </label>

          <label className={labelClass}>
            {dict.search.monthly}
            <input
              name="monthly"
              type="number"
              min={0}
              step={1000}
              inputMode="numeric"
              placeholder={dict.search.amountPlaceholder}
              className={fieldClass}
            />
          </label>

          <button
            type="submit"
            className="min-h-12 rounded-[10px] bg-brand px-6 font-semibold text-white hover:bg-brand-dark"
          >
            {dict.search.submit}
          </button>
        </form>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-bold">{dict.browse.title}</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PROPERTY_CATEGORIES.map((category) => (
            <li key={category}>
              <Link
                href={`/${locale}/search?category=${category}`}
                className="flex h-full flex-col gap-1 rounded-2xl border border-line bg-surface p-4 text-ink no-underline hover:border-brand"
              >
                <span className="font-semibold">{dict.categories[category]}</span>
                <span className="text-sm text-muted">{dict.categoryHints[category]}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-bold">{dict.howItWorks.title}</h2>
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {dict.howItWorks.steps.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-5">
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-soft font-bold text-brand">
                {i + 1}
              </span>
              <span className="text-lg font-semibold">{step.title}</span>
              <span className="text-muted">{step.body}</span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
