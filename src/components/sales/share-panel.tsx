"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { Check, Copy, FilePdf, ShareNetwork, TelegramLogo, WhatsappLogo } from "@phosphor-icons/react";
import { AdminForm } from "@/components/admin/admin-form";
import { emailOfferAction, recordShareAction } from "@/app/sales/offer-actions";

// Big, thumb-sized buttons: two to a row on a phone, in one row from `sm` up.
const button =
  "press inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm font-medium text-ink no-underline hover:border-brand hover:text-ink disabled:cursor-wait disabled:opacity-60 sm:min-h-10 sm:justify-start";
const input = "admin-input min-h-11 text-base sm:min-h-10 sm:text-sm";

const noop = () => () => undefined;
/** Whether this browser has a share sheet (phones, some desktops); false while rendering on the server. */
const useCanShare = () => useSyncExternalStore(noop, () => typeof navigator.share === "function", () => false);

function NewTab() {
  return <span className="sr-only">(بتفتح برّه الصفحة)</span>;
}

/**
 * After an offer goes out (spec 7): WhatsApp (to the client's number when known), Telegram, the phone's
 * share sheet (with the PDF file where the browser can share files), the PDF, email, and the link.
 * Works without server PDFs too: then the link goes out and the offer page's print button makes the PDF.
 */
export function SharePanel({
  offerId,
  url,
  whatsappUrl,
  telegramUrl,
  message,
  title,
  pdfHref,
  printHref,
  fileName,
  clientEmail,
  hasClientPhone,
}: {
  offerId: string;
  /** The client's link. */
  url: string;
  whatsappUrl: string;
  telegramUrl: string;
  message: string;
  title: string;
  /** The PDF route when server PDFs are on (or the PDF was made); null otherwise. */
  pdfHref: string | null;
  /** The offer page on this site, whose button prints it. */
  printHref: string;
  fileName: string;
  clientEmail: string | null;
  hasClientPhone: boolean;
}) {
  const canShare = useCanShare();
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState("");
  const link = useRef<HTMLInputElement>(null);

  // The share sheet must open straight from the tap, so the PDF is fetched ahead, and only where files
  // can be shared. The route answers with the offer page instead when it can't make a PDF now: only a
  // real PDF is kept.
  useEffect(() => {
    if (!pdfHref || typeof navigator.canShare !== "function") return;
    let gone = false;
    fetch(pdfHref, { credentials: "same-origin" })
      .then((r) => (r.ok && r.headers.get("content-type")?.startsWith("application/pdf") ? r.blob() : null))
      .then((blob) => {
        if (!blob || gone) return;
        const f = new File([blob], fileName, { type: "application/pdf" });
        if (navigator.canShare({ files: [f] })) setFile(f);
      })
      .catch(() => undefined);
    return () => {
      gone = true;
    };
  }, [pdfHref, fileName]);

  const shareSheet = async () => {
    setNote("");
    try {
      // With the file when there is one; the link always, so the client can open it on any phone.
      await navigator.share(file ? { files: [file], title, text: `${message}\n${url}` } : { title, text: message, url });
      void recordShareAction(offerId, "DEVICE");
    } catch (e) {
      // Closed without sharing is not an error worth showing.
      if (!(e instanceof DOMException && e.name === "AbortError")) setNote("الموبايل ماقدرش يفتح المشاركة. جرّب واتساب أو انسخ الرابط.");
    }
  };

  const copy = () => {
    setNote("");
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 2500);
      },
      () => {
        // No clipboard (an old browser, or not allowed): select the link so it can be copied by hand.
        link.current?.select();
        setNote("انسخ الرابط من الخانة.");
      },
    );
  };

  const out = (channel: "WHATSAPP" | "TELEGRAM") => () => void recordShareAction(offerId, channel);

  return (
    <section aria-labelledby="share-title" className="admin-panel flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <h2 id="share-title" className="font-display text-xl">
          ابعت العرض
        </h2>
        <p className="m-0 text-sm text-pretty text-muted">
          {hasClientPhone ? "الواتساب هيفتح على رقم العميل والرسالة جاهزة." : "الرسالة والرابط جاهزين، اختار انت هتبعتهم لمين."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap">
        <Share href={whatsappUrl} onClick={out("WHATSAPP")} icon={<WhatsappLogo size={20} weight="fill" aria-hidden="true" />}>
          واتساب
        </Share>
        <Share href={telegramUrl} onClick={out("TELEGRAM")} icon={<TelegramLogo size={20} weight="fill" aria-hidden="true" />}>
          تليجرام
        </Share>
        {canShare && (
          <button type="button" className={button} onClick={shareSheet}>
            <ShareNetwork size={20} aria-hidden="true" /> {file ? "مشاركة الملف" : "مشاركة"}
          </button>
        )}
        {pdfHref ? (
          <a href={pdfHref} className={button}>
            <FilePdf size={20} aria-hidden="true" /> تحميل PDF
          </a>
        ) : (
          <a href={printHref} target="_blank" rel="noopener" className={button}>
            <FilePdf size={20} aria-hidden="true" /> طباعة / PDF
            <NewTab />
          </a>
        )}
      </div>

      <div className="flex flex-col gap-1.5 text-sm">
        <label htmlFor="offer-link" className="font-medium text-ink">
          رابط العرض
        </label>
        <div className="flex gap-2">
          <input
            ref={link}
            id="offer-link"
            readOnly
            dir="ltr"
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className={`${input} min-w-0 flex-1 text-muted`}
          />
          <button type="button" onClick={copy} className={`${button} shrink-0 sm:min-h-10`}>
            {copied ? <Check size={20} aria-hidden="true" className="text-brand" /> : <Copy size={20} aria-hidden="true" />}
            <span>{copied ? "اتنسخ" : "نسخ"}</span>
          </button>
        </div>
        <p role="status" aria-live="polite" className="m-0 text-xs text-muted empty:hidden">
          {copied ? "الرابط اتنسخ ✓" : note}
        </p>
      </div>

      <div className="border-t border-divider pt-5">
        <AdminForm action={emailOfferAction} submitLabel="ابعت بالإيميل" pendingLabel="بنبعت…" submitClassName="press admin-btn-ghost min-h-11 justify-center sm:min-h-0">
          <input type="hidden" name="offerId" value={offerId} />
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium text-ink">إيميل العميل</span>
            <input
              name="email"
              type="email"
              dir="ltr"
              maxLength={200}
              defaultValue={clientEmail ?? ""}
              autoComplete="off"
              aria-describedby="email-hint"
              className={input}
            />
            <span id="email-hint" className="text-xs text-pretty text-muted">
              {pdfHref ? "الـ PDF هيتبعت مرفق مع الرابط، ولو العميل رد الرد هيوصل إيميلك." : "هيتبعت رابط العرض، ولو العميل رد الرد هيوصل إيميلك."}
            </span>
            <span data-error-for="email" className="text-xs text-red-700 empty:hidden dark:text-red-300" />
          </label>
        </AdminForm>
      </div>

      <details className="group text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-muted hover:text-ink sm:min-h-0">نص الرسالة</summary>
        <p className="m-0 mt-2 rounded-xl bg-ink/[0.035] p-4 whitespace-pre-line">{message}</p>
      </details>
    </section>
  );
}

function Share({ href, onClick, icon, children }: { href: string; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={button} onClick={onClick}>
      {icon} {children}
      <NewTab />
    </a>
  );
}
