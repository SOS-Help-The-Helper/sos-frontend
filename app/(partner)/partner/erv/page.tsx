'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useViewContext } from '@/lib/view-context';

/**
 * /partner/erv — Direct link to Emergency RV dashboard
 * Sets view context to this org and redirects to partner home
 */
export default function ErvPartnerPage() {
  const router = useRouter();
  const { setCurrentView } = useViewContext();

  useEffect(() => {
    setCurrentView('da86c92f-d52d-4b13-a474-30e1be8fb808');
    router.replace('/matching');
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-sm text-sos-gray-500">Loading Emergency RV dashboard...</p>
    </div>
  );
}
