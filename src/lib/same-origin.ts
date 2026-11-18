/** False when a request carries an Origin header that is not this site's (or one that won't parse). Used by sign-out routes. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  try {
    // Behind a proxy the public host is in x-forwarded-host; Host may be the upstream's.
    const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
