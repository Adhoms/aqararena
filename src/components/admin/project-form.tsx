import type { Area, Developer, Project } from "@/generated/prisma/client";
import { saveProject, saveArea } from "@/app/admin/actions";
import { options } from "@/lib/admin/labels";
import { AdminForm } from "./admin-form";
import { Checkbox, CheckboxGroup, Panel, Row, Select, TextArea, TextField } from "./fields";
import { UploadField } from "./upload";

const FEDDAN_M2 = 4200.83;
export const isoDate = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : undefined);
const dec = (v: { toString(): string } | null | undefined) => (v === null || v === undefined ? undefined : v.toString());

export function ProjectForm({
  project,
  developers,
  areas,
  defaultDeveloperId,
}: {
  project?: Project;
  developers: Pick<Developer, "id" | "nameAr">[];
  areas: Pick<Area, "id" | "nameAr">[];
  defaultDeveloperId?: string;
}) {
  const p = project;
  const landFeddan = p?.landAreaM2 ? Math.round((Number(p.landAreaM2) / FEDDAN_M2) * 100) / 100 : undefined;

  return (
    <AdminForm action={saveProject} submitLabel={p ? "حفظ التعديلات" : "إنشاء المشروع"}>
      {p && <input type="hidden" name="id" value={p.id} />}

      <Panel title="البيانات الأساسية">
        <div className="flex flex-col gap-4">
          <Row>
            <TextField name="nameAr" label="اسم المشروع بالعربية *" defaultValue={p?.nameAr} required />
            <TextField name="nameEn" label="اسم المشروع بالإنجليزية *" defaultValue={p?.nameEn} required dir="ltr" />
          </Row>
          <Row cols={3}>
            <Select
              name="developerId"
              label="المطور *"
              emptyLabel="— اختر —"
              defaultValue={p?.developerId ?? defaultDeveloperId}
              options={developers.map((d) => ({ value: d.id, label: d.nameAr }))}
            />
            <Select
              name="areaId"
              label="المنطقة *"
              emptyLabel="— اختر —"
              defaultValue={p?.areaId}
              options={areas.map((a) => ({ value: a.id, label: a.nameAr }))}
              hint="منطقة غير موجودة؟ أضفها من الأسفل."
            />
            <TextField name="slug" label="الرابط المختصر" defaultValue={p?.slug} dir="ltr" hint="يُنشأ من الاسم الإنجليزي إن تُرك فارغًا." />
          </Row>
          <Row>
            <TextField name="districtAr" label="الحي بالعربية" defaultValue={p?.districtAr} placeholder="التجمع الخامس" />
            <TextField name="districtEn" label="الحي بالإنجليزية" defaultValue={p?.districtEn} dir="ltr" placeholder="Fifth Settlement" />
          </Row>
          <Row>
            <TextArea name="descriptionAr" label="الوصف بالعربية" defaultValue={p?.descriptionAr} rows={4} />
            <TextArea name="descriptionEn" label="الوصف بالإنجليزية" defaultValue={p?.descriptionEn} rows={4} dir="ltr" />
          </Row>
          <CheckboxGroup name="categories" label="أنواع المساحات" options={options.categories} defaultValues={p?.categories} />
        </div>
      </Panel>

      <Panel title="الحالة والمواعيد">
        <div className="flex flex-col gap-4">
          <Row cols={4}>
            <Select name="status" label="الحالة *" defaultValue={p?.status ?? "LAUNCH"} options={options.status} />
            <TextField name="launchDate" type="date" label="تاريخ الإطلاق" defaultValue={isoDate(p?.launchDate)} />
            <TextField name="deliveryDate" type="date" label="موعد التسليم *" defaultValue={isoDate(p?.deliveryDate)} required />
            <TextField name="progressPct" type="number" label="نسبة الإنشاء %" defaultValue={p?.progressPct} />
          </Row>
          <Row cols={4}>
            <TextField name="bookingFee" type="number" label="مبلغ الحجز (جنيه)" defaultValue={dec(p?.bookingFee)} hint="مبلغ جدية الحجز عند الإطلاق" />
            <TextField
              name="pricesUpdatedAt"
              type="date"
              label="آخر تحديث للأسعار"
              defaultValue={isoDate(p?.pricesUpdatedAt)}
              hint="يُضبط تلقائيًا على اليوم عند تعديل النماذج أو أنظمة السداد"
            />
          </Row>
        </div>
      </Panel>

      <Panel title="المساحة والموقع">
        <div className="flex flex-col gap-4">
          <Row cols={3}>
            <TextField name="landFeddan" type="number" label="مساحة الأرض (فدان)" defaultValue={landFeddan} />
            <TextField name="footprintPct" type="number" label="نسبة المباني %" defaultValue={dec(p?.footprintPct)} hint="الباقي مساحات خضراء ومفتوحة" />
            <TextField name="unitsCount" type="number" label="عدد الوحدات" defaultValue={p?.unitsCount} />
          </Row>
          <UploadField
            name="masterPlanUrl"
            label="صورة الماستر بلان"
            defaultValue={p?.masterPlanUrl}
            folder={`projects/${p?.id ?? "new"}`}
            plan
            hint="صورة واضحة بجودة عالية (تُحفظ حتى 4000 بكسل)"
          />
          <Row cols={4}>
            <TextField name="latitude" type="number" label="خط العرض" defaultValue={dec(p?.latitude)} placeholder="30.0300" hint="من خرائط جوجل: كليك يمين على الموقع" />
            <TextField name="longitude" type="number" label="خط الطول" defaultValue={dec(p?.longitude)} placeholder="31.4700" />
          </Row>
          <CheckboxGroup name="amenities" label="الخدمات" options={options.amenities} defaultValues={p?.amenities} />
        </div>
      </Panel>

      <Panel title="النشر">
        <div className="flex flex-wrap gap-6">
          <Checkbox name="published" label="منشور على الموقع" defaultChecked={p?.published} />
          <Checkbox name="isFeatured" label="مشروع مميز (يظهر في الرئيسية)" defaultChecked={p?.isFeatured} />
        </div>
        <p className="mt-3 text-xs text-muted">لا يظهر المشروع على الموقع إلا إذا كان منشورًا وله نموذج وحدة واحد على الأقل بسعر.</p>
      </Panel>
    </AdminForm>
  );
}

/** Small inline form to add an area (Area table) without leaving the page. */
export function NewAreaForm() {
  return (
    <details className="admin-panel">
      <summary className="cursor-pointer font-medium">+ إضافة منطقة جديدة</summary>
      <div className="mt-4">
        <AdminForm action={saveArea} submitLabel="إضافة المنطقة" resetOnSuccess>
          <Row cols={3}>
            <TextField name="nameAr" label="الاسم بالعربية *" />
            <TextField name="nameEn" label="الاسم بالإنجليزية *" dir="ltr" />
            <TextField name="slug" label="الرابط المختصر" dir="ltr" hint="مثل: new-cairo" />
          </Row>
          <p className="text-xs text-muted">
            ملاحظة: صفحات المناطق في الموقع تعرض حاليًا القائمة الأساسية فقط (القاهرة الجديدة، الشيخ زايد، العاصمة…). المشروعات في منطقة جديدة تظهر في
            القوائم والخريطة، لكن تُحسب ضمن «القاهرة الجديدة» في صفحات المناطق حتى تُضاف المنطقة للموقع.
          </p>
        </AdminForm>
      </div>
    </details>
  );
}
