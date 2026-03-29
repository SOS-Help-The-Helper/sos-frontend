'use client';

/**
 * Partner route group layout.
 * Clerk auth required. Org-scoped data.
 * Wraps: dashboard, matching, management, map, reporting, settings, view.
 */
export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
