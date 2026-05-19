import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'SOS | Government Dashboard',
  description: 'Situational awareness for emergency management. Aggregated, anonymized, FOIA-safe.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

/**
 * Government route group layout.
 * Clerk auth, read-only role check.
 * Zero PII visible. All data aggregated.
 * This is the screen we show for grant demos.
 */
export default function GovLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F7F5F0]">
      {children}
    </div>
  );
}
