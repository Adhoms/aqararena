import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { loadPublicOffer } from "@/lib/sales/offer-service";
import { isOfferToken } from "@/lib/sales/offer-token";

/**
 * The offer behind a client's link, read once per request: the root layout (for the page's language),
 * its metadata and the page all ask for it. Null for a token that isn't one, an unknown one, or an
 * offer still waiting for approval.
 */
export const publicOffer = cache(async (token: string) => {
  if (!isOfferToken(token)) return null;
  await connection();
  return loadPublicOffer(token);
});
