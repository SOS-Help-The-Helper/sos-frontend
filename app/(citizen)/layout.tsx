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
    <div className="min-h-screen bg-[#F7F5F0]">
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
    </div>
  );
}
