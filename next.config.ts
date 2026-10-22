import type { NextConfig } from "next";

// The local `prisma dev` database takes one connection at a time (DATABASE_POOL_MAX=1).
// Building against it then has to render pages one by one, or parallel workers jam it.
const singleConnectionDb = process.env.DATABASE_POOL_MAX === "1";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  ...(singleConnectionDb && { experimental: { cpus: 1, staticGenerationMaxConcurrency: 1 } }),
};

export default nextConfig;
