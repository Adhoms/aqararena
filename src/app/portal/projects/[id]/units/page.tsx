import Link from "next/link";
import { notFound } from "next/navigation";
import type { Unit } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { options } from "@/lib/admin/labels";
import { formatDateTimeAr } from "@/lib/format";
import { requireAccount } from "@/lib/portal/session";
import { liveHoldWhere, liveHoldsByUnit } from "@/lib/sales/hold-service";
import { HOLD_HOURS_MAX, HOLD_HOURS_MIN } from "@/lib/sales/holds";
import { PortalShell } from "@/components/portal/portal-shell";
import { UnitStatusSelect } from "@/components/portal/unit-status";
import { UnitsImport } from "@/components/portal/units-import";
import { AdminForm, DeleteButton } from "@/components/admin/admin-form";
import { HoldConfirm } from "@/components/admin/hold-confirm";
import { Panel, Row, Select, TextField } from "@/components/admin/fields";
import { deletePortalUnit, saveProjectHoldHours, savePortalUnit } from "../../../unit-actions";

const UNITS_SHOWN = 500;
const egp = (v: { toString(): string } | null) => (v ? `${Number(v).toLocaleString("ar-EG")} ج.م` : "—");
const dec = (v: { toString(): string } | null | undefined) => (v === null || v === undefined ? undefined : v.toString());

// A developer's units for one project: status, price, building and floor. Changes here go live
// to the sales team at once (within the rules in app/portal/unit-actions.ts).
export default async function PortalUnitsPage({ params, searchParams }: PageProps<"/portal/projects/[id]/units">) {
  const me = await requireAccount();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const project = await db.project.findFirst({
    where: { id, developerId: me.developerId },
    select: {
      id: true,
      nameAr: true,
      slug: true,
      published: true,
      holdHours: true,
      developer: { select: { holdHours: true } },
      typologies: { where: { priceFrom: { not: null } }, orderBy: { priceFrom: "asc" }, select: { id: true, code: true, nameAr: true, priceFrom: true } },
    },
  });
  if (!project) notFound();
  const unitId = typeof query.unit === "string" && /^[a-z0-9]{10,40}$/i.test(query.unit) ? query.unit : null;
  const [units, total, counts, editing, heldCount] = await Promise.all([
    db.unit.findMany({ where: { typology: { projectId: id } }, orderBy: [{ building: "asc" }, { floor: "asc" }, { unitNumber: "asc" }], take: UNITS_SHOWN }),
    db.unit.count({ where: { typology: { projectId: id } } }),
    db.unit.groupBy({ by: ["availability"], where: { typology: { projectId: id } }, _count: { _all: true } }),
    unitId ? db.unit.findFirst({ where: { id: unitId, typology: { projectId: id } } }) : null,
    db.unitHold.count({ where: { ...liveHoldWhere(), unit: { typology: { projectId: id } } } }),
  ]);
  // Who holds which unit right now (AqarArena Sales), for the table and the edit form.
  const holds = await liveHoldsByUnit([...units.map((u) => u.id), ...(editing ? [editing.id] : [])]);
  const holdText = (unitId: string) => holds[unitId] && `${holds[unitId].name} لحد ${formatDateTimeAr(holds[unitId].expiresAt)}`;
  const count = (a: string) => counts.find((c) => c.availability === a)?._count._all ?? 0;
  const code = new Map(project.typologies.map((t) => [t.id, t.code]));
  const typeOptions = project.typologies.map((t) => ({ value: t.id, label: `${t.code}${t.nameAr ? ` · ${t.nameAr}` : ""} (يبدأ من ${egp(t.priceFrom)})` }));
  const page = `/portal/projects/${project.id}/units`;
  const name = (u: Unit) => [u.building, u.unitNumber].filter(Boolean).join(" · ");

  const fields = (u?: Unit | null) => (
    <>
      <Row cols={4}>
        <Select name="typologyId" label="النموذج *" defaultValue={u?.typologyId ?? typeOptions[0]?.value} options={typeOptions} />
        <TextField name="unitNumber" label="رقم الوحدة *" defaultValue={u?.unitNumber} dir="ltr" placeholder="301" />
        <TextField name="building" label="المبنى" defaultValue={u?.building} dir="ltr" placeholder="B1" />
        <TextField name="floor" type="number" label="الدور" defaultValue={u?.floor} hint="0 = أرضي" />
      </Row>
      <Row cols={4}>
        <Select name="availability" label="الحالة *" defaultValue={u?.availability ?? "AVAILABLE"} options={options.availability} />
        <TextField name="price" type="number" label="سعر الوحدة (جنيه)" defaultValue={dec(u?.price)} hint="فاضي = سعر النموذج. مايقلش عن سعر النموذج" />
        <Select name="view" label="الإطلالة" emptyLabel="—" defaultValue={u?.view} options={options.unitViews} />
        <Select name="orientation" label="الاتجاه" emptyLabel="—" defaultValue={u?.orientation} options={options.orientations} />
      </Row>
    </>
  );

  return (
    <PortalShell company={me.developer.nameAr} title={`المخزون: ${project.nameAr}`} back>
      <section className="admin-panel flex flex-col gap-2 text-sm">
        <p className="font-medium">التعديلات هنا بتوصل لفريق مبيعاتك على طول</p>
        <p className="text-muted">
          حالة الوحدات (متاحة / محجوزة / مباعة) بتظهر لفريق مبيعاتك في AqarArena Sales، مش للزوار على الموقع. حدّث الحالة أول ما وحدة تتباع أو تتحجز. سعر الوحدة مايقدرش يقل عن سعر «يبدأ من» للنموذج، ولتغيير النماذج نفسها أو أسعارها افتح «تعديل» المشروع من الصفحة الرئيسية.
        </p>
        <p>
          متاحة <b>{count("AVAILABLE").toLocaleString("ar-EG")}</b>
          {heldCount > 0 && ` (منها ${heldCount.toLocaleString("ar-EG")} محجوزة مؤقتًا لفريق المبيعات)`} · محجوزة <b>{count("RESERVED").toLocaleString("ar-EG")}</b> · مباعة{" "}
          <b>{count("SOLD").toLocaleString("ar-EG")}</b>
        </p>
      </section>

      {project.typologies.length === 0 ? (
        <p className="admin-panel text-sm text-muted">المشروع لسه مالوش نماذج وحدات بسعر. ضيفها من «تعديل» المشروع، وبعد الموافقة تقدر تضيف الوحدات هنا.</p>
      ) : (
        <>
          <Panel title="رفع كل الوحدات من Excel">
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-muted">
                نزّل الملف، عدّل الحالات أو ضيف وحدات، وارفعه تاني. الوحدة اللي ليها نفس الرقم والمبنى بتتحدّث بدل ما تتكرر، والوحدات اللي مش في الملف مابتتمسحش.
              </p>
              <a href={`${page}/export`} className="admin-btn-ghost self-start" download>
                تنزيل ملف الوحدات
              </a>
              <UnitsImport projectId={project.id} />
            </div>
          </Panel>

          <Panel title={`الوحدات (${total.toLocaleString("ar-EG")})`} id="units">
            <div className="flex flex-col gap-3">
              {total > units.length && <p className="text-sm text-muted">معروض أول {units.length} وحدة. لباقي الوحدات استخدم ملف Excel.</p>}

              {editing && (
                <details key={editing.id} className="admin-item" open>
                  <summary>
                    <span className="flex flex-wrap items-center gap-x-3">
                      <strong>تعديل الوحدة</strong>
                      <span dir="ltr">{name(editing)}</span>
                    </span>
                  </summary>
                  {holdText(editing.id) && <p className="mb-3 text-sm text-brass-dark">محجوزة مؤقتًا لـ {holdText(editing.id)}</p>}
                  <HoldConfirm message={holdText(editing.id) && `الوحدة دي محجوزة مؤقتًا لـ ${holdText(editing.id)}. لو غيّرت حالتها لغير «متاحة» الحجز هيتلغي. تحفظ؟`}>
                    <AdminForm action={savePortalUnit}>
                      <input type="hidden" name="id" value={editing.id} />
                      <input type="hidden" name="projectId" value={project.id} />
                      {fields(editing)}
                    </AdminForm>
                  </HoldConfirm>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <Link href={`${page}#units`} className="text-sm">
                      إغلاق
                    </Link>
                    <DeleteButton action={deletePortalUnit} fields={{ id: editing.id, projectId: project.id }} confirmText={holdText(editing.id) ? `الوحدة دي محجوزة مؤقتًا لـ ${holdText(editing.id)}. لو اتحذفت الحجز هيتلغي. تحذفها؟` : "حذف الوحدة دي؟"} />
                  </div>
                </details>
              )}

              {units.length > 0 && (
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
                      {units.map((u) => (
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
                            {/* Keyed by status and hold, so a refresh resets the row when either changes on the server. */}
                            <UnitStatusSelect key={`${u.id}:${u.availability}:${holdText(u.id) ?? ""}`} unitId={u.id} value={u.availability} label={`حالة الوحدة ${name(u)}`} hold={holdText(u.id)} />
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
                <AdminForm action={savePortalUnit} submitLabel="إضافة" resetOnSuccess>
                  <input type="hidden" name="projectId" value={project.id} />
                  {fields()}
                </AdminForm>
              </details>
            </div>
          </Panel>
        </>
      )}

      <Panel title="مدة الحجز المؤقت في المشروع ده">
        <AdminForm action={saveProjectHoldHours}>
          <input type="hidden" name="projectId" value={project.id} />
          <TextField
            name="holdHours"
            type="number"
            inputMode="numeric"
            autoComplete="off"
            label="عدد الساعات"
            defaultValue={project.holdHours}
            hint={`فاضي = مدة الشركة (${project.developer.holdHours} ساعة، بتتغيّر من «فريق المبيعات»). من ${HOLD_HOURS_MIN} لـ ${HOLD_HOURS_MAX}. مثلًا قللها يوم الإطلاق عشان الوحدات ماتتركنش. بيسري على الحجوزات الجديدة بس.`}
          />
        </AdminForm>
      </Panel>
    </PortalShell>
  );
}
