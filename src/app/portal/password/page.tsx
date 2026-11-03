import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/fields";
import { PortalCard } from "@/components/portal/portal-shell";
import { requireAccount } from "@/lib/portal/session";
import { changePassword } from "../actions";

export default async function PasswordPage() {
  const me = await requireAccount({ allowTemporaryPassword: true });
  return (
    <PortalCard
      title={me.mustChangePassword ? "اختار كلمة مرور جديدة" : "تغيير كلمة المرور"}
      subtitle={me.mustChangePassword ? "كلمة المرور اللي معاك مؤقتة. اختار كلمة مرور خاصة بيك قبل ما تكمّل." : `الحساب: ${me.username}`}
    >
      <AdminForm action={changePassword} submitLabel="حفظ">
        <TextField name="current" type="password" label="كلمة المرور الحالية" />
        <TextField name="password" type="password" label="كلمة المرور الجديدة" hint="10 حروف على الأقل" />
        <TextField name="confirm" type="password" label="تأكيد كلمة المرور الجديدة" />
      </AdminForm>
      {!me.mustChangePassword && (
        <Link href="/portal" className="text-sm">
          → رجوع
        </Link>
      )}
    </PortalCard>
  );
}
