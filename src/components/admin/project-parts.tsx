import Link from "next/link";
import type { ReactNode } from "react";
import type { Media, MasterPlanZone, PaymentPlan, ProjectDistance, Typology, Unit } from "@/generated/prisma/client";
import { deleteProjectPart, deleteProjectUnits, saveDistance, saveMedia, savePaymentPlan, saveTypology, saveUnit, saveZone } from "@/app/admin/actions";
import type { FormState } from "@/lib/admin/form";
import { options } from "@/lib/admin/labels";
import { AdminForm, DeleteButton } from "./admin-form";
import { Checkbox, CheckboxGroup, Panel, Row, Select, TextArea, TextField } from "./fields";
import { isoDate } from "./project-form";
import { BulkMediaUpload, UploadField } from "./upload";

// The repeating parts of a project (unit types, payment plans, zones, media, distances).
// Each saved row is a collapsible form with its own Save and Delete; a blank form at the end adds one.

type Part = "typology" | "plan" | "zone" | "media" | "distance";
type Action = (prev: FormState, data: FormData) => Promise<FormState>;
const dec = (v: { toString(): string } | null | undefined) => (v === null || v === undefined ? undefined : v.toString());
const egp = (v: { toString(): string } | null | undefined) => (v ? `${Number(v).toLocaleString("ar-EG")} ج.م` : "—");

function PartList<T extends { id: string }>({
  projectId,
  part,
  title,
  addLabel,
  items,
  summary,
  fields,
  action,
  empty,
  extra,
  id,
}: {
  projectId: string;
  part: Part;
  title: string;
  addLabel: string;
  items: T[];
  summary: (item: T) => ReactNode;
  fields: (item?: T) => ReactNode;
  action: Action;
  empty?: ReactNode;
  /** Shown above the saved rows (e.g. the bulk upload box). */
  extra?: ReactNode;
  id: string;
}) {
  return (
    <Panel title={`${title} (${items.length})`} id={id}>
      <div className="flex flex-col gap-3">
        {extra}
        {items.length === 0 && empty}
        {items.map((item) => (
          <details key={item.id} className="admin-item">
            <summary>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">{summary(item)}</span>
              <span className="text-xs text-link">تعديل ▾</span>
            </summary>
            <AdminForm action={action}>
              <input type="hidden" name="id" value={item.id} />
              <input type="hidden" name="projectId" value={projectId} />
              {fields(item)}
            </AdminForm>
            <div className="mt-3 flex justify-end">
              <DeleteButton action={deleteProjectPart} fields={{ id: item.id, projectId, part }} />
            </div>
          </details>
        ))}
        <details className="admin-item border-dashed" open={items.length === 0}>
          <summary>
            <span className="font-medium text-link">+ {addLabel}</span>
          </summary>
          <AdminForm action={action} submitLabel="إضافة" resetOnSuccess>
            <input type="hidden" name="projectId" value={projectId} />
            {fields()}
          </AdminForm>
        </details>
      </div>
    </Panel>
  );
}

// ─── Unit types ─────────────────────────────────────────────────────────

export function TypologyList({ projectId, items }: { projectId: string; items: Typology[] }) {
  return (
    <PartList
      id="typologies"
      projectId={projectId}
      part="typology"
      title="نماذج الوحدات"
      addLabel="إضافة نموذج"
      items={items}
      action={saveTypology}
      empty={<p className="text-sm text-red-700">أضف نموذجًا واحدًا على الأقل بسعر حتى يظهر المشروع على الموقع.</p>}
      summary={(t) => (
        <>
          <strong dir="ltr">{t.code}</strong>
          <span>{options.subTypes.find((o) => o.value === t.subType)?.label.split(" (")[0]}</span>
          <span className="text-muted">{Number(t.buaM2)} م²</span>
          {t.bedrooms !== null && <span className="text-muted">{t.bedrooms} غرف</span>}
          <span>{egp(t.priceFrom)}</span>
        </>
      )}
      fields={(t) => (
        <>
          <Row cols={4}>
            <TextField name="code" label="الكود *" defaultValue={t?.code} dir="ltr" placeholder="A-150" hint="فريد داخل المشروع" />
            <Select name="category" label="الفئة *" defaultValue={t?.category ?? "RESIDENTIAL"} options={options.categories} />
            <Select name="subType" label="النوع *" defaultValue={t?.subType ?? "APARTMENT"} options={options.subTypes} />
            <Select name="finishing" label="التشطيب *" defaultValue={t?.finishing ?? "CORE_AND_SHELL"} options={options.finishing} />
          </Row>
          <Row cols={4}>
            <TextField name="buaM2" type="number" label="المساحة BUA (م²) *" defaultValue={dec(t?.buaM2)} />
            <TextField name="priceFrom" type="number" label="السعر يبدأ من (جنيه) *" defaultValue={dec(t?.priceFrom)} />
            <TextField name="bedrooms" type="number" label="غرف النوم" defaultValue={t?.bedrooms} />
            <TextField name="bathrooms" type="number" label="الحمامات" defaultValue={t?.bathrooms} />
          </Row>
          <Row cols={4}>
            <TextField name="gardenM2" type="number" label="حديقة (م²)" defaultValue={dec(t?.gardenM2)} />
            <TextField name="roofM2" type="number" label="روف (م²)" defaultValue={dec(t?.roofM2)} />
            <TextField name="nameAr" label="اسم النموذج بالعربية" defaultValue={t?.nameAr} />
            <TextField name="nameEn" label="اسم النموذج بالإنجليزية" defaultValue={t?.nameEn} dir="ltr" />
          </Row>
        </>
      )}
    />
  );
}

// ─── Units ──────────────────────────────────────────────────────────────

const AVAILABILITY_BADGE = { AVAILABLE: "admin-badge", RESERVED: "admin-badge-off", SOLD: "admin-badge-off" } as const;

/**
 * The project's units as a plain table with one form open at a time. (A form for every unit made
 * the page slow to open once a project had a few dozen.) "تعديل" reopens the page with that
 * unit's form; long lists come from the Excel import.
 */
export function UnitList({
  projectId,
  items,
  total,
  typologies,
  editing,
}: {
  projectId: string;
  items: Unit[];
  total: number;
  typologies: Typology[];
  /** The unit picked with "تعديل" (?unit=…), if any. */
  editing?: Unit | null;
}) {
  if (typologies.length === 0) return null;
  const typologyOptions = typologies.map((t) => ({ value: t.id, label: t.code }));
  const code = new Map(typologies.map((t) => [t.id, t.code]));
  const page = `/admin/projects/${projectId}`;
  const name = (u: Unit) => [u.building, u.unitNumber].filter(Boolean).join(" · ");
  const fields = (u?: Unit) => (
    <>
      <Row cols={4}>
        <Select name="typologyId" label="النموذج *" defaultValue={u?.typologyId ?? typologyOptions[0]?.value} options={typologyOptions} />
        <TextField name="unitNumber" label="رقم الوحدة *" defaultValue={u?.unitNumber} dir="ltr" placeholder="301" />
        <TextField name="building" label="المبنى" defaultValue={u?.building} dir="ltr" placeholder="B1" />
        <TextField name="floor" type="number" label="الدور" defaultValue={u?.floor} hint="0 = أرضي" />
      </Row>
      <Row cols={4}>
        <Select name="availability" label="الحالة *" defaultValue={u?.availability ?? "AVAILABLE"} options={options.availability} />
        <TextField name="price" type="number" label="سعر الوحدة (جنيه)" defaultValue={dec(u?.price)} hint="فاضي = سعر النموذج بس" />
        <Select name="view" label="الإطلالة" emptyLabel="—" defaultValue={u?.view} options={options.unitViews} />
        <Select name="orientation" label="الاتجاه" emptyLabel="—" defaultValue={u?.orientation} options={options.orientations} />
      </Row>
    </>
  );

  return (
    <Panel title={`الوحدات (${total})`} id="units">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
          <p>
            اختياري: لو المطور بيشارك المخزون، كل وحدة هتظهر بحالتها في صفحة المشروع. للقوايم الطويلة استخدم شيت «الوحدات» في <Link href="/admin/import">استيراد Excel</Link>.
            {total > items.length && ` معروض هنا أول ${items.length} وحدة من ${total}.`}
          </p>
          {total > 0 && <DeleteButton action={deleteProjectUnits} fields={{ id: projectId }} label="حذف كل الوحدات" confirmText={`حذف كل وحدات المشروع (${total})؟`} />}
        </div>

        {editing && (
          // Keyed by unit, so picking another one starts from its own values.
          <details key={editing.id} className="admin-item" open>
            <summary>
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <strong>تعديل الوحدة</strong>
                <span dir="ltr">{name(editing)}</span>
              </span>
            </summary>
            <AdminForm action={saveUnit}>
              <input type="hidden" name="id" value={editing.id} />
              <input type="hidden" name="projectId" value={projectId} />
              {fields(editing)}
            </AdminForm>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <Link href={`${page}#units`} className="text-sm">
                إغلاق
              </Link>
              <DeleteButton action={deleteProjectPart} fields={{ id: editing.id, projectId, part: "unit" }} />
            </div>
          </details>
        )}

        {items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>الوحدة</th>
                  <th>النموذج</th>
                  <th>الدور</th>
                  <th>السعر</th>
                  <th>الحالة</th>
                  <th>
                    <span className="sr-only">تعديل</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td className="font-medium">
                      <span dir="ltr">{name(u)}</span>
                    </td>
                    <td>
                      <span dir="ltr">{code.get(u.typologyId)}</span>
                    </td>
                    <td>{u.floor === null ? "—" : u.floor === 0 ? "أرضي" : u.floor}</td>
                    <td>{egp(u.price)}</td>
                    <td>
                      <span className={AVAILABILITY_BADGE[u.availability]}>{options.availability.find((o) => o.value === u.availability)?.label}</span>
                    </td>
                    <td>
                      <Link href={`${page}?unit=${u.id}#units`}>تعديل</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <details className="admin-item border-dashed" open={total === 0}>
          <summary>
            <span className="font-medium text-link">+ إضافة وحدة</span>
          </summary>
          <AdminForm action={saveUnit} submitLabel="إضافة" resetOnSuccess>
            <input type="hidden" name="projectId" value={projectId} />
            {fields()}
          </AdminForm>
        </details>
      </div>
    </Panel>
  );
}

// ─── Payment plans ──────────────────────────────────────────────────────

export function PaymentPlanList({ projectId, items, typologies }: { projectId: string; items: PaymentPlan[]; typologies: Typology[] }) {
  const typologyOptions = typologies.map((t) => ({ value: t.id, label: t.code }));
  return (
    <PartList
      id="plans"
      projectId={projectId}
      part="plan"
      title="أنظمة السداد"
      addLabel="إضافة نظام سداد"
      items={items}
      action={savePaymentPlan}
      summary={(p) => (
        <>
          <strong>{p.nameAr || `${Number(p.downPaymentPct)}% مقدم`}</strong>
          <span className="text-muted">
            {Number(p.downPaymentPct)}% مقدم · {p.years === 0 ? "كاش" : `${p.years} سنوات`}
          </span>
          {!p.isActive && <span className="admin-badge-off">متوقف</span>}
        </>
      )}
      fields={(p) => (
        <>
          <Row cols={4}>
            <TextField name="downPaymentPct" type="number" label="المقدم % *" defaultValue={dec(p?.downPaymentPct)} />
            <TextField name="years" type="number" label="عدد السنوات *" defaultValue={p?.years} hint="0 = كاش" />
            <Select name="frequency" label="الأقساط *" defaultValue={p?.frequency ?? "QUARTERLY"} options={options.frequency} />
            <TextField name="deliveryPaymentPct" type="number" label="دفعة الاستلام %" defaultValue={dec(p?.deliveryPaymentPct)} />
          </Row>
          <Row cols={4}>
            <TextField name="cashDiscountPct" type="number" label="خصم الكاش %" defaultValue={dec(p?.cashDiscountPct)} />
            <TextField name="maintenancePct" type="number" label="وديعة الصيانة %" defaultValue={dec(p?.maintenancePct)} />
            <TextField name="garageFee" type="number" label="الجراج (جنيه)" defaultValue={dec(p?.garageFee)} />
            <TextField name="clubFee" type="number" label="النادي (جنيه)" defaultValue={dec(p?.clubFee)} />
          </Row>
          <Row cols={4}>
            <TextField name="nameAr" label="اسم النظام بالعربية" defaultValue={p?.nameAr} placeholder="10% مقدم على 8 سنوات" />
            <TextField name="nameEn" label="اسم النظام بالإنجليزية" defaultValue={p?.nameEn} dir="ltr" />
            <TextField name="validUntil" type="date" label="ساري حتى" defaultValue={isoDate(p?.validUntil)} />
            <Select name="typologyId" label="يخص نموذجًا معينًا" emptyLabel="كل النماذج" defaultValue={p?.typologyId} options={typologyOptions} />
          </Row>
          <Checkbox name="isActive" label="نظام فعّال (يظهر على الموقع)" defaultChecked={p ? p.isActive : true} />
        </>
      )}
    />
  );
}

// ─── Master-plan zones ──────────────────────────────────────────────────

export function ZoneList({ projectId, items }: { projectId: string; items: MasterPlanZone[] }) {
  return (
    <PartList
      id="zones"
      projectId={projectId}
      part="zone"
      title="مناطق الماستر بلان"
      addLabel="إضافة منطقة على الماستر بلان"
      items={items}
      action={saveZone}
      summary={(z) => (
        <>
          <strong>{z.shortAr}</strong>
          <span>{z.nameAr}</span>
          <span className="text-muted">{options.zoneKinds.find((o) => o.value === z.kind)?.label.split(" (")[0]}</span>
        </>
      )}
      fields={(z) => (
        <>
          <Row cols={4}>
            <Select name="kind" label="النوع *" defaultValue={z?.kind ?? "RESIDENTIAL"} options={options.zoneKinds} />
            <TextField name="shortAr" label="رمز قصير بالعربية *" defaultValue={z?.shortAr} placeholder="R1" />
            <TextField name="shortEn" label="رمز قصير بالإنجليزية *" defaultValue={z?.shortEn} dir="ltr" placeholder="R1" />
            <TextField name="sortOrder" type="number" label="الترتيب" defaultValue={z?.sortOrder} />
          </Row>
          <Row cols={4}>
            <TextField name="nameAr" label="الاسم بالعربية *" defaultValue={z?.nameAr} />
            <TextField name="nameEn" label="الاسم بالإنجليزية *" defaultValue={z?.nameEn} dir="ltr" />
            <TextField name="phaseAr" label="المرحلة بالعربية" defaultValue={z?.phaseAr} />
            <TextField name="phaseEn" label="المرحلة بالإنجليزية" defaultValue={z?.phaseEn} dir="ltr" />
          </Row>
          <Row>
            <TextArea name="descriptionAr" label="الوصف بالعربية" defaultValue={z?.descriptionAr} rows={2} />
            <TextArea name="descriptionEn" label="الوصف بالإنجليزية" defaultValue={z?.descriptionEn} rows={2} dir="ltr" />
          </Row>
          <Row cols={3}>
            <TextField name="areaFeddan" type="number" label="المساحة (فدان)" defaultValue={dec(z?.areaFeddan)} />
            <TextField name="buildingsCount" type="number" label="عدد المباني" defaultValue={z?.buildingsCount} />
            <TextField name="unitsCount" type="number" label="عدد الوحدات" defaultValue={z?.unitsCount} />
          </Row>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">المكان على صورة الماستر بلان (نسبة مئوية من العرض والارتفاع، من أعلى اليسار)</legend>
            <Row cols={4}>
              <TextField name="xPct" type="number" label="من اليسار % *" defaultValue={dec(z?.xPct)} />
              <TextField name="yPct" type="number" label="من الأعلى % *" defaultValue={dec(z?.yPct)} />
              <TextField name="widthPct" type="number" label="العرض % *" defaultValue={dec(z?.widthPct)} />
              <TextField name="heightPct" type="number" label="الارتفاع % *" defaultValue={dec(z?.heightPct)} />
            </Row>
          </fieldset>
          <CheckboxGroup name="unitSubTypes" label="أنواع الوحدات في المنطقة" options={options.subTypes} defaultValues={z?.unitSubTypes} />
        </>
      )}
    />
  );
}

// ─── Media ──────────────────────────────────────────────────────────────

export function MediaList({ projectId, items }: { projectId: string; items: Media[] }) {
  return (
    <PartList
      id="media"
      projectId={projectId}
      part="media"
      title="الصور والملفات"
      addLabel="إضافة صورة أو ملف"
      items={items}
      action={saveMedia}
      extra={
        <BulkMediaUpload
          projectId={projectId}
          folder={`projects/${projectId}`}
          kinds={options.mediaKinds.filter((k) => ["IMAGE", "FLOOR_PLAN_2D", "MASTER_PLAN", "LAYOUT_SKETCH", "BROCHURE", "VIDEO"].includes(k.value))}
          groups={options.photoGroups}
        />
      }
      summary={(m) => (
        <>
          <strong>{options.mediaKinds.find((o) => o.value === m.kind)?.label.split(" (")[0]}</strong>
          {m.group && <span className="admin-badge">{options.photoGroups.find((o) => o.value === m.group)?.label.split(" (")[0]}</span>}
          <span className="max-w-xs truncate text-xs text-muted" dir="ltr">
            {m.url}
          </span>
        </>
      )}
      fields={(m) => (
        <>
          <Row cols={3}>
            <Select name="kind" label="النوع *" defaultValue={m?.kind ?? "IMAGE"} options={options.mediaKinds} />
            <Select name="group" label="تبويب الصورة" emptyLabel="— للصور فقط —" defaultValue={m?.group} options={options.photoGroups} />
            <TextField name="sortOrder" type="number" label="الترتيب" defaultValue={m?.sortOrder} />
          </Row>
          <UploadField
            name="url"
            label="الملف *"
            defaultValue={m?.url}
            folder={`projects/${projectId}`}
            accept="image/*,application/pdf,video/mp4,video/webm"
            hint="ارفع من جهازك أو الصق رابطًا مباشرًا للصورة أو ملف PDF"
          />
          <Row>
            <TextField name="captionAr" label="التعليق بالعربية" defaultValue={m?.captionAr} />
            <TextField name="captionEn" label="التعليق بالإنجليزية" defaultValue={m?.captionEn} dir="ltr" />
          </Row>
        </>
      )}
    />
  );
}

// ─── Distances ──────────────────────────────────────────────────────────

export function DistanceList({ projectId, items }: { projectId: string; items: ProjectDistance[] }) {
  return (
    <PartList
      id="distances"
      projectId={projectId}
      part="distance"
      title="المسافات"
      addLabel="إضافة مسافة"
      items={items}
      action={saveDistance}
      summary={(d) => (
        <>
          <strong>{d.placeAr}</strong>
          <span className="text-muted">{d.minutes} دقيقة</span>
        </>
      )}
      fields={(d) => (
        <Row cols={4}>
          <TextField name="placeAr" label="المكان بالعربية *" defaultValue={d?.placeAr} placeholder="الطريق الدائري" />
          <TextField name="placeEn" label="المكان بالإنجليزية *" defaultValue={d?.placeEn} dir="ltr" placeholder="Ring Road" />
          <TextField name="minutes" type="number" label="الدقائق بالسيارة *" defaultValue={d?.minutes} />
          <TextField name="sortOrder" type="number" label="الترتيب" defaultValue={d?.sortOrder} />
        </Row>
      )}
    />
  );
}
