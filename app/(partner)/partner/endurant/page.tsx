'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useViewContext } from '@/lib/view-context';

/**
 * /partner/endurant — Direct link to Endurant dashboard
 * Sets view context to this org and redirects to partner home
 */
export default function EndurantPartnerPage() {
  const router = useRouter();
  const { setCurrentView } = useViewContext();

  useEffect(() => {
    setCurrentView('2d84a5d4-41a6-4817-8c36-37d6f8cd727a');
    router.replace('/matching');
  }, []);

  return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-sm text-sos-gray-500">Loading Endurant dashboard...</p>
    </div>
  );
}
