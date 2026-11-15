import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/fields";
import { SalesCard } from "@/components/sales/sales-shell";
import { requireSales } from "@/lib/sales/session";
import { changeSalesPassword } from "../actions";

export default async function SalesPasswordPage() {
  const me = await requireSales({ allowTemporaryPassword: true });
  return (
    <SalesCard
      title={me.mustChangePassword ? "اختار كلمة مرور جديدة" : "تغيير كلمة المرور"}
      subtitle={me.mustChangePassword ? "كلمة المرور اللي معاك مؤقتة. اختار كلمة مرور خاصة بيك قبل ما تكمّل." : `الحساب: ${me.username}`}
    >
      <AdminForm action={changeSalesPassword} submitLabel="حفظ">
        <TextField name="current" type="password" label="كلمة المرور الحالية" />
        <TextField name="password" type="password" label="كلمة المرور الجديدة" hint="10 حروف على الأقل" />
        <TextField name="confirm" type="password" label="تأكيد كلمة المرور الجديدة" />
      </AdminForm>
      {!me.mustChangePassword && (
        <Link href="/sales/me" className="text-sm">
          → رجوع
        </Link>
      )}
    </SalesCard>
  );
}
