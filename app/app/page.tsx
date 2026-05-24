'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AppIndexInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const org = searchParams.get('org');

  useEffect(() => {
    // Redirect to cases, preserving org param if present
    const dest = org ? `/app/cases?org=${org}` : '/app/cases';
    router.replace(dest);
  }, [router, org]);

  return null;
}

export default function AppIndex() {
  return (
    <Suspense fallback={null}>
      <AppIndexInner />
    </Suspense>
  );
}
