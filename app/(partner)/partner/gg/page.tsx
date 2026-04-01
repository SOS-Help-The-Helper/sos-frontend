'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useViewContext } from '@/lib/view-context';

/**
 * /partner/gg — Direct link to Greater Good dashboard
 * Sets view context to this org and redirects to partner home
 */
export default function GgPartnerPage() {
  const router = useRouter();
  const { setCurrentView } = useViewContext();

  useEffect(() => {
    setCurrentView('c1e74116-5e12-410a-9b21-dc80c7646d77');
    router.replace('/matching');
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-sm text-sos-gray-500">Loading Greater Good dashboard...</p>
    </div>
  );
}
