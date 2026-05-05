import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse and mammoth use Node.js built-ins; keep them out of the bundle
  serverExternalPackages: ["pdf-parse", "mammoth"],
};

export default nextConfig;
