import { DashboardShell } from '@/components/dashboard-shell';
import { AgentChat } from '@/components/agent-chat';

export default function Home() {
  return (
    <DashboardShell title="SOS Agent" subtitle="Your coordination partner">
      <AgentChat />
    </DashboardShell>
  );
}
