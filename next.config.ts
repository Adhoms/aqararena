import type { NextConfig } from "next";

// The local `prisma dev` database takes one connection at a time (DATABASE_POOL_MAX=1).
// Building against it then has to render pages one by one, or parallel workers jam it.
const singleConnectionDb = process.env.DATABASE_POOL_MAX === "1";

// Browser protections for every page. A full Content-Security-Policy (with the map tiles,
// uploads and analytics allowed) can come later; for now no other site may frame these pages.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    // The developers' landing page moved; old links and search results keep working.
    return [
      { source: "/:lang(ar|en)/for-developers", destination: "/:lang/dev", permanent: true },
      // The offer sheet moved to AqarArena Sales; shared links land on the project page.
      { source: "/:lang(ar|en)/projects/:slug/offer", destination: "/:lang/projects/:slug", permanent: true },
      // Without a language the proxy adds one afterwards.
      { source: "/for-developers", destination: "/dev", permanent: true },
    ];
  },
  // The routes that print PDFs need @sparticuz/chromium's packed browser, which it loads by path at
  // run time, so the file tracer can't see it. Keys are route globs (brackets escaped).
  outputFileTracingIncludes: {
    "/api/pdf-check": ["./node_modules/@sparticuz/chromium/bin/**"],
    "/sales/offers/\\[id\\]/pdf": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    // The Excel import sends the whole workbook to a server action (default limit 1 MB).
    serverActions: { bodySizeLimit: "4mb" },
    ...(singleConnectionDb && { cpus: 1, staticGenerationMaxConcurrency: 1 }),
  },
};

export default nextConfig;
