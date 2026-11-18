// The kinds of message the contact form offers. Shared by the form, its page (?kind=) and the server action.
export const CONTACT_KINDS = ["SUGGESTION", "COMPLAINT", "HELP", "REQUEST", "OTHER"] as const;
export type ContactKind = (typeof CONTACT_KINDS)[number];

export const isContactKind = (v: unknown): v is ContactKind => typeof v === "string" && (CONTACT_KINDS as readonly string[]).includes(v);
