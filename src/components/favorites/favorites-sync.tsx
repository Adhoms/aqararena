"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { useFavorites } from "./store";

/**
 * Keeps the favorites page URL (?p=a,b,c) in step with the saved list, so the server can render the
 * cards and the address can be shared. A shared link (someone else's list) is shown as-is and not
 * merged into this visitor's favorites.
 */
export function FavoritesSync({ shared }: { shared: boolean }) {
  const { slugs } = useFavorites();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const current = params.get("p") ?? "";
  const wanted = slugs.join(",");

  useEffect(() => {
    if (shared || current === wanted) return;
    router.replace(wanted ? `${pathname}?p=${wanted}` : pathname, { scroll: false });
  }, [shared, current, wanted, pathname, router]);

  return null;
}
