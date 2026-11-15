import { endPortalSession } from "@/lib/portal/session";

// Sign-out is a plain form POST, so the browser loads the sign-in page afresh and no page left in the
// client's memory (temporary passwords, drafts) survives it. Works without JavaScript.
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return new Response("Forbidden", { status: 403 });
  await endPortalSession();
  return new Response(null, { status: 303, headers: { Location: "/portal/login" } });
}
