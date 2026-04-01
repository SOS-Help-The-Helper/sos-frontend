'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useViewContext } from '@/lib/view-context';

/**
 * /partner/fhm — Direct link to Free Hot Meals dashboard
 * Sets view context to this org and redirects to partner home
 */
export default function FhmPartnerPage() {
  const router = useRouter();
  const { setCurrentView } = useViewContext();

  useEffect(() => {
    setCurrentView('9d894368-51af-4cf7-9318-444a3c216f5d');
    router.replace('/matching');
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-sm text-sos-gray-500">Loading Free Hot Meals dashboard...</p>
    </div>
  );
}
