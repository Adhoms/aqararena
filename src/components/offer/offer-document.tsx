import { LogoMark } from "@/components/brand-mark";
import { fill, telHref, websiteHref, whatsappHref } from "@/lib/format";
import type { PublicOffer } from "@/lib/sales/offer-service";
import { offerCtx, type OfferCtx } from "./context";
import { PrintOffer } from "./print-offer";
import { MasterPlanSheet, namedRows, scheduleSheets, ScheduleSheet, UnitSheet } from "./offer-sheets";
import { Fact, Filled, Ltr, Sheet } from "./sheet";

/** The client's offer: the sheets of spec section 7, and a toolbar that isn't printed. */
export function OfferDocument({ offer }: { offer: PublicOffer }) {
  const ctx = offerCtx(offer);
  const { c, snap } = ctx;
  const schedulePages = scheduleSheets(namedRows(ctx));
  const banner = offer.banner ? c.banners[offer.banner] : null;
  return (
    <main lang={offer.language} dir={offer.language === "ar" ? "rtl" : "ltr"} className="offer-doc offer-stack flex flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <div className="no-print mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3">
        <p className="m-0 text-[15px] text-body">
          {c.title} · {ctx.pick(snap.developer.nameAr, snap.developer.nameEn)}
        </p>
        <div className="flex flex-wrap gap-2.5">
          {/* The stored PDF is the offer as it went out, without a banner: never once it no longer holds. */}
          {offer.pdfUrl && !banner && (
            <a href={offer.pdfUrl} className="press inline-flex min-h-11 items-center rounded-full bg-surface px-5 text-[15px] text-ink no-underline shadow-[0_0_0_1px_var(--color-line-strong)] hover:text-ink">
              {c.download}
            </a>
          )}
          <PrintOffer label={c.print} className="press inline-flex min-h-11 items-center rounded-full bg-brand px-5 text-[15px] font-medium text-white hover:bg-brand-2" />
        </div>
      </div>
      {banner && <p className="no-print mx-auto m-0 w-full max-w-[1120px] rounded-2xl bg-brass-soft px-5 py-3 text-brass-dark">{banner}</p>}
      <CoverSheet ctx={ctx} banner={banner} />
      <ProjectSheet ctx={ctx} />
      <MasterPlanSheet ctx={ctx} />
      <UnitSheet ctx={ctx} />
      {schedulePages.map((rows, i) => (
        <ScheduleSheet key={i} ctx={ctx} rows={rows} first={i === 0} last={i === schedulePages.length - 1} page={i + 1} pages={schedulePages.length} />
      ))}
      <ContactSheet ctx={ctx} />
    </main>
  );
}

/** The developer's logo on a white tile, or its name. `beside`: the name is written next to it, so the logo is decoration. */
function DeveloperLogo({ ctx, className, beside = false }: { ctx: OfferCtx; className: string; beside?: boolean }) {
  const d = ctx.snap.developer;
  const name = ctx.pick(d.nameAr, d.nameEn);
  if (!d.logoUrl) return <span className="t-lg font-display font-normal">{name}</span>;
  return (
    <span className={`flex flex-none items-center justify-center bg-white ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element -- uploaded logo of any size and format */}
      <img src={d.logoUrl} alt={beside ? "" : name} loading={beside ? "lazy" : "eager"} className="h-full w-full object-contain" />
    </span>
  );
}

function CoverSheet({ ctx, banner }: { ctx: OfferCtx; banner: string | null }) {
  const { snap, c } = ctx;
  const u = snap.unit;
  const photo = snap.project.photo;
  return (
    <Sheet label={c.title} className={`grid bg-deep text-white ${photo ? "md:grid-cols-[1.35fr_1fr]" : ""}`}>
      {banner && (
        <p className="t-sm order-first m-0 bg-brass-light px-[4cqw] py-[0.9cqw] text-center font-medium text-deep md:absolute md:inset-x-0 md:top-0 md:z-10">
          {banner}
        </p>
      )}
      <div className={`flex flex-col justify-between gap-[4cqw] p-[5.5cqw] ${banner ? "md:pt-[7.5cqw]" : ""} [&_dt]:text-on-dark-muted`}>
        <div className="flex items-start justify-between gap-[4cqw]">
          <DeveloperLogo ctx={ctx} className="h-[7.5cqw] min-h-14 w-[21cqw] min-w-36 rounded-[1.2cqw] p-[1cqw]" />
          <span className="t-md font-display text-brass-light">{c.title}</span>
        </div>
        <div className="flex flex-col gap-[1.4cqw]">
          <h1 className="t-2xl t-display m-0">{ctx.pick(snap.project.nameAr, snap.project.nameEn)}</h1>
          <p className="t-lg m-0 flex flex-wrap items-baseline gap-x-[1.2cqw] font-display font-normal">
            <span>
              {c.unit.title} <Ltr className="text-brass-light">{u.label}</Ltr>
            </span>
            <span className="t-md text-on-dark">
              {ctx.subType(u.subType)} · <Filled template={c.unit.m2} n={<Ltr>{ctx.num(u.buaM2)}</Ltr>} />
            </span>
          </p>
          <div className="mt-[1.4cqw] flex flex-col gap-[0.3cqw]">
            <span className="t-sm text-on-dark-muted">{c.preparedFor}</span>
            <span className="t-lg font-medium">{snap.client.name}</span>
          </div>
        </div>
        <dl className="m-0 flex flex-wrap gap-x-[5cqw] gap-y-[1.2cqw]">
          <Fact label={c.issued}>{ctx.issued}</Fact>
          <Fact label={c.validUntil}>{ctx.validUntil}</Fact>
        </dl>
      </div>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded photo on the first sheet
        <img src={photo} alt="" loading="eager" className="order-first h-48 w-full object-cover md:order-none md:h-full" />
      )}
    </Sheet>
  );
}

function ProjectSheet({ ctx }: { ctx: OfferCtx }) {
  const { snap, c } = ctx;
  const p = snap.project;
  const name = ctx.pick(p.nameAr, p.nameEn);
  const description = ctx.pick(p.descriptionAr, p.descriptionEn);
  const place = ctx.pick(p.placeAr, p.placeEn);
  const delivery = new Date(`${p.deliveryDate}T00:00:00Z`).toLocaleDateString(ctx.language === "ar" ? "ar-EG-u-nu-latn" : "en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return (
    <Sheet label={name} className={`grid grid-cols-1 ${p.photo ? "md:grid-cols-[1.1fr_1fr]" : ""}`}>
      {p.photo && (
        // eslint-disable-next-line @next/next/no-img-element -- uploaded photo; lazy on screen, loaded before printing
        <img src={p.photo} alt={name} loading="lazy" className="h-56 w-full object-cover md:h-full" />
      )}
      <div className="flex min-h-0 flex-col justify-center gap-[2.2cqw] p-[4.5cqw]">
        <div className="flex flex-col gap-[0.6cqw]">
          <h2 className="t-xl t-display m-0">{name}</h2>
          {place && <p className="t-sm m-0 text-muted">{place}</p>}
        </div>
        {description && <p className="t-sm m-0 line-clamp-[9] whitespace-pre-line text-body">{description}</p>}
        <dl className="m-0 grid grid-cols-2 gap-x-[3cqw] gap-y-[1.8cqw] rounded-[1.4cqw] bg-ground p-[2.2cqw]">
          <Fact label={c.project.delivery}>{delivery}</Fact>
          {p.landFeddan !== null && (
            <Fact label={c.project.land}>
              <Filled template={c.project.feddan} n={<Ltr>{ctx.num(p.landFeddan)}</Ltr>} />
            </Fact>
          )}
          {p.unitsCount !== null && (
            <Fact label={c.project.units}>
              <Ltr>{ctx.num(p.unitsCount)}</Ltr>
            </Fact>
          )}
          {place && <Fact label={c.project.location}>{place}</Fact>}
        </dl>
      </div>
    </Sheet>
  );
}

function ContactLine({ label, value, href }: { label: string; value: string | null; href?: string }) {
  if (!value) return null;
  return (
    <Fact label={label}>
      {href ? (
        <a href={href} className="text-white no-underline hover:text-brass-light">
          <Ltr>{value}</Ltr>
        </a>
      ) : (
        <Ltr>{value}</Ltr>
      )}
    </Fact>
  );
}

function ContactSheet({ ctx }: { ctx: OfferCtx }) {
  const { snap, c } = ctx;
  const s = snap.salesperson;
  const d = snap.developer;
  const card = "m-0 flex flex-col gap-[1.6cqw] rounded-[1.6cqw] bg-white/6 p-[3cqw]";
  return (
    <Sheet label={c.contact.title} className="flex flex-col justify-between gap-[4cqw] bg-deep p-[5.5cqw] text-white [&_dt]:text-on-dark-muted">
      <div className="flex flex-col gap-[0.6cqw]">
        <h2 className="t-xl t-display m-0">{c.contact.title}</h2>
        <p className="t-sm m-0 text-on-dark-muted">{fill(c.validUntilLine, { date: ctx.validUntil })}</p>
      </div>
      <div className="grid gap-[2.4cqw] md:grid-cols-2">
        <dl className={card}>
          <Fact label={c.contact.salesperson}>
            <span className="t-lg font-display font-normal">{ctx.pick(s.nameAr, s.nameEn)}</span>
          </Fact>
          <div className="grid grid-cols-2 gap-[1.6cqw]">
            <ContactLine label={c.contact.phone} value={s.phone} href={telHref(s.phone)} />
            <ContactLine label={c.contact.whatsapp} value={s.whatsapp} href={whatsappHref(s.whatsapp ?? undefined)} />
          </div>
          <ContactLine label={c.contact.email} value={s.email} href={s.email ? `mailto:${s.email}` : undefined} />
        </dl>
        <dl className={card}>
          <div className="flex items-center gap-[1.6cqw]">
            {d.logoUrl && <DeveloperLogo ctx={ctx} beside className="h-[5cqw] min-h-11 w-[13cqw] min-w-28 rounded-[1cqw] p-[0.7cqw]" />}
            <span className="t-lg font-display font-normal">{ctx.pick(d.nameAr, d.nameEn)}</span>
          </div>
          <ContactLine label={c.contact.hotline} value={d.hotline} href={telHref(d.hotline ?? undefined)} />
          <ContactLine label={c.contact.website} value={d.website?.replace(/^https?:\/\//, "").replace(/\/$/, "") ?? null} href={websiteHref(d.website ?? undefined)} />
        </dl>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-[3cqw]">
        <p className="t-xs m-0 max-w-[62cqw] text-on-dark-muted">{c.disclaimer}</p>
        <p className="t-sm m-0 flex items-center gap-[1cqw] text-brass-light">
          <span aria-hidden="true" className="flex size-[max(30px,3.2cqw)] items-center justify-center rounded-[0.9cqw] bg-brand-2">
            <LogoMark className="size-[85%]" />
          </span>
          {c.by}
        </p>
      </div>
    </Sheet>
  );
}
