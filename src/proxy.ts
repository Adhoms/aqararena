import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale, LOCALE_COOKIE } from "@/i18n/config";
import { SESSION_COOKIE } from "@/lib/admin/cookie";
import { PORTAL_COOKIE, PORTAL_PUBLIC_PATHS } from "@/lib/portal/cookie";

// Every page lives under /ar or /en. Paths without a locale are redirected,
// using the visitor's saved choice first and Arabic otherwise.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";
  if (hasLocale(firstSegment)) return;

  // The admin area has no locale. Without a session cookie, go straight to the sign-in page
  // (the pages and actions still verify the cookie themselves).
  if (firstSegment === "admin") {
    if (pathname !== "/admin/login" && !request.cookies.has(SESSION_COOKIE)) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return;
  }

  // The developer portal works the same way with its own cookie.
  if (firstSegment === "portal") {
    if (!PORTAL_PUBLIC_PATHS.includes(pathname) && !request.cookies.has(PORTAL_COOKIE)) {
      return NextResponse.redirect(new URL("/portal/login", request.url));
    }
    return;
  }

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = saved && hasLocale(saved) ? saved : defaultLocale;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Skip Next.js internals, API routes and files with an extension (images, icons…).
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
