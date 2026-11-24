import { OfferDocument } from "@/components/offer/offer-document";
import { publicOffer } from "@/components/offer/load";
import OfferNotFound from "./not-found";

// The client's price offer (spec section 7). The token is the only key: 24 random bytes. An offer
// waiting for approval and an unknown token both get the not-found page, rendered here rather than
// through notFound(): this route's response has already started by then (Cache Components sends the
// prerendered shell first), so notFound() could only answer 200 anyway, and its page would reach the
// browser as script, blank without it. This way it is plain HTML, still noindex (the layout's metadata
// and the X-Robots-Tag header on /o/*). A path that can't hold a token gets a real 404 from the proxy.
export const instant = false;

export default async function OfferPage({ params }: PageProps<"/o/[token]">) {
  const offer = await publicOffer((await params).token);
  if (!offer) return <OfferNotFound />;
  return <OfferDocument offer={offer} />;
}
