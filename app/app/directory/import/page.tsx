'use client';

import dynamic from 'next/dynamic';

const ImportPage = dynamic(() => import('@/components/directory/ImportPage'), { ssr: false });

export default function Page() {
  return <ImportPage />;
}
