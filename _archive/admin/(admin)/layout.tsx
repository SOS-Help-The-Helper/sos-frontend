import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SOS | Admin',
  description: 'Organism health, approvals, and intelligence feed.',
};

/**
 * Admin route group layout.
 * Restricted to Jonathan's Clerk account. Full access.
 * Organism health, approvals, intelligence feed, config.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
