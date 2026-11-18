import { AdminForm } from "@/components/admin/admin-form";
import { cancelUnitHold, convertUnitHold } from "@/app/sales/hold-actions";

// Salespeople press these on phones: a 44 px tall button there, the usual admin size from `sm` up.
const touch = "min-h-11 justify-center sm:min-h-0";

/** The holder confirms the hold: the unit becomes «محجوزة» for good. */
export function ConvertHoldButton({ holdId }: { holdId: string }) {
  return (
    <AdminForm
      action={convertUnitHold}
      submitLabel="تأكيد الحجز"
      submitClassName={`admin-btn ${touch}`}
      pendingLabel="جارٍ التأكيد…"
      confirmText="تأكيد الحجز؟ الوحدة هتبقى «محجوزة» في المخزون ومش هترجع متاحة لوحدها."
    >
      <input type="hidden" name="holdId" value={holdId} />
    </AdminForm>
  );
}

/** The holder or a team lead cancels the hold: the unit is available to everyone again. */
export function CancelHoldButton({ holdId, holder }: { holdId: string; holder?: string }) {
  return (
    <AdminForm
      action={cancelUnitHold}
      submitLabel="إلغاء الحجز"
      submitClassName={`admin-btn-ghost ${touch}`}
      pendingLabel="جارٍ الإلغاء…"
      confirmText={holder ? `إلغاء حجز ${holder}؟ الوحدة هترجع متاحة لكل الفريق.` : "إلغاء الحجز؟ الوحدة هترجع متاحة لكل الفريق."}
    >
      <input type="hidden" name="holdId" value={holdId} />
    </AdminForm>
  );
}
