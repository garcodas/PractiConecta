import { resolve } from "node:path";
import type { NextConfig } from "next";

const gateway = process.env.GATEWAY_URL ?? "http://localhost:4000";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: resolve(import.meta.dirname),
  // El navegador solo habla con este origen: evita CORS y mantiene la cookie de primera parte.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${gateway}/api/:path*` }];
  },
  turbopack: {
    root: resolve(import.meta.dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
