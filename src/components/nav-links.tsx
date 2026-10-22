"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Main menu links; marks the section the visitor is in. */
export function NavLinks({ links }: { links: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return links.map((link) => {
    const current = !link.href.includes("#") && pathname.startsWith(link.href);
    return (
      <Link
        key={link.href}
        href={link.href}
        aria-current={current ? "page" : undefined}
        className={`border-b-2 py-3 text-[15px] text-ink no-underline hover:text-brand ${
          current ? "border-brass font-semibold" : "border-transparent"
        }`}
      >
        {link.label}
      </Link>
    );
  });
}
