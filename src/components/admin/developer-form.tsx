import type { Developer } from "@/generated/prisma/client";
import { saveDeveloper } from "@/app/admin/actions";
import { AdminForm } from "./admin-form";
import { Checkbox, Panel, Row, TextArea, TextField } from "./fields";
import { UploadField } from "./upload";

export function DeveloperForm({ developer }: { developer?: Developer }) {
  const d = developer;
  return (
    <AdminForm action={saveDeveloper} submitLabel={d ? "حفظ التعديلات" : "إضافة المطور"}>
      {d && <input type="hidden" name="id" value={d.id} />}
      <Panel title="البيانات الأساسية">
        <div className="flex flex-col gap-4">
          <Row>
            <TextField name="nameAr" label="الاسم بالعربية *" defaultValue={d?.nameAr} required />
            <TextField name="nameEn" label="الاسم بالإنجليزية *" defaultValue={d?.nameEn} required dir="ltr" />
          </Row>
          <Row cols={3}>
            <TextField
              name="slug"
              label="الرابط المختصر"
              hint="يظهر في عنوان الصفحة. يُنشأ من الاسم الإنجليزي إن تُرك فارغًا."
              defaultValue={d?.slug}
              dir="ltr"
            />
            <TextField name="foundedYear" type="number" label="سنة التأسيس" defaultValue={d?.foundedYear} />
          </Row>
          <UploadField name="logoUrl" label="الشعار" defaultValue={d?.logoUrl} folder={`developers/${d?.id ?? "new"}`} hint="PNG أو SVG بخلفية شفافة إن أمكن" />
          <Row>
            <TextArea name="aboutAr" label="نبذة بالعربية" defaultValue={d?.aboutAr} rows={4} />
            <TextArea name="aboutEn" label="نبذة بالإنجليزية" defaultValue={d?.aboutEn} rows={4} dir="ltr" />
          </Row>
          <Checkbox name="verified" label="أرقام موثّقة (تم التحقق منها مع المطور)" defaultChecked={d?.verified} />
        </div>
      </Panel>
      <Panel title="أرقام التواصل الرسمية">
        <div className="flex flex-col gap-4">
          <Row cols={3}>
            <TextField name="hotline" type="tel" label="الخط الساخن" defaultValue={d?.hotline} placeholder="19xxx" />
            <TextField name="salesPhone" type="tel" label="هاتف المبيعات" defaultValue={d?.salesPhone} placeholder="+20 1xx xxx xxxx" />
            <TextField name="whatsapp" type="tel" label="واتساب" defaultValue={d?.whatsapp} placeholder="+20 1xx xxx xxxx" />
          </Row>
          <Row>
            <TextField name="website" type="url" label="الموقع الإلكتروني" defaultValue={d?.website} placeholder="https://" />
            <TextField name="email" type="email" label="البريد الإلكتروني" defaultValue={d?.email} />
          </Row>
          <Row>
            <TextField name="hqAddressAr" label="عنوان المقر بالعربية" defaultValue={d?.hqAddressAr} />
            <TextField name="hqAddressEn" label="عنوان المقر بالإنجليزية" defaultValue={d?.hqAddressEn} dir="ltr" />
          </Row>
        </div>
      </Panel>
    </AdminForm>
  );
}
