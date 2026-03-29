'use client';

import { useAuthContext } from '@/lib/auth-context';
import { NotificationProvider } from '@/lib/notification-context';
import { NotificationToasts } from '@/components/notification-toast';

/**
 * Partner route group layout.
 * Clerk auth required. Org-scoped data.
 * Wraps: dashboard, matching, management, map, reporting, settings, view.
 */
export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { orgId } = useAuthContext();

  return (
    <NotificationProvider orgId={orgId}>
      {children}
      <NotificationToasts />
    </NotificationProvider>
  );
}
