import { randomBytes } from "node:crypto";

/** The client's link to an offer, /o/[token]: 24 random bytes, base64url, so it can't be guessed. */
export const newOfferToken = () => randomBytes(24).toString("base64url");

export const isOfferToken = (s: string) => /^[A-Za-z0-9_-]{32}$/.test(s);
