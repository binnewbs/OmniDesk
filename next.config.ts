import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Receipt photos are posted to a server action; the 1 MB default is too small.
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
