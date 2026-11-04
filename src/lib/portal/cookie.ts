/** Name of the developer portal session cookie. Kept apart from ./session.ts so the proxy can import it cheaply. */
export const PORTAL_COOKIE = "aqar_dev";

/** Portal pages anyone can open without signing in. */
export const PORTAL_PUBLIC_PATHS = ["/portal/login", "/portal/register", "/portal/forgot"];
