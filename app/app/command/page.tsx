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
    <CrmShell module="Command">
      <div className="min-h-screen text-white">
        {/* Stats row */}
        <div className="px-4 md:px-6 pt-5 pb-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard
              icon={<AlertTriangle size={15} />}
              label="Open requests"
              value={stats?.openRequests}
              tone="#EF4E4B"
            />
            <StatCard
              icon={<Zap size={15} />}
              label="Vulnerable"
              value={stats?.critical}
              tone="#F5EBD6"
              sub="veterans + FR"
            />
            <StatCard
              icon={<FileText size={15} />}
              label="Fulfilled"
              value={stats?.fulfilled}
              tone="#34D399"
            />
            <StatCard
              icon={<Package size={15} />}
              label="Resources"
              value={stats?.resources}
              tone="#89CFF0"
            />
            <StatCard
              icon={<Users size={15} />}
              label="People"
              value={stats?.people}
              tone="#89CFF0"
            />
          </div>
        </div>

        {/* Agent chat area */}
        <div className="px-4 md:px-6 pb-4">
          <div className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] overflow-hidden" style={{ minHeight: 400 }}>
            <AgentChat hideHeader />
          </div>
        </div>

        {/* Quick actions */}
        <div className="px-4 md:px-6 pb-8">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/40 mb-2.5 px-1">Quick actions</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map((a) => (
              <button
                key={a.label}
                onClick={() => {
                  // Dispatch a custom event the AgentChat can listen for
                  window.dispatchEvent(new CustomEvent("sos-agent-prompt", { detail: a.prompt }));
                }}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-white/[0.04] border border-[var(--hairline)] hover:bg-white/[0.08] hover:border-white/15 text-[12.5px] font-medium text-white/70 hover:text-white transition"
              >
                <span>{a.icon}</span>
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </CrmShell>
  );
}

function StatCard({ icon, label, value, tone, sub }: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined | null;
  tone: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface-1)] p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: `${tone}15`, color: tone }}
        >
          {icon}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        {value != null ? (
          <span className="text-[22px] font-semibold tabular-nums" style={{ color: tone }}>
            {value.toLocaleString()}
          </span>
        ) : (
          <span className="h-6 w-12 rounded bg-white/10 animate-pulse" />
        )}
        {sub && <span className="text-[10px] text-white/35">{sub}</span>}
      </div>
    </div>
  );
}
