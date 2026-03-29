'use client';

import { AgentChat } from '@/components/agent-chat';
import { useRouter } from 'next/navigation';

export default function CitizenChat() {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto min-h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-sos-blue-800">
        <button onClick={() => router.push('/c')} className="text-white/60 hover:text-white text-sm">← Back</button>
        <div className="flex items-center gap-2">
          <img src="/logomark.svg" alt="SOS" className="h-6 w-6" />
          <span className="text-sm font-bold text-white">SOS Agent</span>
        </div>
      </div>
      <div className="flex-1">
        <AgentChat hideHeader />
      </div>
    </div>
  );
}
