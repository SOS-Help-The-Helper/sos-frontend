"use client";

import { useEffect, useState } from "react";
import { CrmShell } from "@/components/crm-shell";
import { AgentChat } from "@/components/agent-chat";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { usePortalConfig } from "@/lib/use-portal-config";
import { FileText, Users, Package, AlertTriangle, Zap, Send } from "lucide-react";

// Default to ERV for demo
const DEMO_ORG_ID = "9ad0f2ad-7789-47a8-bfba-0ae3382c86cc";

type Stats = {
  openRequests: number;
  critical: number;
  fulfilled: number;
  resources: number;
  people: number;
};

const QUICK_ACTIONS = [
  { icon: "🆘", label: "New request", prompt: "I need to submit a new request for someone who needs help" },
  { icon: "🔍", label: "Find a match", prompt: "Find the best match for our open requests" },
  { icon: "📊", label: "Pipeline status", prompt: "Show me a summary of our current request pipeline" },
  { icon: "👥", label: "Team status", prompt: "How many active volunteers and resources do we have?" },
];

export default function CommandPage() {
  const { orgId: authOrgId } = useAuthContext();
  const orgId = authOrgId || DEMO_ORG_ID;
  const { config } = usePortalConfig();
  const [stats, setStats] = useState<Stats | null>(null);
  const [agentPrompt, setAgentPrompt] = useState("");

  useEffect(() => {
    if (!orgId) return;
    Promise.all([
      api.crmRequestsList(orgId).catch(() => null),
      api.crmResourcesList(orgId).catch(() => null),
      api.crmBrowsePersons(orgId, { limit: 1 }).catch(() => null),
    ]).then(([reqSum, resSum, people]: any[]) => {
      const byStatus = reqSum?.by_status || {};
      const pending = byStatus.pending || 0;
      const approved = byStatus.approved || 0;
      const matched = byStatus.matched || 0;
      const inProgress = byStatus.in_progress || 0;
      setStats({
        openRequests: pending + approved + matched + inProgress,
        critical: reqSum?.veteran_count || 0,
        fulfilled: byStatus.fulfilled || 0,
        resources: resSum?.total || 0,
        people: people?.total || reqSum?.total || 0,
      });
    });
  }, [orgId]);

  return (
    <CrmShell module="Command" bare>
      <div className="h-[calc(100vh-56px)] flex flex-col text-white overflow-hidden">
        {/* Stats row — compact */}
        <div className="px-4 md:px-6 pt-3 pb-2 flex-shrink-0">
          <div className="grid grid-cols-5 gap-2">
            <StatCard icon={<AlertTriangle size={13} />} label="Open" value={stats?.openRequests} tone="#EF4E4B" />
            <StatCard icon={<Zap size={13} />} label="Vulnerable" value={stats?.critical} tone="#F5EBD6" />
            <StatCard icon={<FileText size={13} />} label="Fulfilled" value={stats?.fulfilled} tone="#34D399" />
            <StatCard icon={<Package size={13} />} label="Resources" value={stats?.resources} tone="#89CFF0" />
            <StatCard icon={<Users size={13} />} label="People" value={stats?.people} tone="#89CFF0" />
          </div>
        </div>

        {/* Agent chat — fills remaining space */}
        <div className="px-4 md:px-6 pb-2 flex-1 min-h-0">
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] overflow-hidden h-full">
            <AgentChat hideHeader />
          </div>
        </div>

        {/* Quick actions — pinned to bottom */}
        <div className="px-4 md:px-6 pb-3 flex-shrink-0">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("sos-agent-prompt", { detail: a.prompt }));
                }}
                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-lg bg-white/[0.04] border border-[var(--hairline)] hover:bg-white/[0.08] hover:border-white/15 text-[11.5px] font-medium text-white/60 hover:text-white transition"
              >
                <span className="text-[13px]">{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </CrmShell>
  );
}

function StatCard({ icon, label, value, tone }: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined | null;
  tone: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--hairline)] bg-[var(--surface-1)] px-3 py-2 flex items-center gap-2.5">
      <span
        className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
        style={{ background: `${tone}25`, color: tone }}
      >
        {icon}
      </span>
      <div className="min-w-0">
        {value != null ? (
          <span className="text-[17px] font-bold tabular-nums block leading-tight text-[var(--foreground)]">
            {value.toLocaleString()}
          </span>
        ) : (
          <span className="h-4 w-8 rounded bg-white/10 animate-pulse block" />
        )}
        <span className="font-mono text-[9px] uppercase tracking-wider text-[var(--foreground)] opacity-50">{label}</span>
      </div>
    </div>
  );
}
