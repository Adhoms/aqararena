import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { TextField } from "@/components/admin/fields";
import { PortalCard } from "@/components/portal/portal-shell";
import { requestPasswordReset } from "../actions";

export default function ForgotPasswordPage() {
  return (
    <PortalCard
      title="نسيت كلمة المرور"
      subtitle="اكتب اسم المستخدم ورقم الموبايل المسجّل. هنتأكد من البيانات ونتواصل معاك بكلمة مرور مؤقتة تغيّرها أول ما تدخل."
    >
      <AdminForm action={requestPasswordReset} submitLabel="إرسال الطلب" resetOnSuccess>
        <TextField name="username" label="اسم المستخدم" dir="ltr" />
        <TextField name="phone" type="tel" label="رقم الموبايل" />
      </AdminForm>
      <Link href="/portal/login" className="text-sm">
        → رجوع للدخول
      </Link>
    </PortalCard>
  );
}
