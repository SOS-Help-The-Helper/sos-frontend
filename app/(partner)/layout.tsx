'use client';

import { useAuthContext } from '@/lib/auth-context';

export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { orgId } = useAuthContext();
  return <>{children}</>;
}
