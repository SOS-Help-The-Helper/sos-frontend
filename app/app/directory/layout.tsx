'use client';

import { Suspense } from 'react';

export default function DirectoryLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[#89CFF0] border-t-transparent rounded-full animate-spin" /></div>}>{children}</Suspense>;
}
