/** False when a request carries an Origin header that is not this site's (or one that won't parse). Used by sign-out routes. */
export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (origin === null) return true;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}
