import type { Metadata } from "next";
import Link from "next/link";
import { AdminForm } from "@/components/admin/admin-form";
import { Panel, Row, TextField } from "@/components/admin/fields";
import { OfferList } from "@/components/sales/offer-list";
import { SalesShell } from "@/components/sales/sales-shell";
import { OFFERS_NOUN, countAr } from "@/lib/format";
import { ROLE_LABELS } from "@/lib/sales/fields";
import { myOffers, offerCounts } from "@/lib/sales/offer-service";
import { requireSales } from "@/lib/sales/session";
import { updateSalesProfile } from "../actions";

export const metadata: Metadata = { title: "ملفي" };

/** Fields and buttons a thumb can hit on a phone (44 px), the usual size from the sm breakpoint up. */
const INPUT = "admin-input min-h-11 text-base sm:min-h-10 sm:text-sm";

export default async function SalesMePage() {
  const me = await requireSales();
  const actor = { id: me.id, role: me.role, developerId: me.developer.id };
  const [counts, recent] = await Promise.all([offerCounts(actor), myOffers(actor, new Date(), 5)]);
  return (
    <SalesShell me={me} title="ملفي">
      {/* Only offers that went out count (at once or approved, even if cancelled later); not requests rejected while pending. */}
      <Panel title="عروضي">
        <p className="mb-4 text-sm text-pretty">
          {counts.total === 0 ? (
            "لسه ماطلّعتش عروض."
          ) : (
            <>
              طلّعت {countAr(counts.total, OFFERS_NOUN)}، {counts.recent === 0 ? "مفيش منهم حاجة" : `منهم ${countAr(counts.recent, OFFERS_NOUN)}`} في آخر ٣٠ يوم.
            </>
          )}
        </p>
        {recent.length > 0 && <OfferList offers={recent} />}
        <Link href="/sales/offers" className="press admin-btn-ghost mt-4 min-h-11 sm:min-h-0">
          كل عروضي
        </Link>
      </Panel>
      <Panel title="بياناتك على العروض">
        <p className="mb-4 text-sm text-muted">الاسم والأرقام دي هي اللي العميل هيشوفها على عروض الأسعار اللي هتبعتها.</p>
        <AdminForm action={updateSalesProfile} resetOnSuccess submitClassName="admin-btn min-h-11 sm:min-h-0">
          <Row>
            <TextField name="nameAr" label="الاسم بالعربي *" defaultValue={me.nameAr} autoComplete="name" inputClassName={INPUT} />
            <TextField name="nameEn" label="الاسم بالإنجليزي" defaultValue={me.nameEn} dir="ltr" hint="بيظهر على العروض الإنجليزي" inputClassName={INPUT} />
          </Row>
          <Row cols={3}>
            <TextField name="phone" label="الموبايل *" type="tel" defaultValue={me.phone} dir="ltr" autoComplete="tel" inputClassName={INPUT} />
            <TextField name="whatsapp" label="واتساب" type="tel" defaultValue={me.whatsapp} dir="ltr" autoComplete="off" hint="فاضي = نفس الموبايل" inputClassName={INPUT} />
            <TextField name="email" label="البريد الإلكتروني" type="email" defaultValue={me.email} dir="ltr" autoComplete="email" inputClassName={INPUT} />
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
        <Link href="/sales/password" className="admin-btn-ghost mt-4 min-h-11 sm:min-h-0">
          تغيير كلمة المرور
        </Link>
      </Panel>
    </SalesShell>
  );
}
