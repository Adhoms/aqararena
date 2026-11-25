import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, hasLocale, LOCALE_COOKIE } from "@/i18n/config";
import { SESSION_COOKIE } from "@/lib/admin/cookie";
import { PORTAL_COOKIE, PORTAL_PUBLIC_PATHS } from "@/lib/portal/cookie";
import { isOfferToken } from "@/lib/sales/offer-token";
import { SALES_COOKIE, SALES_PUBLIC_PATHS } from "@/lib/sales/cookie";

// Every page lives under /ar or /en. Paths without a locale are redirected,
// using the visitor's saved choice first and Arabic otherwise.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const firstSegment = pathname.split("/")[1] ?? "";
  if (hasLocale(firstSegment)) return;

  // The admin area has no locale. Without a session cookie, go straight to the sign-in page
  // (the pages and actions still verify the cookie themselves).
  if (firstSegment === "admin") {
    if (pathname !== "/admin/login" && pathname !== "/admin/logout" && !request.cookies.has(SESSION_COOKIE)) {
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

  // AqarArena Sales works the same way with its own cookie.
  if (firstSegment === "sales") {
    if (!SALES_PUBLIC_PATHS.includes(pathname) && !request.cookies.has(SALES_COOKIE)) {
      return NextResponse.redirect(new URL("/sales/login", request.url));
    }
    return;
  }

  // A client's price offer (/o/[token]) carries its own language; it is never moved under /ar or /en.
  // A path that can't hold a token is answered here with a real 404, without touching the database
  // (the page's own not-found answers 200 with noindex, as its response has already started).
  if (firstSegment === "o") {
    const [, , token, ...rest] = pathname.split("/");
    if (!token || rest.length > 0 || !isOfferToken(token)) return offerNotFound();
    return;
  }

  const saved = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale = saved && hasLocale(saved) ? saved : defaultLocale;

  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

/** The offer's not-found page as plain HTML, for links the proxy can tell are wrong. */
function offerNotFound() {
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><title>عرض سعر · Price offer · AqarArena</title></head><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#edefe9;color:#10231e;font-family:system-ui,sans-serif;text-align:center"><main style="max-width:28rem;padding:1.5rem"><h1 style="font-weight:400;font-size:1.5rem">الرابط ده مش بيفتح عرض</h1><p>ممكن يكون العرض لسه مستني موافقة، أو الرابط ناقص. اسأل مسؤول المبيعات اللي بعتهولك.</p><p lang="en" dir="ltr" style="color:#586a63;font-size:.875rem">This link doesn&#39;t open an offer. Please ask your sales contact.</p></main></body></html>`;
  return new NextResponse(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer", "Cache-Control": "no-store" },
  });
}

export const config = {
  // Skip Next.js internals, API routes, the home-screen icon and files with an extension (images, icons…).
  matcher: ["/((?!_next|api|apple-icon|.*\\..*).*)"],
};
