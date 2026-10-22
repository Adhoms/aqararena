"use client";

import Form from "next/form";
import type { ComponentProps, FormEvent } from "react";

/** A GET form that applies filters as soon as a select or checkbox changes. Text search applies on Enter. */
export function FilterForm(props: Omit<ComponentProps<typeof Form>, "onChange">) {
  function submitOnChange(event: FormEvent<HTMLFormElement>) {
    const target = event.target as HTMLInputElement;
    if (target.type === "search" || target.type === "text") return;
    event.currentTarget.requestSubmit();
  }
  return <Form {...props} onChange={submitOnChange} />;
}
