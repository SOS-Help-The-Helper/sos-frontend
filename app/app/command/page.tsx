"use client";

/**
 * Command — operating picture. Phase 1 reference implementation.
 * KPI row + operating-picture map + priority requests + docked agent panel.
 * Composed entirely from @/components/console. Data via lib/api (EFs) only.
 * Redesign 2026-06 (SOS Connect System).
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { MapPreview } from "@/components/map-preview";
import {
  ConsoleShell,
  AgentPanel,
  Surface,
  SectionLabel,
  StatusDot,
  Chip,
  KpiStat,
  Button,
  Skeleton,
  EmptyState,
  useDemoMode,
  type DisasterOption,
  type AgentMessage,
  type AgentSuggestion,
  type StatusTone,
} from "@/components/console";

/* ------------------------------------------------------------------ */
/* Types for the shapes we read (kept local + narrow)                  */
/* ------------------------------------------------------------------ */
interface IncidentSummary {
  open_requests?: number;
  open_requests_delta?: number;
  critical?: number;
  critical_delta?: number;
  resources?: number;
  resources_delta?: number;
  reports?: number;
  trend?: { open?: number[]; critical?: number[]; resources?: number[] };
}
interface PriorityCase {
  id: string;
  name?: string;
  display_name?: string;
  category?: string;
  urgency?: string;
  stage?: string;
  request_count?: number;
  resource_count?: number;
}
interface Disaster {
  id: string;
  name: string;
  day?: number;
}

const URGENCY_TONE: Record<string, StatusTone> = {
  critical: "new",
  high: "matching",
  medium: "contacted",
  low: "reserved",
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
export default function CommandPage() {
  const router = useRouter();
  const { orgId } = useAuthContext();
  const demo = useDemoMode();

  const [disasters, setDisasters] = useState<DisasterOption[]>([]);
  const [activeDisaster, setActiveDisaster] = useState<string | undefined>();
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [priority, setPriority] = useState<PriorityCase[] | null>(null);
  const [mapData, setMapData] = useState<{ requests: any[]; resources: any[] }>({ requests: [], resources: [] });

  // Load disasters once.
  useEffect(() => {
    let alive = true;
    api
      .crmDisastersList()
      .then((d: any) => {
        if (!alive) return;
        const list: Disaster[] = (d?.disasters || d || []).map((x: any) => ({
          id: x.id,
          name: x.name,
          day: x.day ?? x.day_count,
        }));
        setDisasters(list);
        if (list[0]) setActiveDisaster(list[0].id);
      })
      .catch(() => setDisasters([]));
    return () => {
      alive = false;
    };
  }, []);

  // Load summary + priority + map when org/disaster ready.
  useEffect(() => {
    if (!orgId) return;
    let alive = true;

    if (activeDisaster) {
      api
        .crmCommandSummary(activeDisaster)
        .then((s: any) => alive && setSummary(s || {}))
        .catch(() => alive && setSummary({}));
    }

    api
      .crmCasesList(orgId)
      .then((r: any) => {
        if (!alive) return;
        const cases: PriorityCase[] = (r?.cases || []).slice(0, 6);
        setPriority(cases);
      })
      .catch(() => alive && setPriority([]));

    api
      .crmMapFeatures(orgId)
      .then((f: any) => {
        if (!alive) return;
        const feats = f?.features || [];
        const reqs = feats
          .filter((x: any) => x?.properties?.kind === "request")
          .map((x: any) => ({
            id: x.properties.id,
            latitude: x.geometry?.coordinates?.[1],
            longitude: x.geometry?.coordinates?.[0],
            category: x.properties.category || "",
            urgency: x.properties.urgency || "medium",
          }));
        const res = feats
          .filter((x: any) => x?.properties?.kind === "resource")
          .map((x: any) => ({
            id: x.properties.id,
            latitude: x.geometry?.coordinates?.[1],
            longitude: x.geometry?.coordinates?.[0],
            category: x.properties.category || "",
          }));
        setMapData({ requests: reqs, resources: res });
      })
      .catch(() => alive && setMapData({ requests: [], resources: [] }));

    return () => {
      alive = false;
    };
  }, [orgId, activeDisaster, demo]);

  const navCounts = useMemo(
    () => ({ command: summary?.critical || 0 }),
    [summary],
  );

  const agentMessages: AgentMessage[] = useMemo(() => {
    const open = summary?.open_requests ?? priority?.length ?? 0;
    const crit = summary?.critical ?? 0;
    return [
      {
        id: "m1",
        role: "agent",
        text: `${open} open requests${crit ? `, ${crit} critical and still unrouted` : ""}.`,
      },
      { id: "m2", role: "agent", text: "Want me to triage the critical ones first?" },
    ];
  }, [summary, priority]);

  const agentSuggestions: AgentSuggestion[] = [
    { id: "triage", label: "Triage critical", tone: "new" },
    { id: "cases", label: "Open cases", onSelect: () => router.push("/app/cases") },
    { id: "broadcast", label: "Broadcast to vendors" },
  ];

  return (
    <ConsoleShell
      navCounts={navCounts}
      disasters={disasters}
      activeDisasterId={activeDisaster}
      onSelectDisaster={setActiveDisaster}
      agent={
        <AgentPanel
          status={summary?.critical ? `Coordinating · ${summary.critical} critical` : "Monitoring"}
          statusTone="active"
          messages={agentMessages}
          suggestions={agentSuggestions}
          onSend={() => router.push("/app/cases")}
        />
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1200, margin: "0 auto" }}>
        {/* KPI row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 12,
          }}
        >
          {summary ? (
            <>
              <KpiStat label="Open requests" value={summary.open_requests ?? 0} delta={summary.open_requests_delta} trend={summary.trend?.open} tone="var(--cn-coral)" />
              <KpiStat label="Critical" value={summary.critical ?? 0} delta={summary.critical_delta} trend={summary.trend?.critical} tone="var(--cn-coral)" />
              <KpiStat label="Resources" value={summary.resources ?? mapData.resources.length} delta={summary.resources_delta} trend={summary.trend?.resources} tone="var(--cn-blue)" />
              <KpiStat label="Reports" value={summary.reports ?? 0} tone="var(--cn-amber)" />
            </>
          ) : (
            Array.from({ length: 4 }).map((_, i) => (
              <Surface key={i} variant="card" pad={4}>
                <Skeleton h={12} w={70} />
                <div style={{ height: 10 }} />
                <Skeleton h={28} w={56} />
              </Surface>
            ))
          )}
        </div>

        {/* Operating picture + priority */}
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.7fr) minmax(280px, 1fr)", gap: 16 }} className="cn-cmd-grid">
          {/* Map */}
          <Surface variant="card" pad={0} radius="xl" style={{ overflow: "hidden", minHeight: 420, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 18px 12px" }}>
              <div>
                <SectionLabel>Operating picture</SectionLabel>
                <div style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--cn-text)", marginTop: 4 }}>
                  {disasters.find((d) => d.id === activeDisaster)?.name || "All sectors"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Chip tone="new">Requests {mapData.requests.length}</Chip>
                <Chip tone="reserved">Resources {mapData.resources.length}</Chip>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 320, position: "relative" }}>
              <MapPreview requests={mapData.requests} resources={mapData.resources} />
            </div>
            <div style={{ padding: 12, borderTop: "1px solid var(--cn-border)" }}>
              <Button variant="ghost" size="sm" onClick={() => router.push("/app/map")} leading={<ArrowRight size={14} />}>
                Open full map
              </Button>
            </div>
          </Surface>

          {/* Priority requests */}
          <Surface variant="card" pad={0} radius="xl" style={{ display: "flex", flexDirection: "column", minHeight: 420 }}>
            <div style={{ padding: "16px 18px 10px", borderBottom: "1px solid var(--cn-border)" }}>
              <SectionLabel tone="new">Priority requests</SectionLabel>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
              {priority === null ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: 8 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} h={48} />
                  ))}
                </div>
              ) : priority.length === 0 ? (
                <EmptyState title="No open requests" hint="New intake will appear here as it arrives." />
              ) : (
                priority.map((c) => {
                  const tone = URGENCY_TONE[(c.urgency || "").toLowerCase()] || "neutral";
                  const name = c.display_name || c.name || "Unnamed";
                  return (
                    <button
                      key={c.id}
                      onClick={() => router.push(`/app/cases/${c.id}`)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 11,
                        width: "100%",
                        textAlign: "left",
                        background: "none",
                        border: "1px solid transparent",
                        borderRadius: 10,
                        padding: "10px 10px",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "var(--cn-surface-3)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                    >
                      <StatusDot tone={tone} size={9} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14, color: "var(--cn-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {name}
                        </span>
                        <span style={{ display: "block", fontSize: 12, color: "var(--cn-text-3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {c.category || "Request"}
                          {c.request_count ? ` · ${c.request_count} req` : ""}
                          {c.resource_count ? ` · ${c.resource_count} res` : ""}
                        </span>
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </Surface>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .cn-cmd-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </ConsoleShell>
  );
}
