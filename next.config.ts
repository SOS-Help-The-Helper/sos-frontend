import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Pre-existing: react-dom types don't resolve on Vercel with React 19 + bundler moduleResolution
    // TODO: fix properly when @types/react-dom installs correctly in CI
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
