'use client';

import { useAuthContext } from '@/lib/auth-context';
import { useViewContext } from '@/lib/view-context';
import { PortalConfigProvider } from '@/lib/use-portal-config';

/**
 * Wrapper that reads orgId + orgType from auth/view context
 * and passes them to PortalConfigProvider.
 * 
 * This keeps the provider decoupled from auth implementation.
 */
export function PortalConfigProviderWrapper({ children }: { children: React.ReactNode }) {
  const { orgId } = useAuthContext();
  const { effectiveOrgId, effectiveOrgType } = useViewContext();

  // Use view context's effective org (supports "View As" switching)
  // Fall back to auth context org
  const resolvedOrgId = effectiveOrgId || orgId;
  const resolvedOrgType = effectiveOrgType || null;

  return (
    <PortalConfigProvider orgId={resolvedOrgId} orgType={resolvedOrgType}>
      {children}
    </PortalConfigProvider>
  );
}
