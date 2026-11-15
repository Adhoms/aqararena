/** Name of the AqarArena Sales session cookie. Kept apart from ./session.ts so the proxy can import it cheaply. */
export const SALES_COOKIE = "aqar_sales";

/** /sales pages anyone can open without signing in. */
export const SALES_PUBLIC_PATHS = ["/sales/login", "/sales/logout"];
