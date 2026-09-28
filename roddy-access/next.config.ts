import type { NextConfig } from "next";

// Pages are prerendered as static HTML; the one server route (/api/request)
// delivers plan requests. Host on Vercel, Netlify or any Node host.
const nextConfig: NextConfig = {
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
