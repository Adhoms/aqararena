"use client";

import Form from "next/form";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useTransition, type ComponentProps, type FormEvent } from "react";
import { readSalesSearch, searchHref, type SalesSearch } from "@/lib/sales/search";

const Pending = createContext(false);
/** The address a submit went to, read once by the results after that search renders. */
let focusResultsAt: string | null = null;
/** Typed values the search can't read are kept in the link, so the page can say what was wrong. */
const CHECKED = ["budget", "floorMin", "floorMax"] as const;

/**
 * The search's GET form. Without JavaScript the browser submits it as is; with it, the fields are read
 * the same way the page reads the address, so the link only carries the filters that are set
 * (`/sales?beds=3&budget=500000`, not every empty field) and is short enough to send to a colleague.
 */
export function SalesSearchForm({ children, ...props }: Omit<ComponentProps<typeof Form>, "action" | "onSubmit">) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params: Record<string, string> = {};
    for (const [key, value] of new FormData(event.currentTarget)) if (typeof value === "string") params[key] = value;
    const search = readSalesSearch(params);
    const query = new URLSearchParams(searchHref(search).split("?")[1]);
    for (const key of CHECKED) if (params[key]?.trim() && search[key as keyof SalesSearch] === undefined) query.set(key, params[key].trim());
    const qs = query.toString();
    const href = qs ? `/sales?${qs}` : "/sales";
    focusResultsAt = href;
    startTransition(() => router.push(href));
  }
  return (
    <Form {...props} action="/sales" onSubmit={submit} aria-busy={pending || undefined}>
      <Pending value={pending}>{children}</Pending>
    </Form>
  );
}

/** «بحث», disabled and saying so while the new results load. */
export function SearchButton({ className }: { className?: string }) {
  const pending = useContext(Pending);
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "بيدوّر…" : "بحث"}
    </button>
  );
}

/**
 * After a search the filters box is rebuilt, which drops keyboard focus; this puts it on the results
 * heading instead. Rendered with a key per address, so it runs after each navigation; it only moves focus
 * when that navigation was a search submitted here (never on first load, paging or a chip).
 */
export function FocusResults({ target }: { target: string }) {
  useEffect(() => {
    const submitted = focusResultsAt;
    focusResultsAt = null;
    if (submitted === location.pathname + location.search) document.getElementById(target)?.focus();
  }, [target]);
  return null;
}
