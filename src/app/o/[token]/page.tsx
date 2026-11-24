import { notFound } from "next/navigation";
import { OfferDocument } from "@/components/offer/offer-document";
import { publicOffer } from "@/components/offer/load";

// The client's price offer (spec section 7). The token is the only key: 24 random bytes. An offer
// waiting for approval and a wrong link both show the not-found page. `next dev` answers it with 404;
// a production server has already sent the route's (empty) prerendered shell with 200 by then, as
// Cache Components does, so there it is a 200 with noindex (the X-Robots-Tag header on /o/* too). A
// path that can't hold a token gets a real 404 from the proxy.
export const instant = false;

export default async function OfferPage({ params }: PageProps<"/o/[token]">) {
  const offer = await publicOffer((await params).token);
  if (!offer) notFound();
  return <OfferDocument offer={offer} />;
}
