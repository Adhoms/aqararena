import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { HoldStatus } from "@/components/sales/hold-status";
import { Money } from "@/components/sales/money";
import { ApproveOfferButton, CancelOfferButton } from "@/components/sales/offer-buttons";
import { OfferStateBadge } from "@/components/sales/offer-state-badge";
import { SalesShell } from "@/components/sales/sales-shell";
import { SharePanel } from "@/components/sales/share-panel";
import { DAYS_NOUN, countAr, fill, formatDateAr, formatDateTimeAr } from "@/lib/format";
import { OFFER_COPY } from "@/lib/sales/offer-copy";
import { offerFileName, offerUrl, pdfAvailable } from "@/lib/sales/offer-pdf";
import { loadOffer } from "@/lib/sales/offer-service";
import { requireSales } from "@/lib/sales/session";
import { offerMessage, telegramShareUrl, whatsappNumber, whatsappShareUrl } from "@/lib/sales/share";

export const metadata: Metadata = { title: "عرض سعر" };

const CHANNELS = { WHATSAPP: "واتساب", TELEGRAM: "تليجرام", EMAIL: "إيميل", DEVICE: "مشاركة من الموبايل" } as const;
const pct = (n: number) => <bdi dir="ltr">{Number(n.toFixed(2))}%</bdi>;

// One offer, for its salesperson or a team lead of the company: its facts and state now, a lead's
// approval, cancelling, and (its salesperson, while it may be sent) the share screen. An offer that never
// went out (waiting for approval, or rejected) has no link: nothing here shows one.
export default async function SalesOfferPage({ params }: PageProps<"/sales/offers/[id]">) {
  const me = await requireSales();
  const { id } = await params;
  const offer = /^[a-z0-9]{10,40}$/i.test(id) ? await loadOffer({ id: me.id, role: me.role, developerId: me.developer.id }, id) : null;
  if (!offer || !offer.snap) notFound();
  const snap = offer.snap;
  const mine = offer.salesAccountId === me.id;
  const discount = Number(offer.discountPct);
  const pending = offer.state === "PENDING";
  const project = offer.language === "ar" ? snap.project.nameAr : snap.project.nameEn;

  const facts: [string, ReactNode][] = [
    ["العميل", <bdi key="client">{offer.clientName}</bdi>],
    ["موبايل العميل", offer.clientPhone && <bdi dir="ltr">{offer.clientPhone}</bdi>],
    ["إيميل العميل", offer.clientEmail && <bdi dir="ltr" className="break-all">{offer.clientEmail}</bdi>],
    ["السيلز", mine ? null : offer.salesAccount.nameAr],
    ["الخطة", snap.plan.nameAr || snap.plan.nameEn || (snap.plan.custom ? "جدول سداد مخصص" : snap.plan.cash ? "كاش" : "—")],
    [
      "السعر",
      discount > 0 ? (
        <>
          <Money value={snap.price} currency={snap.currency} />{" "}
          <span className="text-muted">
            (خصم {pct(discount)} من <Money value={snap.listPrice} currency={snap.currency} />)
          </span>
        </>
      ) : (
        <Money value={snap.price} currency={snap.currency} />
      ),
    ],
    [snap.plan.cash ? "الدفع كاش" : "المقدم", snap.schedule.rows[0] ? <Money value={snap.schedule.rows[0].amount} currency={snap.currency} /> : null],
    ["لغة العرض", offer.language === "ar" ? "عربي" : "English"],
    ["اتعمل", formatDateTimeAr(offer.createdAt)],
    // Waiting for approval, its days start when a lead approves it.
    pending ? ["الصلاحية", `${countAr(snap.validityDays, DAYS_NOUN)} من الموافقة`] : ["ساري لحد", formatDateAr(offer.validUntil, "long")],
    ["اتوافق عليه", offer.approvedBy && offer.approvedAt && `${offer.approvedBy.nameAr}، ${formatDateTimeAr(offer.approvedAt)}`],
    ["اتلغى", offer.cancelledBy && offer.cancelledAt && `${offer.cancelledBy.nameAr}، ${formatDateTimeAr(offer.cancelledAt)}`],
    ["اتبعت على", offer.sentVia.length ? offer.sentVia.map((c) => CHANNELS[c]).join("، ") : null],
  ];

  // Why the salesperson's own offer that went out can't be sent any more.
  const stale =
    mine && offer.status === "ISSUED" && !offer.canShare
      ? offer.state === "EXPIRED"
        ? "صلاحية العرض ده انتهت، فمبقاش ينفع يتبعت."
        : offer.state === "UNIT_TAKEN"
          ? "الوحدة اتباعت أو اتحجزت لزميل، فالعرض مبقاش ينفع يتبعت."
          : null
      : null;
  const message =
    offer.token && offer.canShare
      ? offerMessage({ language: offer.language, currency: snap.currency, unit: snap.unit.label, project, price: snap.price, down: snap.schedule.rows[0]?.amount ?? 0, cash: snap.plan.cash, validUntil: offer.validUntil })
      : null;
  const cancelMode = offer.canDecide ? "reject" : pending ? "withdraw" : "cancel";

  return (
    <SalesShell
      me={me}
      title={
        // The unit's label already has a dot in it (B1 · 101), so the project is set apart by size and colour.
        <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-balance">
          <bdi dir="ltr">{snap.unit.label}</bdi>
          <span className="text-xl text-muted sm:text-2xl">{snap.project.nameAr}</span>
        </span>
      }
      actions={<OfferStateBadge state={offer.state} className="text-sm" />}
    >
      <Link href="/sales/offers" className="press -mt-3 inline-flex min-h-11 items-center gap-1.5 self-start text-sm sm:min-h-0">
        <span aria-hidden="true">→</span> عروضي
      </Link>

      {/* The result of approving, rejecting or cancelling, above everything: the buttons that ran it leave the page. */}
      <HoldStatus top>
        {pending && (
          <p className="m-0 rounded-xl bg-brass-soft px-4 py-3 text-sm leading-relaxed text-pretty text-brass-dark">
            {offer.canDecide ? (
              <>
                {offer.salesAccount.nameAr} طالب خصم {pct(discount)}. لو وافقت، العرض يطلع وصلاحيته تبدأ من النهارده.
              </>
            ) : (
              "العرض مستني موافقة قائد الفريق على الخصم. مفيش رابط ولا مشاركة لحد ما يتوافق عليه."
            )}
          </p>
        )}
        {mine && offer.canShare && offer.state === "PRICE_CHANGED" && (
          <p className="m-0 rounded-xl bg-brass-soft px-4 py-3 text-sm leading-relaxed text-pretty text-brass-dark">
            سعر الوحدة أو خطة السداد اتغيّروا من ساعة ما العرض طلع. العميل هيشوف العرض بأرقامه لحد تاريخه، والأحسن تعمله{" "}
            {offer.unitId ? <Link href={`/sales/units/${offer.unitId}/offer`}>عرض جديد</Link> : "عرض جديد"}.
          </p>
        )}
        {stale && (
          <p className="admin-panel m-0 text-sm text-pretty">
            {stale} {offer.unitId && offer.state === "EXPIRED" && <Link href={`/sales/units/${offer.unitId}`}>اعمل عرض جديد من صفحة الوحدة</Link>}
          </p>
        )}

        <section aria-labelledby="offer-title" className="admin-panel flex flex-col gap-5">
          {/* Focus comes back here after an action refreshes the page (see HoldStatus). */}
          <h2 id="offer-title" tabIndex={-1} className="font-display text-xl">
            تفاصيل العرض
          </h2>
          <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-4 text-sm min-[420px]:grid-cols-2 lg:grid-cols-3">
            {facts
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <div key={label} className="flex min-w-0 flex-col gap-0.5">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="m-0 font-medium break-words tabular-nums">{value}</dd>
                </div>
              ))}
          </dl>
          {(offer.token || offer.canDecide || offer.canCancel) && (
            <div className="grid grid-cols-2 gap-2.5 border-t border-divider pt-5 sm:flex sm:flex-wrap sm:items-start sm:gap-3">
              {/* Only an offer that went out has a link. */}
              {offer.token && offer.status === "ISSUED" && (
                <a href={`/o/${offer.token}`} target="_blank" rel="noopener" className="press admin-btn-ghost min-h-11 justify-center sm:min-h-0">
                  افتح العرض <span aria-hidden="true">↗</span>
                  <span className="sr-only">(بيفتح في تبويب جديد)</span>
                </a>
              )}
              {offer.canDecide && <ApproveOfferButton offerId={offer.id} />}
              {offer.canCancel && <CancelOfferButton offerId={offer.id} mode={cancelMode} />}
            </div>
          )}
        </section>
      </HoldStatus>

      {offer.token && message && (
        <SharePanel
          offerId={offer.id}
          url={offerUrl(offer.token)}
          whatsappUrl={whatsappShareUrl(message, offerUrl(offer.token), whatsappNumber(offer.clientPhone))}
          telegramUrl={telegramShareUrl(message, offerUrl(offer.token))}
          message={message}
          title={fill(OFFER_COPY[offer.language].shareTitle, { unit: snap.unit.label, project })}
          pdfHref={pdfAvailable() || offer.pdfUrl ? `/sales/offers/${offer.id}/pdf` : null}
          printHref={`/o/${offer.token}`}
          fileName={offerFileName(snap.unit.label, snap.project.nameEn)}
          clientEmail={offer.clientEmail}
          hasClientPhone={whatsappNumber(offer.clientPhone) !== null}
        />
      )}
    </SalesShell>
  );
}
