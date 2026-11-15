"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/sales", label: "المشروعات" },
  { href: "/sales/me", label: "ملفي" },
];

/** The sales menu links; marks the page the salesperson is on. */
export function SalesNav() {
  const pathname = usePathname();
  return LINKS.map((link) => {
    const current = pathname === link.href;
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={current ? "page" : undefined}
        className={current ? "font-semibold text-ink" : "text-body hover:text-ink"}
      >
        {link.label}
      </Link>
    );
  });
}
