"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  // A unit page belongs to the inventory.
  { href: "/sales", label: "المخزون", also: "/sales/units/" },
  { href: "/sales/holds", label: "حجوزاتي" },
  // An offer's page belongs to «عروضي».
  { href: "/sales/offers", label: "عروضي", also: "/sales/offers/" },
  { href: "/sales/me", label: "ملفي" },
];

/** The sales menu links; marks the page the salesperson is on. */
export function SalesNav() {
  const pathname = usePathname();
  return LINKS.map((link) => {
    // The page itself is "page"; a page inside the section (a unit under «المخزون») is "location".
    const current = pathname === link.href ? "page" : link.also !== undefined && pathname.startsWith(link.also) ? "location" : undefined;
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={current}
        // The public site's menu pill (nav-links.tsx), 44 px tall on phones so it's easy to tap.
        className={`inline-flex min-h-11 items-center rounded-full px-3 no-underline sm:min-h-9 ${
          current ? "bg-brass-soft font-medium text-brass-dark hover:text-brass-dark" : "text-body hover:bg-ink/5 hover:text-ink"
        }`}
      >
        {link.label}
      </Link>
    );
  });
}
