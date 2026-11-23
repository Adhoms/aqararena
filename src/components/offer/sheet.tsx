import { Fragment, type ReactNode } from "react";
import { currencyAr, formatMoney, formatNumber } from "@/lib/format";
import type { OfferCtx } from "./context";

/** One 16:10 page of the offer. */
export function Sheet({ children, className = "", label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <section aria-label={label} className={`offer-sheet ${className}`}>
      {children}
    </section>
  );
}

/** A label above its value, as on every sheet. */
export function Fact({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-0 flex-col gap-[0.25cqw] ${className}`}>
      <dt className="t-xs text-muted">{label}</dt>
      <dd className="t-md m-0 font-medium">{children}</dd>
    </div>
  );
}

/** Figures, codes and phone numbers: kept left to right inside an Arabic line. */
export function Ltr({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" className={`whitespace-nowrap ${className}`}>
      {children}
    </bdi>
  );
}

/**
 * An amount in the offer's currency. In Arabic the figure stays left to right with the pound sign after
 * it ("4,850,000 ج.م") and the dollar sign before it ("$250,000"); in English "EGP 4,850,000" / "$250,000".
 */
export function Amount({ ctx, value }: { ctx: OfferCtx; value: number }) {
  const currency = ctx.snap.currency;
  if (ctx.language === "en") return <Ltr>{formatMoney(value, "en", currency)}</Ltr>;
  const n = formatNumber(value, "ar");
  if (currency === "USD") return <Ltr>{`${currencyAr(currency)}${n}`}</Ltr>;
  return (
    <span className="whitespace-nowrap">
      <bdi dir="ltr">{n}</bdi> {currencyAr(currency)}
    </span>
  );
}

/**
 * A dictionary template with its "{n}" filled by a node, so a figure can sit in its own <bdi> while the
 * words around it keep the line's direction: "230 م²" reads number first in Arabic too.
 */
export function Filled({ template, n }: { template: string; n: ReactNode }) {
  const parts = template.split("{n}");
  return (
    <span className="whitespace-nowrap">
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 && n}
          {part}
        </Fragment>
      ))}
    </span>
  );
}
