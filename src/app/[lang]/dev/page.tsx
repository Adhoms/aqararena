import type { Metadata } from "next";
import Link from "next/link";
import { AddressBook, Buildings, CheckCircle, FilePdf, ListChecks, MagnifyingGlass, Timer, UserPlus, UsersThree } from "@phosphor-icons/react/ssr";
import { Container, Eyebrow, Pill, SectionHeading } from "@/components/ui";
import { pageAlternates } from "@/lib/site";
import { getDictionary, getLocale } from "../dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  return {
    title: dict.forDevelopersPage.metaTitle,
    description: dict.forDevelopersPage.metaDescription,
    alternates: pageAlternates(locale, "/dev"),
  };
}

function Ctas({ request, login, onDark = false }: { request: string; login: string; onDark?: boolean }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link
        href="/portal/register"
        className={`inline-flex min-h-12 items-center rounded-full px-6 font-medium no-underline transition-colors ${
          onDark ? "bg-brass-light text-deep hover:bg-[#d8bc86] hover:text-deep" : "bg-brand text-white hover:bg-brand-2 hover:text-white"
        }`}
      >
        {request}
      </Link>
      <Link
        href="/portal/login"
        className={`inline-flex min-h-12 items-center rounded-full border px-6 font-medium no-underline transition-colors ${
          onDark ? "border-white/40 text-white hover:border-white hover:text-white" : "border-line-strong text-ink hover:border-ink hover:text-ink"
        }`}
      >
        {login}
      </Link>
    </div>
  );
}

const featureIcons = [UserPlus, ListChecks, MagnifyingGlass, Timer, FilePdf, AddressBook];

export default async function DevPage() {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);
  const t = dict.forDevelopersPage;

  return (
    <>
      <section className="relative isolate overflow-hidden bg-deep text-white">
        <Container className="flex flex-col gap-7 pt-20 pb-20 sm:pt-28 sm:pb-24">
          <span className="flex items-center gap-3">
            <span aria-hidden="true" className="h-px w-10 bg-brass-light/70" />
            <Eyebrow onDark>{t.eyebrow}</Eyebrow>
          </span>
          <h1 className="max-w-4xl font-display text-[40px] leading-[1.2] font-light tracking-[-0.02em] sm:text-[58px] ltr:leading-[1.05]">{t.title}</h1>
          <p className="max-w-[60ch] text-lg leading-relaxed text-on-dark">{t.sub}</p>
          <Ctas request={t.ctaRequest} login={t.ctaLogin} onDark />
          {t.portalNote && <p className="text-sm text-on-dark-muted">{t.portalNote}</p>}
        </Container>
      </section>

      <Container className="flex flex-col gap-9 pt-20 sm:pt-24">
        <SectionHeading title={t.productsTitle} />
        <div className="grid gap-5 lg:grid-cols-2">
          <article className="flex flex-col gap-4 rounded-3xl border border-line bg-surface p-7 sm:p-9">
            <span className="flex flex-wrap items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-brand/10 text-brass">
                <Buildings size={22} weight="duotone" aria-hidden="true" />
              </span>
              <h3 className="font-display text-2xl font-medium">{t.portalCard.title}</h3>
              <Pill tone="brass">{t.portalCard.badge}</Pill>
            </span>
            <p className="leading-relaxed text-body">{t.portalCard.text}</p>
            <Link
              href="/portal/register"
              className="mt-auto inline-flex min-h-12 items-center self-start rounded-full bg-brand px-6 font-medium text-white no-underline transition-colors hover:bg-brand-2 hover:text-white"
            >
              {t.portalCard.cta}
            </Link>
          </article>
          <article className="flex flex-col gap-4 rounded-3xl bg-brand p-7 text-white sm:p-9">
            <span className="flex flex-wrap items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-full bg-white/10 text-brass-light">
                <UsersThree size={22} weight="duotone" aria-hidden="true" />
              </span>
              <h3 dir="ltr" className="font-display text-2xl font-medium">
                {t.salesCard.title}
              </h3>
              <span className="inline-flex rounded-full bg-white/10 px-3 py-0.5 text-xs font-medium text-white">{t.salesCard.badge}</span>
            </span>
            <p className="leading-relaxed text-on-dark">{t.salesCard.text}</p>
            <div className="mt-auto flex flex-wrap gap-3">
              <Link
                href={`/${locale}/contact?kind=REQUEST`}
                className="inline-flex min-h-12 items-center rounded-full bg-brass-light px-6 font-medium text-deep no-underline transition-colors hover:bg-[#d8bc86] hover:text-deep"
              >
                {t.salesCard.cta}
              </Link>
              <Link
                href="/sales/login"
                className="inline-flex min-h-12 items-center rounded-full border border-white/40 px-6 font-medium text-white no-underline transition-colors hover:border-white hover:text-white"
              >
                {t.salesCard.login}
              </Link>
            </div>
          </article>
        </div>
      </Container>

      <Container className="flex flex-col gap-9 pt-20 sm:pt-24">
        <SectionHeading title={t.benefitsTitle} />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {t.benefits.map((b) => (
            <li key={b.title} className="flex flex-col gap-2 rounded-3xl border border-line bg-surface p-6">
              <span className="font-display text-xl font-medium text-ink">{b.title}</span>
              <p className="text-sm leading-relaxed text-body">{b.text}</p>
            </li>
          ))}
        </ul>
      </Container>

      <Container className="grid gap-10 pt-20 sm:pt-24 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-8">
          <SectionHeading title={t.stepsTitle} />
          <ol className="flex flex-col gap-6">
            {t.steps.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="flex size-11 flex-none items-center justify-center rounded-full bg-brand font-display text-lg text-white">{i + 1}</span>
                <span className="flex flex-col gap-1">
                  <span className="font-display text-xl font-medium text-ink">{s.title}</span>
                  <span className="text-body">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-4 rounded-3xl bg-brand p-6 text-white sm:p-8">
          <span className="font-display text-2xl font-light">{t.includesTitle}</span>
          <ul className="flex flex-col gap-3">
            {t.includes.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <CheckCircle size={22} weight="duotone" className="mt-0.5 flex-none text-brass-light" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </Container>

      <Container className="flex flex-col gap-9 pt-20 sm:pt-24">
        <div className="flex max-w-3xl flex-col gap-3">
          <SectionHeading eyebrow={<span dir="ltr">AqarArena Sales</span>} title={t.salesTitle} />
          <p className="text-lg leading-relaxed text-body">{t.salesSub}</p>
        </div>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {t.salesFeatures.map((f, i) => {
            const Icon = featureIcons[i];
            return (
              <li key={f.title} className="relative flex flex-col gap-2 rounded-3xl border border-line bg-surface p-6">
                <Icon size={22} weight="duotone" className="text-brass" aria-hidden="true" />
                <h3 className="font-display text-xl font-medium text-ink">
                  {f.title}
                  {f.soon && <span className="sr-only"> ({t.soonBadge})</span>}
                </h3>
                <p className="text-sm leading-relaxed text-body">{f.text}</p>
                {f.soon && (
                  <span aria-hidden="true" className="absolute end-5 top-5">
                    <Pill tone="brass">{t.soonBadge}</Pill>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </Container>

      <Container className="pt-20 pb-24 sm:pt-24">
        <div className="flex flex-col items-start gap-5 rounded-3xl border border-line bg-surface p-8 sm:p-12">
          <h2 className="font-display text-[32px] font-light tracking-[-0.015em] sm:text-[42px]">{t.closingTitle}</h2>
          <p className="max-w-[56ch] text-body">{t.closingText}</p>
          <Ctas request={t.ctaRequest} login={t.ctaLogin} />
        </div>
      </Container>
    </>
  );
}
