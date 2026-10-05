import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Google Ads CSV uploads are capped at 5 MB in the action; leave room for form overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
