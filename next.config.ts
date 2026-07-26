import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export for 0-compute serverless execution on Vercel
  output: "export",
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
