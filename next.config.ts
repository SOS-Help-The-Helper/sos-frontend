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
      // TEMP: the-problem + the-sos-story taken offline while we rework them
      // (files remain in /public; remove these redirects to relaunch)
      {
        source: '/the-problem',
        destination: '/',
        permanent: false,
      },
      {
        source: '/the-problem.html',
        destination: '/',
        permanent: false,
      },
      {
        source: '/the-sos-story',
        destination: '/',
        permanent: false,
      },
      {
        source: '/the-sos-story.html',
        destination: '/',
        permanent: false,
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
      {
        source: '/donate',
        destination: '/donate.html',
      },
      {
        source: '/coordination',
        destination: '/platform-coordination.html',
      },
      {
        source: '/case-studies/garden-grove-hazmat',
        destination: '/case-studies/garden-grove-hazmat.html',
      },
    ];
  },
};

export default nextConfig;
