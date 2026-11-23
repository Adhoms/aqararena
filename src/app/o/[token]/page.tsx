import { notFound } from "next/navigation";
import { connection } from "next/server";
import { OfferDocument } from "@/components/offer/offer-document";
import { loadPublicOffer } from "@/lib/sales/offer-service";
import { isOfferToken } from "@/lib/sales/offer-token";

// The client's price offer (spec section 7). The token is the only key: 24 random bytes. An offer
// waiting for approval and a wrong link both show the not-found page, with a 404: the route blocks
// on the offer (no Suspense above it), so notFound() runs before the response starts.
export const instant = false;

export default async function OfferPage({ params }: PageProps<"/o/[token]">) {
  await connection();
  const { token } = await params;
  const offer = isOfferToken(token) ? await loadPublicOffer(token) : null;
  if (!offer) notFound();
  return <OfferDocument offer={offer} />;
}
