"use client";

import Form from "next/form";
import { useRouter } from "next/navigation";
import type { ComponentProps, FormEvent } from "react";
import { readSalesSearch, searchHref } from "@/lib/sales/search";

/**
 * The search's GET form. Without JavaScript the browser submits it as is; with it, the fields are read
 * the same way the page reads the address, so the link only carries the filters that are set
 * (`/sales?beds=3&budget=500000`, not every empty field) and is short enough to send to a colleague.
 */
export function SalesSearchForm(props: Omit<ComponentProps<typeof Form>, "action" | "onSubmit">) {
  const router = useRouter();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params: Record<string, string> = {};
    for (const [key, value] of new FormData(event.currentTarget)) if (typeof value === "string") params[key] = value;
    router.push(searchHref(readSalesSearch(params)));
  }
  return <Form {...props} action="/sales" onSubmit={submit} />;
}
