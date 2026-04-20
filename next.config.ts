import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // React 19 + bundler moduleResolution type resolution issue
    ignoreBuildErrors: true,
  },
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
