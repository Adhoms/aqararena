import { AdminForm } from "@/components/admin/admin-form";
import { approveOfferAction, cancelOfferAction } from "@/app/sales/offer-actions";

// Salespeople press these on phones: a 44 px tall button filling its cell of the two-column grid
// there (the offer list and the offer page), the usual admin size from `sm` up.
const touch = "min-h-11 w-full justify-center sm:min-h-0 sm:w-auto";

/** A team lead approves the discount: the offer goes out, valid from today. */
export function ApproveOfferButton({ offerId }: { offerId: string }) {
  return (
    <AdminForm
      action={approveOfferAction}
      submitLabel="موافقة"
      pendingLabel="جارٍ الموافقة…"
      submitClassName={`press admin-btn ${touch}`}
      confirmText="توافق على الخصم؟ العرض هيطلع من دلوقتي وصلاحيته تبدأ من النهارده."
    >
      <input type="hidden" name="offerId" value={offerId} />
    </AdminForm>
  );
}

const MODES = {
  // A team lead turns down a colleague's request.
  reject: { label: "رفض", confirm: "ترفض الخصم ده؟ العرض هيبان للسيلز «اتلغى» ومش هيطلع للعميل." },
  // The salesperson takes back their own request before a lead decides.
  withdraw: { label: "اسحب الطلب", confirm: "تسحب طلب الخصم؟ العرض هيتلغى ومش هيطلع للعميل." },
  // An offer that went out.
  cancel: { label: "إلغاء العرض", confirm: "تلغي العرض؟ لو العميل فتح الرابط هيلاقي إنه اتلغى." },
} as const;

/** Reject (a lead, on a pending offer), withdraw (its salesperson, while pending) or cancel (an offer that went out). */
export function CancelOfferButton({ offerId, mode }: { offerId: string; mode: keyof typeof MODES }) {
  const m = MODES[mode];
  return (
    <AdminForm action={cancelOfferAction} submitLabel={m.label} pendingLabel="جارٍ…" submitClassName={`press admin-btn-ghost ${touch}`} confirmText={m.confirm}>
      <input type="hidden" name="offerId" value={offerId} />
    </AdminForm>
  );
}
