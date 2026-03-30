'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useViewContext } from '@/lib/view-context';

/**
 * /partner/aa — Direct link to Aid Arena dashboard
 * Sets view context to this org and redirects to partner home
 */
export default function AaPartnerPage() {
  const router = useRouter();
  const { setCurrentView } = useViewContext();

  useEffect(() => {
    setCurrentView('43299807-6229-49be-9a6b-0498c9188178');
    router.replace('/');
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-sm text-sos-gray-500">Loading Aid Arena dashboard...</p>
    </div>
  );
}
