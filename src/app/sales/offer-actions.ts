"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { emailEnabled, sendEmail } from "@/lib/email";
import { FormReader, type FormState } from "@/lib/admin/form";
import { fill } from "@/lib/format";
import { withinRate } from "@/lib/throttle";
import { OFFER_COPY } from "@/lib/sales/offer-copy";
import { ensureOfferPdf, offerFileName, offerUrl, requestOrigin } from "@/lib/sales/offer-pdf";
import { approveOffer, cancelOffer, createOffer, loadOffer, recordShare, type ShareChannel } from "@/lib/sales/offer-service";
import { readOfferForm, type OfferActor } from "@/lib/sales/offers";
import { PdfBusyError } from "@/lib/sales/pdf";
import { offerMessage } from "@/lib/sales/share";
import { requireSales, type SalesUser } from "@/lib/sales/session";

// Each action re-reads the session (requireSales signs out a disabled account) and hands the offer
// service the salesperson's own developer, which scopes every query: another company's ids find nothing.

const actor = (me: SalesUser): OfferActor => ({ id: me.id, role: me.role, developerId: me.developer.id });
const GONE: FormState = { ok: false, message: "العرض ده مش موجود" };
const EMAILS_PER_HOUR = 20;
/** All of one company's salespeople together. */
const COMPANY_EMAILS_PER_HOUR = 100;
/** To one address, from anyone: a client is never flooded with offers. */
const RECIPIENT_EMAILS_PER_HOUR = 3;
/** The address as a throttle key: hashed, so the address itself is never stored there. */
const recipientKey = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 32);
const isId = (v: string) => /^[a-z0-9]{10,40}$/i.test(v);
/** One address, nothing that would make it a list of them. */
const EMAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
/** Text someone typed (a name), kept on one line inside the email. */
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

/** A new offer from the unit page. Issued at once within the salesperson's limit, otherwise it waits for a team lead. */
export async function createOfferAction(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales();
  const f = new FormReader(data);
  const input = readOfferForm(f);
  if (!f.ok || !input.unitId || !input.planId) return f.result();
  const result = await createOffer(actor(me), { ...input, unitId: input.unitId, planId: input.planId });
  if (!result.ok) return { ok: false, message: result.message };
  revalidatePath("/sales", "layout");
  redirect(`/sales/offers/${result.id}`);
}

/** A team lead approves an offer waiting for approval: it goes out from now. */
export async function approveOfferAction(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales();
  const id = new FormReader(data).id("offerId");
  if (!id) return GONE;
  const result = await approveOffer(actor(me), id);
  revalidatePath("/sales", "layout");
  return result;
}

/** Cancel (the salesperson or a team lead), or reject an offer waiting for approval (a team lead). */
export async function cancelOfferAction(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales();
  const id = new FormReader(data).id("offerId");
  if (!id) return GONE;
  const result = await cancelOffer(actor(me), id);
  revalidatePath("/sales", "layout");
  return result;
}

const TAPPED: readonly ShareChannel[] = ["WHATSAPP", "TELEGRAM", "DEVICE"];

/**
 * Called when the salesperson opens WhatsApp or Telegram, or shares from the phone's share sheet. The
 * service ignores it unless the offer is theirs and may be sent now.
 */
export async function recordShareAction(offerId: string, channel: Exclude<ShareChannel, "EMAIL">): Promise<void> {
  const me = await requireSales();
  if (typeof offerId !== "string" || !isId(offerId) || !TAPPED.includes(channel)) return;
  await recordShare(actor(me), offerId, channel);
  revalidatePath(`/sales/offers/${offerId}`);
}

/**
 * Emails the offer to the client from the site's address, with the PDF attached when server PDFs are on
 * (otherwise the link); replies go to the salesperson. At most EMAILS_PER_HOUR an hour per salesperson,
 * COMPANY_EMAILS_PER_HOUR per developer and RECIPIENT_EMAILS_PER_HOUR to one address.
 */
export async function emailOfferAction(_: FormState, data: FormData): Promise<FormState> {
  const me = await requireSales();
  const f = new FormReader(data);
  const id = f.id("offerId");
  const to = f.text("email", { required: true, max: 200 });
  if (to && !EMAIL.test(to)) f.errors.email = "بريد إلكتروني غير صالح";
  if (!f.ok || !to) return f.result("اكتب إيميل العميل");
  if (!id) return GONE;
  // Its state now: only the salesperson's own issued offer, valid or only re-priced, goes out.
  const offer = await loadOffer(actor(me), id);
  if (!offer) return GONE;
  const snap = offer.snap;
  if (!offer.canShare || !offer.token || !snap) return { ok: false, message: "العرض ده مينفعش يتبعت دلوقتي" };
  if (!emailEnabled()) return { ok: false, message: "الإيميل مش متفعّل على الموقع لسه. ابعت العرض على واتساب أو تليجرام، أو انسخ الرابط" };
  // The address first, so a refused one uses up nothing of the salesperson's or the company's hour.
  if (!(await withinRate(`offer-email-to:${recipientKey(to)}`, RECIPIENT_EMAILS_PER_HOUR, 60))) {
    return { ok: false, message: "اتبعت للإيميل ده عروض كتير في الساعة دي. جرّب بعد شوية، أو ابعت على واتساب" };
  }
  if (!(await withinRate(`offer-email:${me.id}`, EMAILS_PER_HOUR, 60))) {
    return { ok: false, message: `بعتّ ${EMAILS_PER_HOUR} إيميل في الساعة دي. جرّب بعد شوية، أو ابعت على واتساب` };
  }
  if (!(await withinRate(`offer-email-dev:${me.developer.id}`, COMPANY_EMAILS_PER_HOUR, 60))) {
    return { ok: false, message: "شركتك بعتت إيميلات كتير في الساعة دي. جرّب بعد شوية، أو ابعت على واتساب" };
  }
  let pdf: string | null = null;
  try {
    pdf = await ensureOfferPdf({ id: offer.id, token: offer.token, pdfUrl: offer.pdfUrl }, requestOrigin());
  } catch (e) {
    // Another PDF is being made, or printing failed: the email goes with the link only.
    if (!(e instanceof PdfBusyError)) console.error("[offer-pdf]", e);
  }
  const c = OFFER_COPY[offer.language];
  const url = offerUrl(offer.token);
  const unit = snap.unit.label;
  const project = offer.language === "ar" ? snap.project.nameAr : snap.project.nameEn;
  const salesperson = offer.language === "ar" ? snap.salesperson.nameAr : (snap.salesperson.nameEn ?? snap.salesperson.nameAr);
  const sent = await sendEmail({
    to,
    // The unit and project only: never the client's link, which opens the offer for anyone who has it.
    subject: fill(c.emailSubject, { unit, project }),
    text: [
      fill(c.emailHello, { name: oneLine(offer.clientName) }),
      "",
      fill(c.emailBody, { attached: pdf ? c.emailAttached : "" }),
      url,
      "",
      offerMessage({ language: offer.language, currency: snap.currency, unit, project, price: snap.price, down: snap.schedule.rows[0]?.amount ?? 0, cash: snap.plan.cash, validUntil: offer.validUntil }),
      "",
      `${oneLine(salesperson)} · ${snap.salesperson.phone}`,
    ].join("\n"),
    // Only the offer's own link is a link in the HTML; the names are escaped there like all the text.
    linkOnly: url,
    replyTo: me.email ?? undefined,
    attachments: pdf ? [{ filename: offerFileName(unit, snap.project.nameEn), path: pdf }] : undefined,
  });
  if (!sent) return { ok: false, message: "الإيميل مااتبعتش. جرّب تاني، أو ابعت الرابط على واتساب" };
  // For spotting abuse in the logs: the company, the offer and the address's domain, never the address.
  console.info("[offer-email]", { developer: me.developer.id, offer: offer.id, domain: to.slice(to.lastIndexOf("@") + 1).toLowerCase() });
  await recordShare(actor(me), offer.id, "EMAIL");
  await db.salesOffer.updateMany({ where: { id: offer.id, salesAccountId: me.id, developerId: me.developer.id }, data: { clientEmail: to } });
  revalidatePath(`/sales/offers/${offer.id}`);
  return { ok: true, message: pdf ? `اتبعت ✓ لـ ${to} والـ PDF مرفق` : `اتبعت ✓ لـ ${to} برابط العرض` };
}
