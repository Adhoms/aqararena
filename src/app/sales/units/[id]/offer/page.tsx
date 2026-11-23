import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { OfferForm } from "@/components/sales/offer-form";
import { SalesShell } from "@/components/sales/sales-shell";
import { planLabel, plansForType } from "@/lib/sales/budget";
import { loadSalesUnit, salesPlans } from "@/lib/sales/inventory";
import { requireSales } from "@/lib/sales/session";

export const metadata: Metadata = { title: "عرض سعر جديد" };

// A new price offer for one unit. Only an available unit, or one held by this salesperson, can get one
// (the service checks it again when the form is sent).
export default async function NewOfferPage({ params }: PageProps<"/sales/units/[id]/offer">) {
  const me = await requireSales();
  const { id } = await params;
  const unit = /^[a-z0-9]{10,40}$/i.test(id) ? await loadSalesUnit({ id: me.id, role: me.role, developerId: me.developer.id }, id) : null;
  if (!unit) notFound();
  const [plansByProject, developer] = await Promise.all([
    salesPlans(me.developer.id, [unit.project.id]),
    db.developer.findUniqueOrThrow({ where: { id: me.developer.id }, select: { offerValidityDays: true, agentDiscountPct: true, leadDiscountPct: true } }),
  ]);
  const plans = plansForType(plansByProject.get(unit.project.id) ?? [], unit.typologyId);
  const mine = unit.state === "HELD" && unit.hold?.salesAccountId === me.id;
  const blocked =
    unit.state === "AVAILABLE" || mine
      ? null
      : unit.state === "HELD"
        ? `الوحدة محجوزة مؤقتًا لـ ${unit.hold?.holder ?? "زميل"}، فمينفعش يتعمل عليها عرض دلوقتي.`
        : "الوحدة دي مش متاحة، فمينفعش يتعمل عليها عرض.";
  return (
    <SalesShell
      me={me}
      title={
        <span className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-balance">
          <span>عرض سعر</span>
          <span className="text-xl text-muted sm:text-2xl">
            <bdi dir="ltr">{unit.label}</bdi> · {unit.project.nameAr}
          </span>
        </span>
      }
    >
      <Link href={`/sales/units/${unit.id}`} className="press -mt-3 inline-flex min-h-11 items-center gap-1.5 self-start text-sm sm:min-h-0">
        <span aria-hidden="true">→</span> الوحدة
      </Link>
      {blocked ? (
        <p className="admin-panel m-0 text-sm">
          {blocked} <Link href={`/sales/units/${unit.id}`}>ارجع للوحدة</Link>
        </p>
      ) : plans.length === 0 ? (
        <p className="admin-panel m-0 text-sm text-muted">مفيش خطط سداد سارية للوحدة دي، فمينفعش يتعمل عرض.</p>
      ) : (
        <section aria-label="بيانات العرض" className="admin-panel flex max-w-3xl flex-col gap-5">
          <p className="m-0 text-sm leading-relaxed text-pretty text-muted">
            العرض بيتحفظ بأسعار وخطط النهارده، وبعد ما يطلع هتلاقي أزرار المشاركة. العرض مش بيحجز الوحدة{mine ? "، والحجز المؤقت بتاعك فاضل زي ما هو" : ""}.
          </p>
          <OfferForm
            unitId={unit.id}
            plans={plans.map((p) => ({ id: p.id, label: planLabel(p) }))}
            validityDays={developer.offerValidityDays}
            limits={{ agentDiscountPct: Number(developer.agentDiscountPct), leadDiscountPct: Number(developer.leadDiscountPct) }}
            role={me.role}
            price={unit.price}
            currency={unit.project.currency}
          />
        </section>
      )}
    </SalesShell>
  );
}
