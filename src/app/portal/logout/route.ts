import { endPortalSession } from "@/lib/portal/session";
import { sameOrigin } from "@/lib/same-origin";

// Sign-out is a plain form POST, so the browser loads the sign-in page afresh and no page left in the
// client's memory (temporary passwords, drafts) survives it. Works without JavaScript.
export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Forbidden", { status: 403 });
  await endPortalSession();
  return new Response(null, { status: 303, headers: { Location: "/portal/login" } });
}
