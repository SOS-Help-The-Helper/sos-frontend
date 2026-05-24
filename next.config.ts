import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // React 19 + bundler moduleResolution type resolution issue
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: '/erv',
        destination: '/app?org=erv',
        permanent: true,
      },
      {
        source: '/erv/:path((?!impact).*)',
        destination: '/app?org=erv',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/',
        destination: '/home-v25.html',
      },
      {
        source: '/what-is-sos',
        destination: '/what-is-sos.html',
      },
    ];
  },
};

export default nextConfig;
