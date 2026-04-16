import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/home-v25.html',
      },
    ];
  },
};

export default nextConfig;
