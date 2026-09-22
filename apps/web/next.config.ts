import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ai-job-search/contracts", "@ai-job-search/domain"],
};

export default nextConfig;

