'use client';

import { DashboardShell } from '@/components/dashboard-shell';
import { AgentChat } from '@/components/agent-chat';
import { useViewContext } from '@/lib/view-context';

export default function Home() {
  const { currentView } = useViewContext();
  const isCitizen = currentView === 'citizen';

  return (
    <DashboardShell
      title={isCitizen ? "SOS — How Can We Help?" : "SOS Connect"}
      subtitle={isCitizen ? "Tell us what you need or what you can offer" : "Community coordination platform"}
    >
      <AgentChat hideHeader />
    </DashboardShell>
  );
}
