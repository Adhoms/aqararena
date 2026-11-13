import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { contactRows, contactTrack } from "@/components/contact-list";
import { TrackView } from "@/components/stats/tracker";
import { trackAttr } from "@/lib/stats-events";
import { PrintButton, ShareButton } from "@/components/share-button";
import { Container, Eyebrow } from "@/components/ui";
import { WhatsAppShare } from "@/components/whatsapp-share";
import { getDeveloper, getProject, listProjectSlugs, paymentBreakdown, paymentSchedule, unitName } from "@/lib/catalog";
import { fill, formatMoney, formatNumber } from "@/lib/format";
import { SITE_URL } from "@/lib/site";
import { getDictionary, getLocale } from "../../../dictionaries";

// A printable offer sheet for one unit type on one payment plan: what is paid and when, with the
// developer's own numbers to call. It is the calculator's result laid out as a page, so it reads
// the same figures (lib/catalog/payment.ts). Chosen with ?u=<unit type code>&plan=<plan number>.

export async function generateStaticParams() {
  return (await listProjectSlugs()).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/projects/[slug]/offer">): Promise<Metadata> {
  const [{ slug }, locale, dict] = await Promise.all([params, getLocale(), getDictionary()]);
  const project = await getProject(slug);
  if (!project) return {};
  // One sheet per choice of unit and plan: the project page is the one to index.
  return { title: fill(dict.offer.metaTitle, { name: project.name[locale] }), robots: { index: false, follow: true } };
}

export default function Page({ params, searchParams }: PageProps<"/[lang]/projects/[slug]/offer">) {
  return (
    <Container className="flex max-w-3xl flex-col gap-5 pt-8 pb-24 print:max-w-none print:p-0">
      <Suspense fallback={<OfferSkeleton />}>
        <OfferSheet params={params} searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function OfferSkeleton() {
  const dict = await getDictionary();
  return (
    <div role="status" className="h-160 animate-pulse rounded-3xl bg-divider">
      <span className="sr-only">{dict.offer.loading}</span>
    </div>
  );
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

async function OfferSheet({ params, searchParams }: Pick<PageProps<"/[lang]/projects/[slug]/offer">, "params" | "searchParams">) {
  const [{ slug }, query, locale, dict] = await Promise.all([params, searchParams, getLocale(), getDictionary()]);
  const project = await getProject(slug);
  if (!project || project.paymentPlans.length === 0) notFound();
  // The sheet carries today's date, so it is drawn when asked for, never ahead of time.
  await connection();
  const issued = new Date();
  const developer = await getDeveloper(project.developerSlug);
  if (!developer) notFound();

  // An unknown unit or plan falls back to the cheapest unit on the first plan.
  const cheapestFirst = [...project.typologies].sort((a, b) => a.priceFrom - b.priceFrom);
  const unit = cheapestFirst.find((t) => t.code === first(query.u)) ?? cheapestFirst[0];
  const planIndex = Number(first(query.plan));
  const plan = project.paymentPlans[Number.isInteger(planIndex) ? planIndex : 0] ?? project.paymentPlans[0];

  const o = dict.offer;
  const c = dict.calculator;
  const p = dict.projectPage;
  const b = paymentBreakdown(unit.priceFrom, plan, project.fees.maintenancePct);
  const money = (n: number) => formatMoney(Math.round(n), locale);
  const dateLocale = locale === "ar" ? "ar-EG-u-nu-latn" : "en-GB";
  const longDate = (d: Date) => new Intl.DateTimeFormat(dateLocale, { dateStyle: "long" }).format(d);
  const m2 = locale === "ar" ? "م²" : "m²";
  const name = unitName(unit, dict.subTypes, locale);
  const place = [project.district[locale], dict.areas[project.areaSlug]].filter(Boolean).join(locale === "ar" ? "، " : ", ");

  const unitFacts: [string, string][] = [
    [o.type, dict.subTypes[unit.subType]],
    [p.unitArea, `${formatNumber(unit.buaM2, locale)} ${m2}`],
    ...(unit.bedrooms ? ([[p.rooms, fill(p.roomsValue, { bed: unit.bedrooms, bath: unit.bathrooms ?? 1 })]] as [string, string][]) : []),
    ...(unit.gardenM2 ? ([[p.outdoor, fill(p.garden, { n: unit.gardenM2 })]] as [string, string][]) : []),
    ...(unit.roofM2 ? ([[p.outdoor, fill(p.roof, { n: unit.roofM2 })]] as [string, string][]) : []),
    [p.finishing, dict.finishing[unit.finishing]],
    [o.delivery, String(project.deliveryYear)],
  ];
  const planFacts: [string, string][] = [
    [c.price, money(b.price)],
    ...(b.cash
      ? []
      : ([
          [p.planYears, fill(dict.common.years, { n: plan.years })],
          [p.planFrequency, dict.frequency[plan.frequency]],
          [c.monthlyEq, `~${money(b.monthly)}`],
          [c.firstYear, money(b.firstYear)],
        ] as [string, string][])),
  ];

  // The schedule: when, what, how much. Lines add up to the total.
  const atDelivery = fill(o.atDelivery, { year: project.deliveryYear });
  const schedule: [when: string, what: string, amount: number][] = [
    [o.atContract, b.cash ? fill(o.cashPrice, { pct: plan.cashDiscountPct ?? 0 }) : fill(o.downPayment, { pct: plan.downPaymentPct }), b.down],
    ...paymentSchedule(b).map((y): [string, string, number] => [fill(o.year, { n: y.year }), fill(o.installments, { count: y.count, amount: money(y.installment) }), y.total]),
    ...(b.delivery ? ([[atDelivery, fill(o.deliveryPayment, { pct: plan.deliveryPaymentPct }), b.delivery]] as [string, string, number][]) : []),
    ...(b.maintenance ? ([[atDelivery, fill(o.maintenance, { pct: project.fees.maintenancePct ?? 0 }), b.maintenance]] as [string, string, number][]) : []),
  ];

  const projectHref = `/${locale}/projects/${project.slug}`;
  const url = `${SITE_URL}${projectHref}/offer?u=${encodeURIComponent(unit.code)}&plan=${project.paymentPlans.indexOf(plan)}`;
  const message = [
    `${name} · ${project.name[locale]} (${developer.name[locale]})`,
    `${c.price}: ${money(b.price)}`,
    `${b.cash ? c.cashPrice : c.atContract}: ${money(b.down)}`,
    ...(b.cash ? [] : [`${c.installment}: ${money(b.installment)} ${dict.frequencyPer[plan.frequency]}`]),
  ].join("\n");
  const contacts = contactRows(developer, dict, locale);
  const tool = "press inline-flex min-h-12 items-center rounded-full border border-line-strong bg-surface px-5 text-[15px] text-ink hover:border-ink hover:text-ink";

  return (
    <>
      {/* The sheet is laid out for A4, the paper size used in Egypt. */}
      <style>{"@page { size: A4; margin: 12mm; }"}</style>
      <TrackView slug={project.slug} event="OFFER" />
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`${projectHref}#prices`} className="font-semibold">
          {locale === "ar" ? "→" : "←"} {o.change}
        </Link>
        <div className="flex flex-wrap gap-2.5">
          <WhatsAppShare text={message} url={url} label={dict.whatsappShare.send} className={tool} track={trackAttr("SHARE", project.slug)} />
          <ShareButton label={o.share} copiedLabel={p.copied} title={fill(o.metaTitle, { name: project.name[locale] })} className={tool} />
          <PrintButton label={o.print} className="press inline-flex min-h-12 items-center rounded-full bg-brand px-5.5 text-[15px] font-medium text-white hover:bg-brand-2" />
        </div>
      </div>

      <article className="paper flex flex-col gap-7 rounded-3xl border border-line p-6 sm:p-10 print:gap-4 print:rounded-none print:border-0 print:p-0 print:[zoom:0.85]">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-6 sm:flex-nowrap print:pb-3">
          <div className="flex min-w-0 flex-col gap-2">
            <Eyebrow>{o.eyebrow}</Eyebrow>
            <h1 className="font-display text-3xl font-normal tracking-tight sm:text-4xl print:text-3xl">{name}</h1>
            <p className="text-body">
              <Link href={projectHref} className="font-semibold text-ink">
                {project.name[locale]}
              </Link>{" "}
              · {fill(o.by, { dev: developer.name[locale], place })}
            </p>
          </div>
          <div className="flex flex-col gap-1 text-[13px] text-muted sm:shrink-0 sm:text-end">
            <span dir="ltr" className="font-display text-base font-medium tracking-[0.16em] text-ink">
              AQAR ARENA
            </span>
            <span>{fill(o.issued, { date: longDate(issued) })}</span>
            {project.pricesUpdated && <span>{fill(o.pricesUpdated, { date: longDate(new Date(project.pricesUpdated)) })}</span>}
          </div>
        </header>

        <div className="grid gap-6 sm:grid-cols-2">
          {(
            [
              [o.unitTitle, unitFacts],
              [`${o.planTitle}: ${plan.name[locale]}`, planFacts],
            ] as const
          ).map(([title, facts]) => (
            <section key={title} className="flex flex-col gap-3">
              <h2 className="font-display text-lg font-medium">{title}</h2>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1.5 text-sm">
                {facts.map(([label, value], i) => (
                  <div key={i} className="contents">
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-end font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-medium">{o.scheduleTitle}</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line-strong text-start text-xs text-muted">
                <th scope="col" className="py-2 pe-3 text-start font-semibold">
                  {o.when}
                </th>
                <th scope="col" className="py-2 pe-3 text-start font-semibold">
                  {o.what}
                </th>
                <th scope="col" className="py-2 text-end font-semibold">
                  {o.amount}
                </th>
              </tr>
            </thead>
            <tbody>
              {schedule.map(([when, what, amount], i) => (
                <tr key={i} className="border-b border-divider">
                  <th scope="row" className="py-2.5 pe-3 text-start font-medium whitespace-nowrap print:py-1">
                    {when}
                  </th>
                  <td className="py-2.5 pe-3 text-body print:py-1">{what}</td>
                  <td className="py-2.5 text-end font-semibold whitespace-nowrap print:py-1">{money(amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={2} className="pt-3.5 text-start font-display text-base font-medium print:pt-2">
                  {o.total}
                </th>
                <td className="pt-3.5 text-end font-display text-xl font-medium whitespace-nowrap print:pt-2">{money(b.total)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="text-xs text-muted">{o.priceNote}</p>
        </section>

        {contacts.length > 0 && (
          <section className="flex break-inside-avoid flex-col gap-3 rounded-2xl bg-brass-soft p-5 print:gap-2 print:p-3.5">
            <h2 className="font-display text-lg font-medium">{fill(o.contactTitle, { dev: developer.name[locale] })}</h2>
            <dl className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-x-6 gap-y-2.5 text-sm">
              {contacts.map((row) => (
                <div key={row.key} className="flex flex-col">
                  <dt className="text-xs text-muted">{row.label}</dt>
                  <dd dir={row.key === "hq" ? undefined : "ltr"} className="font-semibold rtl:text-end">
                    {row.href ? (
                      <a href={row.href} className="text-ink" {...contactTrack(row, project.slug)} {...(row.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                        {row.value}
                      </a>
                    ) : (
                      row.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        <footer className="flex break-inside-avoid flex-col gap-1 border-t border-line pt-5 text-xs leading-relaxed text-muted print:pt-2.5">
          <p>{o.disclaimer}</p>
          <p dir="ltr" className="rtl:text-end">
            {url.replace(/^https?:\/\//, "")}
          </p>
        </footer>
      </article>
    </>
  );
}
