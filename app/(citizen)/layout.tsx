import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'SOS | Help',
  description: 'Everyone is a helper. Get help, give help, find someone.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SOS',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1A3850',
};

/**
 * Citizen route group layout.
 * NO Clerk — phone auth via Supabase.
 * PWA-optimized, mobile-first.
 */
export default function CitizenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            }
          `,
        }}
      />
      {children}
      {/* PWA install prompt — loaded client-side */}
      <div id="pwa-install" />
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Apple splash screen meta tags
            var meta = document.createElement('meta');
            meta.name = 'apple-mobile-web-app-capable';
            meta.content = 'yes';
            document.head.appendChild(meta);
          `,
        }}
      />
    </div>
  );
}
