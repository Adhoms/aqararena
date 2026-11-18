import Link from "next/link";
import { SalesCard } from "@/components/sales/sales-shell";

// A unit that doesn't exist and one that belongs to another company look the same on purpose.
export default function SalesNotFound() {
  return (
    <SalesCard title="الصفحة دي مش موجودة" subtitle="يمكن الوحدة اتشالت، أو الرابط مش من مشروعات شركتك.">
      <Link href="/sales" className="admin-btn min-h-11 justify-center self-start sm:min-h-0">
        رجوع للمخزون
      </Link>
    </SalesCard>
  );
}
