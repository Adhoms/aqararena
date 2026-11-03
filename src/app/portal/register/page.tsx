import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { Row, TextArea, TextField } from "@/components/admin/fields";
import { PortalCard } from "@/components/portal/portal-shell";
import { requestAccount } from "../actions";

export default function RegisterPage() {
  return (
    <PortalCard
      wide
      title="اطلب حساب مطور"
      subtitle="بعد ما نراجع الطلب ونتأكد من الشركة هنفعّل الحساب، وتقدر تضيف مشروعاتك وأسعارك وصورك. كل اللي بتضيفه بيتراجع قبل ما يظهر على الموقع."
    >
      <AdminForm action={requestAccount} submitLabel="إرسال الطلب" resetOnSuccess>
        <Row>
          <TextField name="companyNameAr" label="اسم الشركة بالعربية *" />
          <TextField name="companyNameEn" label="اسم الشركة بالإنجليزية" dir="ltr" />
        </Row>
        <Row cols={3}>
          <TextField name="contactName" label="اسم المسؤول *" />
          <TextField name="phone" type="tel" label="رقم الموبايل *" />
          <TextField name="email" type="email" label="البريد الإلكتروني" />
        </Row>
        <Row cols={3}>
          <TextField name="username" label="اسم المستخدم *" dir="ltr" hint="حروف إنجليزية صغيرة وأرقام" />
          <TextField name="password" type="password" label="كلمة المرور *" hint="10 حروف على الأقل" />
          <TextField name="confirm" type="password" label="تأكيد كلمة المرور *" />
        </Row>
        <TextArea name="note" label="ملاحظات" hint="مثلًا: الموقع الإلكتروني للشركة أو أسماء المشروعات" />
        {/* Left empty by people; filled by bots. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      </AdminForm>
      <p className="border-t border-divider pt-4 text-sm">
        عندك حساب؟ <Link href="/portal/login">ادخل من هنا</Link>
      </p>
    </PortalCard>
  );
}
