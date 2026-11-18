import type { Metadata } from "next";
import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { Panel, Row, TextField } from "@/components/admin/fields";
import { SalesShell } from "@/components/sales/sales-shell";
import { ROLE_LABELS } from "@/lib/sales/fields";
import { requireSales } from "@/lib/sales/session";
import { updateSalesProfile } from "../actions";

export const metadata: Metadata = { title: "ملفي" };

export default async function SalesMePage() {
  const me = await requireSales();
  return (
    <SalesShell me={me} title="ملفي">
      <Panel title="بياناتك على العروض">
        <p className="mb-4 text-sm text-muted">الاسم والأرقام دي هي اللي العميل هيشوفها على عروض الأسعار اللي هتبعتها.</p>
        <AdminForm action={updateSalesProfile} resetOnSuccess>
          <Row>
            <TextField name="nameAr" label="الاسم بالعربي *" defaultValue={me.nameAr} autoComplete="name" />
            <TextField name="nameEn" label="الاسم بالإنجليزي" defaultValue={me.nameEn} dir="ltr" hint="بيظهر على العروض الإنجليزي" />
          </Row>
          <Row cols={3}>
            <TextField name="phone" label="الموبايل *" type="tel" defaultValue={me.phone} dir="ltr" autoComplete="tel" />
            <TextField name="whatsapp" label="واتساب" type="tel" defaultValue={me.whatsapp} dir="ltr" autoComplete="off" hint="فاضي = نفس الموبايل" />
            <TextField name="email" label="البريد الإلكتروني" type="email" defaultValue={me.email} dir="ltr" autoComplete="email" />
          </Row>
        </AdminForm>
      </Panel>
      <Panel title="الحساب">
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
          <dt className="text-muted">اسم المستخدم</dt>
          <dd dir="ltr" className="text-end">
            {me.username}
          </dd>
          <dt className="text-muted">الدور</dt>
          <dd>{ROLE_LABELS[me.role]}</dd>
          <dt className="text-muted">الشركة</dt>
          <dd>{me.developer.nameAr}</dd>
        </dl>
        <Link href="/sales/password" className="admin-btn-ghost mt-4">
          تغيير كلمة المرور
        </Link>
      </Panel>
    </SalesShell>
  );
}
