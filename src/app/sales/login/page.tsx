import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/fields";
import { SalesCard } from "@/components/sales/sales-shell";
import { currentSalesAccount } from "@/lib/sales/session";
import { salesLogin } from "../actions";

export const metadata: Metadata = { title: "دخول فريق المبيعات" };

export default async function SalesLoginPage() {
  if (await currentSalesAccount()) redirect("/sales");
  return (
    <SalesCard title="دخول فريق المبيعات" subtitle="ادخل باسم المستخدم وكلمة المرور اللي اداهملك مدير الحساب في شركتك.">
      <AdminForm action={salesLogin} submitLabel="دخول">
        <TextField name="username" label="اسم المستخدم" dir="ltr" autoComplete="username" required />
        <TextField name="password" type="password" label="كلمة المرور" autoComplete="current-password" required />
      </AdminForm>
      <p className="border-t border-divider pt-4 text-sm text-muted">نسيت كلمة المرور؟ مدير الحساب في شركتك يقدر يعملك كلمة مرور جديدة من بوابة المطورين.</p>
    </SalesCard>
  );
}
