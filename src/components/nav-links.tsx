"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** Main menu links; marks the section the visitor is in. */
export function NavLinks({ links }: { links: { href: string; label: string; mobileOnly?: boolean }[] }) {
  const pathname = usePathname();
  const currentRef = useRef<HTMLAnchorElement>(null);
  // On phones the menu scrolls sideways: bring the current section's link into view.
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [pathname]);
  return links.map((link) => {
    const current = !link.href.includes("#") && (pathname === link.href || pathname.startsWith(link.href + "/"));
    return (
      <Link
        key={link.href}
        ref={current ? currentRef : undefined}
        href={link.href}
        aria-current={current ? "page" : undefined}
        className={`press relative my-2 rounded-full px-3.5 py-2 text-[15px] no-underline ${link.mobileOnly ? "md:hidden" : ""} ${
          current
            ? "bg-brass-soft font-medium text-brass-dark hover:text-brass-dark"
            : "text-body hover:bg-ink/5 hover:text-ink"
        }`}
      >
        {link.label}
      </Link>
    );
  });
}
