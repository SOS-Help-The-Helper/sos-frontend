import { DashboardShell } from '@/components/dashboard-shell';
import { AgentChat } from '@/components/agent-chat';

export default function Agent() {
  return (
    <DashboardShell title="SOS Agent" subtitle="Your coordination partner">
      <AgentChat />
    </DashboardShell>
  );
}
