import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/i18n/config";
import type { Developer } from "@/lib/catalog";
import { telHref, websiteHref, whatsappHref } from "@/lib/format";
import { trackAttr, type StatEvent } from "@/lib/stats-events";

export type Row = { key: string; label: string; value: string; href?: string; external?: boolean };

export function contactRows(developer: Developer, dict: Dictionary, locale: Locale): Row[] {
  const c = developer.contacts;
  const p = dict.projectPage;
  const rows: (Row | false)[] = [
    !!c.hotline && { key: "hotline", label: p.hotline, value: c.hotline, href: telHref(c.hotline) },
    !!c.salesPhone && { key: "sales", label: p.sales, value: c.salesPhone, href: telHref(c.salesPhone) },
    !!c.whatsapp && { key: "whatsapp", label: p.whatsapp, value: c.whatsapp, href: whatsappHref(c.whatsapp), external: true },
    !!c.email && { key: "email", label: p.email, value: c.email, href: c.email.includes("[") ? undefined : `mailto:${c.email}` },
    !!c.website && { key: "website", label: p.website, value: c.website, href: websiteHref(c.website), external: true },
    !!c.hqAddress && { key: "hq", label: p.hq, value: c.hqAddress[locale] },
  ];
  return rows.filter((r): r is Row => Boolean(r));
}

const ROW_EVENT: Record<string, StatEvent> = { hotline: "CALL", sales: "CALL", whatsapp: "WHATSAPP", website: "WEBSITE", email: "EMAIL" };

/** For counting a click on a contact row in the project's statistics (rows without an event, like the address, aren't counted). */
export function contactTrack(row: Row, projectSlug?: string) {
  const event = ROW_EVENT[row.key];
  return projectSlug && event && row.href ? { "data-track": trackAttr(event, projectSlug) } : {};
}

/** A row that becomes a link once the number/address is real (placeholders like "[19XXX]" stay plain text). */
function RowLink({ row, className, children, trackSlug }: { row: Row; className: string; children: React.ReactNode; trackSlug?: string }) {
  if (!row.href) return <div className={className}>{children}</div>;
  return (
    <a href={row.href} className={className} {...contactTrack(row, trackSlug)} {...(row.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
      {children}
    </a>
  );
}

/** Stacked list for side cards: the hotline is highlighted, the rest are outlined rows. */
/** `trackSlug`: on a project page, clicks count in that project's statistics. */
export function ContactStack({
  developer,
  dict,
  locale,
  limit,
  trackSlug,
}: {
  developer: Developer;
  dict: Dictionary;
  locale: Locale;
  limit?: number;
  trackSlug?: string;
}) {
  const rows = contactRows(developer, dict, locale).slice(0, limit);
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((row, i) => (
        <li key={row.key}>
          <RowLink
            row={row}
            trackSlug={trackSlug}
            className={`flex min-h-12 items-center justify-between gap-3 rounded-2xl px-4 no-underline ${
              i === 0 ? "min-h-13 bg-brand text-white hover:bg-brand-2 hover:text-white" : "border border-line-strong text-ink hover:border-ink hover:text-ink"
            }`}
          >
            <span>{row.label}</span>
            <span dir={row.key === "hq" ? undefined : "ltr"} className={i === 0 ? "font-display text-lg font-medium text-brass-light" : "font-semibold"}>
              {row.value}
            </span>
          </RowLink>
        </li>
      ))}
    </ul>
  );
}

/** Grid of contact tiles for the dark contact band. */
export function ContactGrid({ developer, dict, locale, trackSlug }: { developer: Developer; dict: Dictionary; locale: Locale; trackSlug?: string }) {
  return (
    <ul className="grid flex-[1_1_420px] grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
      {contactRows(developer, dict, locale).map((row) => (
        <li key={row.key}>
          <RowLink
            row={row}
            trackSlug={trackSlug}
            className="flex h-full min-h-11 flex-col gap-0.5 rounded-2xl bg-brand-2 px-4.5 py-4 text-white no-underline hover:bg-brand-3 hover:text-white"
          >
            <span className="text-[13px] text-on-dark-muted">{row.label}</span>
            <span dir={row.key === "hq" ? undefined : "ltr"} className="text-start font-display text-[17px] font-medium rtl:text-end">
              {row.value}
            </span>
          </RowLink>
        </li>
      ))}
    </ul>
  );
}
