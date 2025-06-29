import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    webSockets: true,
  },
};

export default nextConfig;
