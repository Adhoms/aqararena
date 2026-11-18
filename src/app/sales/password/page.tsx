import type { Metadata } from "next";
import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/fields";
import { SalesCard } from "@/components/sales/sales-shell";
import { requireSales } from "@/lib/sales/session";
import { changeSalesPassword } from "../actions";

export const metadata: Metadata = { title: "كلمة المرور" };

export default async function SalesPasswordPage() {
  const me = await requireSales({ allowTemporaryPassword: true });
  return (
    <SalesCard
      title={me.mustChangePassword ? "اختار كلمة مرور جديدة" : "تغيير كلمة المرور"}
      subtitle={me.mustChangePassword ? "كلمة المرور اللي معاك مؤقتة. اختار كلمة مرور خاصة بيك قبل ما تكمّل." : `الحساب: ${me.username}`}
    >
      <AdminForm action={changeSalesPassword} submitLabel="حفظ">
        {/* Lets password managers link the new password to this account; the action ignores it. */}
        <input type="text" name="username" autoComplete="username" value={me.username} readOnly hidden />
        <TextField
          name="current"
          type="password"
          label={me.mustChangePassword ? "كلمة المرور المؤقتة" : "كلمة المرور الحالية"}
          autoComplete="current-password"
          required
        />
        <TextField name="password" type="password" label="كلمة المرور الجديدة" hint="10 حروف على الأقل" autoComplete="new-password" required />
        <TextField name="confirm" type="password" label="تأكيد كلمة المرور الجديدة" autoComplete="new-password" required />
      </AdminForm>
      {me.mustChangePassword ? (
        <form action="/sales/logout" method="post">
          <button type="submit" className="admin-btn-ghost">
            خروج
          </button>
        </form>
      ) : (
        <Link href="/sales/me" className="text-sm">
          <span aria-hidden="true">→</span> رجوع
        </Link>
      )}
    </SalesCard>
  );
}
