import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 is a native module; keep it out of the bundle so its
  // .node binding is required at runtime instead of being webpack-bundled.
  serverExternalPackages: ["better-sqlite3"],
  images: {
    // Icons are served from disk via a Route Handler, not the image optimizer.
    unoptimized: true,
  },
};

export default nextConfig;
