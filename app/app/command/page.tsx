"use client";

import { useEffect, useState } from "react";
import { CrmShell } from "@/components/crm-shell";
import { AgentChat } from "@/components/agent-chat";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { usePortalConfig } from "@/lib/use-portal-config";
import { FileText, Users, Package, AlertTriangle, Zap } from "lucide-react";

const DEMO_ORG_ID = "9ad0f2ad-7789-47a8-bfba-0ae3382c86cc";

type Stats = {
  openRequests: number;
  critical: number;
  fulfilled: number;
  resources: number;
  people: number;
};

export default function CommandPage() {
  const { orgId: authOrgId } = useAuthContext();
  const orgId = authOrgId || DEMO_ORG_ID;
  const { config } = usePortalConfig();
  const [stats, setStats] = useState<Stats | null>(null);

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
      <div className="h-[calc(100vh-56px)] flex flex-col overflow-hidden" style={{ background: "var(--surface-app)" }}>
        {/* Stats strip */}
        <div className="px-4 md:px-5 pt-3 pb-2 flex-shrink-0">
          <div className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide">
            <StatPill label="Open" value={stats?.openRequests} tone="#EF4E4B" icon={<AlertTriangle size={11} />} primary />
            <StatPill label="Vulnerable" value={stats?.critical} tone="#D97706" icon={<Zap size={11} />} />
            <StatPill label="Fulfilled" value={stats?.fulfilled} tone="#059669" icon={<FileText size={11} />} />
            <StatPill label="Resources" value={stats?.resources} tone="#2563EB" icon={<Package size={11} />} />
            <StatPill label="People" value={stats?.people} tone="#6B7280" icon={<Users size={11} />} />
          </div>
        </div>

        {/* Agent chat — fills everything */}
        <div className="flex-1 min-h-0 mx-3 md:mx-4 mb-3 rounded-xl overflow-hidden border border-[var(--hairline)]">
          <AgentChat hideHeader />
        </div>
      </div>
    </CrmShell>
  );
}

function StatPill({ icon, label, value, tone, primary }: {
  icon: React.ReactNode;
  label: string;
  value: number | undefined | null;
  tone: string;
  primary?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      <span className="flex items-center justify-center w-5 h-5 rounded" style={{ background: `${tone}18`, color: tone }}>
        {icon}
      </span>
      <div className="flex items-baseline gap-1.5">
        {value != null ? (
          <span className={"tabular-nums font-bold " + (primary ? "text-[18px]" : "text-[15px]")} style={{ color: tone }}>
            {value.toLocaleString()}
          </span>
        ) : (
          <span className="h-4 w-6 rounded bg-black/5 animate-pulse inline-block" />
        )}
        <span className="text-[10px] font-medium text-black/40 uppercase tracking-wide">{label}</span>
      </div>
    </div>
  );
}
