import { endSalesSession } from "@/lib/sales/session";
import { sameOrigin } from "@/lib/same-origin";

// A plain form POST, so the browser does a full page load and no client state outlives the session.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  await endSalesSession();
  return new Response(null, { status: 303, headers: { Location: "/sales/login" } });
}
