import type { NextConfig } from "next";

// Static export: the whole site builds to /out and can be hosted anywhere
// (Vercel, Netlify, Cloudflare Pages, any static host).
const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
