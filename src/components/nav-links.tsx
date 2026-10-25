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
        className={`press relative my-2 rounded-full px-3.5 py-2 text-[15px] no-underline ${
          current
            ? "bg-brass-soft font-medium text-brass-dark hover:text-brass-dark"
            : "text-body hover:bg-white/6 hover:text-ink"
        }`}
      >
        {link.label}
      </Link>
    );
  });
}
