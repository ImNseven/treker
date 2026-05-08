import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone output for Docker/Render deployment
  output: "standalone",
  // Suppress React hydration warnings in production
  reactStrictMode: true,
};

export default nextConfig;
