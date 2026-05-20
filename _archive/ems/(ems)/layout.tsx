import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'SOS | EMS Sitrep',
  description: 'Field situational reporting for first responders.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0F1E2B',
};

/**
 * EMS route group layout.
 * Clerk auth, department-verified.
 * Dark theme for field use. Mobile-optimized, write-heavy.
 * 30-second interaction target.
 */
export default function EmsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F1E2B] text-white">
      {children}
    </div>
  );
}
