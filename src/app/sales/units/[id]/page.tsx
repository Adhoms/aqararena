import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ar from "@/app/[lang]/dictionaries/ar.json";
import { Panel } from "@/components/admin/fields";
import { PaymentCalculator } from "@/components/project/payment-calculator";
import { HoldPanel } from "@/components/sales/hold-panel";
import { MarkedPlan } from "@/components/sales/marked-plan";
import { Money } from "@/components/sales/money";
import { SalesShell } from "@/components/sales/sales-shell";
import { StateBadge } from "@/components/sales/state-badge";
import { formatNumber } from "@/lib/format";
import { planLabel, plansForType } from "@/lib/sales/budget";
import { loadSalesUnit, salesPlans } from "@/lib/sales/inventory";
import { finishingLabel, floorLabel, orientationLabel, subTypeSingular, viewLabel } from "@/lib/sales/labels";
import { requireSales } from "@/lib/sales/session";

export const metadata: Metadata = { title: "وحدة" };

/** A number left to right inside the Arabic line. */
const Num = ({ value }: { value: number }) => <bdi dir="ltr">{formatNumber(value, "ar")}</bdi>;
/** Areas can have a fraction (112.5 م²); western digits, as prices are written. */
const area = new Intl.NumberFormat("ar-EG-u-nu-latn", { maximumFractionDigits: 1 });
const m2 = (v: number | null) =>
  v ? (
    <>
      <bdi dir="ltr">{area.format(v)}</bdi> م²
    </>
  ) : null;
const isPdf = (url: string) => /\.pdf(\?|$)/i.test(url);

// A salesperson's view of one unit: its hold, details, the type's floor plans, the master plan and
// the payment calculator on every active plan. Another company's unit id is "not found".
export default async function SalesUnitPage({ params }: PageProps<"/sales/units/[id]">) {
  const me = await requireSales();
  const { id } = await params;
  const unit = /^[a-z0-9]{10,40}$/i.test(id) ? await loadSalesUnit({ id: me.id, role: me.role, developerId: me.developer.id }, id) : null;
  if (!unit) notFound();
  const plans = plansForType((await salesPlans(me.developer.id, [unit.project.id])).get(unit.project.id) ?? [], unit.typologyId);
  const t = unit.type;
  const facts: [string, ReactNode][] = [
    [
      "النموذج",
      <>
        <bdi dir="ltr">{t.code}</bdi>
        {t.nameAr && <> · {t.nameAr}</>}
      </>,
    ],
    ["النوع", subTypeSingular(t.subType)],
    ["التشطيب", finishingLabel(t.finishing)],
    ["المساحة", m2(t.buaM2)],
    ["الصافي", m2(t.netM2)],
    ["الحديقة", m2(t.gardenM2)],
    ["الروف", m2(t.roofM2)],
    ["التراس", m2(t.terraceM2)],
    ["غرف النوم", t.bedrooms === null ? null : <Num value={t.bedrooms} />],
    ["الحمامات", t.bathrooms === null ? null : <Num value={t.bathrooms} />],
    ["الدور", unit.floor === null ? null : <bdi>{floorLabel(unit.floor)}</bdi>],
    ["الإطلالة", unit.view ? viewLabel(unit.view) : null],
    ["الاتجاه", unit.orientation ? orientationLabel(unit.orientation) : null],
    ["التسليم", <bdi key="delivery" dir="ltr">{unit.project.deliveryYear}</bdi>],
  ];

  return (
    <SalesShell
      me={me}
      title={
        // The unit's label already has a dot in it (B1 · 101), so the project is set apart by size and colour.
        <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-balance">
          <bdi dir="ltr">{unit.label}</bdi>
          <span className="text-xl text-muted sm:text-2xl">{unit.project.nameAr}</span>
        </span>
      }
      actions={<StateBadge state={unit.state} className="text-sm" />}
    >
      <Link href="/sales" className="press -mt-3 inline-flex min-h-11 items-center gap-1.5 self-start text-sm sm:min-h-0">
        <span aria-hidden="true">→</span> المخزون
      </Link>

      {/* On a phone the hold box comes first. From a wide screen it has its own column beside everything
          else (details, calculator, plans), so it stays in view while the salesperson reads. */}
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="lg:order-last lg:w-80 lg:shrink-0">
          <div className="lg:sticky lg:top-20">
            <HoldPanel me={me} unitId={unit.id} state={unit.state} hold={unit.hold} hours={unit.project.holdHours} />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-6">
          <section aria-labelledby="details-title" className="admin-panel flex flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
              <div className="flex flex-col gap-0.5">
                <h2 id="details-title" className="font-display text-xl">
                  تفاصيل الوحدة
                </h2>
                <p className="m-0 text-sm text-muted">
                  {subTypeSingular(t.subType)} في {unit.project.nameAr}
                </p>
              </div>
              <div className="flex flex-col items-start gap-0.5 sm:items-end">
                <span className="text-xs text-muted">السعر</span>
                <span className="font-display text-[28px] leading-tight font-light tabular-nums"><Money value={unit.price} currency={unit.project.currency} /></span>
                {t.buaM2 > 0 && <span className="text-xs text-muted tabular-nums">سعر المتر <Money value={unit.price / t.buaM2} currency={unit.project.currency} /></span>}
              </div>
            </div>
            <dl className="m-0 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-divider pt-5 text-sm sm:grid-cols-3 xl:grid-cols-4">
              {facts
                .filter(([, v]) => v !== null)
                .map(([label, value]) => (
                  <div key={label} className="flex min-w-0 flex-col gap-0.5">
                    <dt className="text-xs text-muted">{label}</dt>
                    <dd className="m-0 font-medium break-words tabular-nums">{value}</dd>
                  </div>
                ))}
            </dl>
            <div className="flex flex-wrap items-center gap-3 border-t border-divider pt-5">
              {unit.state === "AVAILABLE" || (unit.state === "HELD" && unit.hold?.salesAccountId === me.id) ? (
                <Link href={`/sales/units/${unit.id}/offer`} className="press admin-btn min-h-11 sm:min-h-9">
                  عرض سعر
                </Link>
              ) : (
                <span className="inline-flex min-h-11 items-center text-sm text-muted sm:min-h-9">
                  {unit.state === "HELD" ? "مينفعش عرض سعر وهي محجوزة لزميل" : "مينفعش عرض سعر على وحدة مش متاحة"}
                </span>
              )}
              {/* Not built yet: plain text styled as a muted button, so it can't be focused or pressed. */}
              <span className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-full border border-dashed border-line-strong px-4 text-sm text-muted select-none sm:min-h-9">
                إضافة للمقارنة
                <span className="admin-badge">قريبًا</span>
              </span>
              <a
                href={`/ar/projects/${unit.project.slug}`}
                target="_blank"
                rel="noreferrer"
                className="press admin-btn-ghost min-h-11 sm:min-h-9"
              >
                صفحة المشروع على AqarArena <span aria-hidden="true">↗</span>
                <span className="sr-only">(بتفتح في تبويب جديد)</span>
              </a>
            </div>
          </section>

          {plans.length > 0 ? (
            <PaymentCalculator
              units={[{ code: unit.id, name: unit.label, price: unit.price }]}
              plans={plans}
              maintenancePct={plans.find((p) => p.maintenancePct !== undefined)?.maintenancePct}
              locale="ar"
              currency={unit.project.currency}
              labels={{
                ...ar.calculator,
                title: "حاسبة السداد",
                sub: "اختار الخطة وشوف المقدم والأقساط على سعر الوحدة دي.",
                unit: "الوحدة",
                note: "الأرقام من سعر الوحدة وخطط السداد السارية النهارده، ومقرّبة: المبالغ الكبيرة لأقرب ألف والأقساط لأقرب ١٠٠.",
                frequencyPer: ar.frequencyPer,
                planNames: plans.map(planLabel),
              }}
            />
          ) : (
            <p className="admin-panel m-0 text-sm text-muted">مفيش خطط سداد سارية للوحدة دي دلوقتي.</p>
          )}

          {unit.floorPlans.length > 0 && (
            <Panel title={unit.floorPlansOfType ? "مسقط النموذج" : "مساقط المشروع"}>
              {!unit.floorPlansOfType && <p className="-mt-2 mb-4 text-xs text-muted">مفيش مسقط خاص بالنموذج ده، دي مساقط المشروع كله.</p>}
              <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,260px),1fr))] gap-4 p-0">
                {unit.floorPlans.map((f, i) => (
                  <li key={`${f.url}-${i}`} className="overflow-hidden rounded-xl border border-line">
                    <a href={f.url} target="_blank" rel="noreferrer" className="block">
                      {isPdf(f.url) ? (
                        <span className="flex h-56 flex-col items-center justify-center gap-1 px-4 text-center text-sm text-muted">
                          <span className="text-ink">{f.caption ?? `مسقط ${i + 1}`}</span>
                          <span>
                            ملف <bdi dir="ltr">PDF</bdi> <span aria-hidden="true">↗</span>
                          </span>
                        </span>
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element -- uploaded plans of unknown size, as on the project page
                        <img src={f.url} alt={f.caption ?? `مسقط ${i + 1}`} loading="lazy" decoding="async" className="h-56 w-full bg-white object-contain p-2" />
                      )}
                      <span className="sr-only">(بتفتح في تبويب جديد)</span>
                    </a>
                    {f.caption && <p className="m-0 border-t border-divider px-4 py-2 text-[13px] text-ink">{f.caption}</p>}
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {unit.masterPlan && (
            <Panel title="الماستر بلان">
              <p className="-mt-2 mb-4 text-xs text-muted">
                {unit.zone ? <>الوحدة في «{unit.zone.label}»، متعلّمة على الماستر بلان.</> : "مكان الوحدة مش متحدد على الماستر بلان."}
              </p>
              <a href={unit.masterPlan} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-line bg-plan">
                {/* The frame hugs the height-capped image, so the zone lands where the admin measured it. */}
                <MarkedPlan
                  image={unit.masterPlan}
                  zone={unit.zone}
                  alt={`الماستر بلان: ${unit.project.nameAr}`}
                />
                <span className="sr-only">(بتفتح في تبويب جديد)</span>
              </a>
            </Panel>
          )}
        </div>
      </div>
    </SalesShell>
  );
}
