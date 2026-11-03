import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/fields";
import { PortalCard } from "@/components/portal/portal-shell";
import { currentAccount } from "@/lib/portal/session";
import { portalLogin } from "../actions";

export default async function PortalLoginPage() {
  if (await currentAccount()) redirect("/portal");
  return (
    <PortalCard title="دخول المطورين" subtitle="ادخل باسم المستخدم وكلمة المرور الخاصين بشركتك.">
      <AdminForm action={portalLogin} submitLabel="دخول">
        <TextField name="username" label="اسم المستخدم" dir="ltr" required />
        <TextField name="password" type="password" label="كلمة المرور" required />
      </AdminForm>
      <p className="border-t border-divider pt-4 text-sm">
        معندكش حساب؟ <Link href="/portal/register">اطلب حساب لشركتك</Link>
      </p>
    </PortalCard>
  );
}
