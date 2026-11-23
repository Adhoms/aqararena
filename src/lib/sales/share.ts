import { fill, formatMoney } from "@/lib/format";
import type { Currency } from "@/lib/property";
import { normalizePhone } from "./fields";
import { OFFER_COPY, offerDate, type OfferCopy } from "./offer-copy";
import type { OfferLanguage } from "./offers";

const _same: OfferCopy = OFFER_COPY.en;
void _same;

// Sharing an offer (spec section 7): a ready message for WhatsApp and Telegram, sent straight to the
// client's WhatsApp when the number allows it. Nothing is sent from the site: these open the app.

/**
 * The client's number as WhatsApp wants it (country code, digits only), or null. Egyptian mobiles
 * written locally (01xxxxxxxxx, or without the 0) get 20 in front; numbers with another country's
 * code are kept; landlines and anything too short have none.
 */
export function whatsappNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = normalizePhone(raw).replace(/\D/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (/^01[0125]\d{8}$/.test(d)) return `2${d}`;
  if (/^1[0125]\d{8}$/.test(d)) return `20${d}`;
  if (/^201[0125]\d{8}$/.test(d)) return d;
  if (!d.startsWith("0") && !d.startsWith("20") && d.length >= 8 && d.length <= 15) return d;
  return null;
}

/** wa.me with the message and link, to the client's number when there is one (else WhatsApp asks who). */
export const whatsappShareUrl = (message: string, url: string, number: string | null) =>
  `https://wa.me/${number ?? ""}?text=${encodeURIComponent(`${message}\n${url}`)}`;

export const telegramShareUrl = (message: string, url: string) =>
  `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message)}`;

export type ShareFacts = {
  language: OfferLanguage;
  currency: Currency;
  unit: string;
  project: string;
  /** The price after any discount, and what is due at contract. */
  price: number;
  down: number;
  cash: boolean;
  validUntil: Date;
};

/** A few lines that read on their own: the unit, the price, the down payment and how long it holds. */
export function offerMessage(f: ShareFacts): string {
  const c = OFFER_COPY[f.language];
  const money = (n: number) => formatMoney(n, f.language, f.currency);
  return [
    fill(c.shareTitle, { unit: f.unit, project: f.project }),
    `${c.price}: ${money(f.price)}`,
    `${f.cash ? c.cashPayment : c.downPayment}: ${money(f.down)}`,
    fill(c.validUntilLine, { date: offerDate(f.validUntil, f.language) }),
  ].join("\n");
}
