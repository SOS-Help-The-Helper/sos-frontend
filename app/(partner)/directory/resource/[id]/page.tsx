"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CrmShell } from "@/components/crm-shell";
import { AiSummary } from "@/components/crm/AiSummary";
import {
  DetailTopBar, IdentityBand, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
  StatusPill, MetaPopover, OverflowMenu, HeroLine, ActionBtn,
} from "@/components/crm/DetailShell";
import { api } from "@/lib/api";
import { User, MapPin, Package, Calendar, GitBranch, ArrowRight, Sparkles, MessageSquare, Share2, Flag, XCircle } from "lucide-react";

// Types matching the crmResourceDetail EF response
interface HistEntry { event: string; date: string; }
interface MatchedTo { personName: string; caseId: string; }
interface AssetEvent { id: string; resourceId: string; eventType: string; fromStatus?: string; toStatus?: string; fromLocation?: string; toLocation?: string; notes?: string; performedBy: string; timestamp: string; }
interface ResourceData {
  id: string; title?: string; description?: string; taxonomy_code?: string; status: string;
  location_text?: string; city?: string; state?: string; county?: string;
  capacity_available?: number; capacity_total?: number;
  org_id?: string; person_id?: string;
  persons?: { display_name: string; phone?: string } | null;
  locations?: { street_address?: string; city?: string; state?: string } | null;
  [key: string]: unknown;
}

export default function ResourcePage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<{ resource: ResourceData; matches: any[] } | null | undefined>(undefined);

  useEffect(() => {
    api.crmResourceDetail(id)
      .then((res: any) => setData(res?.resource ? res : null))
      .catch(() => setData(null));
  }, [id]);

  if (data === undefined) {
    return (
      <CrmShell module="Directory">
        <DetailTopBar backTo="/inventory" backLabel="Resources" />
        <main className="max-w-[960px] mx-auto px-4 md:px-6 py-5 md:py-7 space-y-4 animate-pulse">
          <div className="h-20 rounded-xl bg-white/5" />
          <div className="h-16 rounded-xl bg-white/5" />
          <div className="h-48 rounded-xl bg-white/5" />
        </main>
      </CrmShell>
    );
  }

  if (!data || !data.resource) {
    return <CrmShell module="Directory"><DetailTopBar backTo="/inventory" backLabel="Resources" /><div className="p-10 text-center text-white/50">Resource not found</div></CrmShell>;
  }

  // Map API response to display-friendly shape
  const res = data.resource;
  const r = {
    id: res.id,
    title: res.title || res.description || res.taxonomy_code || 'Resource',
    taxonomy: res.taxonomy_code || 'Unknown',
    status: res.status,
    location: res.location_text || [res.city, res.state].filter(Boolean).join(', ') || res.locations?.city || 'Unknown',
    ownerName: res.persons?.display_name || 'Unknown',
    org: res.org_id || null,
    capacity: res.capacity_available != null ? `${res.capacity_available}${res.capacity_total ? `/${res.capacity_total}` : ''} units` : '—',
    matchedTo: data.matches?.length > 0 ? { personName: data.matches[0].request_person_id || 'Matched', caseId: data.matches[0].id } as MatchedTo : null,
    history: [] as HistEntry[],
  };
  const events: AssetEvent[] = [];
  const statusColor =
    r.status === "deployed" ? "#34D399" : r.status === "matched" ? "#89CFF0" : "#F5EBD6";

  const tabs: DetailTab[] = [
    {
      key: "activity",
      label: "Activity",
      count: r.history.length + events.length,
      content: (
        <div className="space-y-6">
          <ol className="relative ml-2 space-y-4 border-l border-[var(--hairline)] pl-6">
            {r.history.map((h: HistEntry, i: number) => (
              <li key={i} className="relative">
                <span
                  className="absolute -left-[34px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-[var(--surface-1)]"
                  style={{ background: "rgba(137,207,240,0.18)" }}
                >
                  <Package size={12} style={{ color: "#89CFF0" }} />
                </span>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-medium text-white/90">{h.event}</p>
                  <span className="text-[10.5px] text-white/40" title={h.date}>{h.date}</span>
                </div>
              </li>
            ))}
          </ol>
          {events.length > 0 && (
            <div>
              <p className="text-[11.5px] text-white/45 mb-2">Asset events</p>
              <ol className="relative ml-2 space-y-3 border-l border-[var(--hairline)] pl-5">
                {events.map((e) => {
                  const color =
                    e.eventType === "status_change" ? "#89CFF0" :
                    e.eventType === "location_move" ? "#34D399" :
                    e.eventType === "condition_update" ? "#F5EBD6" :
                    e.eventType === "assignment" ? "#EF4E4B" : "white";
                  return (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[28px] top-0.5 w-4 h-4 rounded-full ring-4 ring-[var(--surface-1)]" style={{ background: `${color}33` }}>
                        <span className="absolute inset-1 rounded-full" style={{ background: color }} />
                      </span>
                      <p className="text-[12.5px] text-white/85 flex items-center gap-1.5 flex-wrap">
                        {e.fromStatus && e.toStatus && (<><span>{e.fromStatus}</span><ArrowRight size={10} className="text-white/35" /><span>{e.toStatus}</span></>)}
                        {e.fromLocation && e.toLocation && (<><span>{e.fromLocation}</span><ArrowRight size={10} className="text-white/35" /><span>{e.toLocation}</span></>)}
                        {!e.fromStatus && !e.fromLocation && e.notes}
                      </p>
                      <p className="text-[10.5px] text-white/40 mt-0.5">{e.performedBy} · {e.timestamp}</p>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "matches",
      label: "Matches",
      count: r.matchedTo ? 1 : 0,
      content: r.matchedTo ? (
        <div className="rounded-xl border border-[#89CFF0]/30 bg-[#89CFF0]/8 p-4">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles size={12} className="text-[#89CFF0]" />
            <p className="text-[11.5px] text-white/55">Currently matched to</p>
          </div>
          <Link href={`/cases/${(r as any).matchedTo?.caseId ?? "#"}`} className="text-[14px] font-medium text-[#89CFF0] hover:underline inline-flex items-center gap-2">
            <GitBranch size={13} /> {r.matchedTo.personName}
            <span className="font-mono text-[10.5px] text-white/45">{r.matchedTo.caseId}</span>
          </Link>
        </div>
      ) : (
        <EmptyTab label="No active matches. Available for deployment." />
      ),
    },
    {
      key: "files",
      label: "Files",
      content: <EmptyTab label="No files or reports attached." />,
    },
  ];

  const tldr = `${r.status} · ${r.taxonomy}${r.matchedTo ? ` · matched to ${r.matchedTo.personName}` : ""}.`;

  return (
    <CrmShell module="Cases">
      <DetailTopBar backTo="/inventory" backLabel="Resources" />

      <main className="max-w-[960px] mx-auto px-4 md:px-6 py-5 md:py-7 space-y-4">
        <IdentityBand
          avatar={
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: `${statusColor}22`, color: statusColor }}
            >
              <Package size={22} />
            </div>
          }
          pills={<StatusPill tint={statusColor}>{r.status}</StatusPill>}
          title={r.title}
          chips={
            <>
              <MetaChip icon={MapPin}>{r.location}</MetaChip>
              <MetaPopover>
                <MetaChip icon={User}>
                  <Link href={`/directory/person/${(r as any).ownerId ?? "#"}`} className="hover:text-white transition">
                    {r.ownerName}
                  </Link>
                  {r.org && <span className="text-white/40"> · {r.org}</span>}
                </MetaChip>
                <MetaChip icon={Calendar}>{r.capacity}</MetaChip>
                <span className="font-mono text-[10px] text-white/40">{r.id}</span>
                <span className="font-mono text-[10px] text-white/40">{r.taxonomy}</span>
              </MetaPopover>
            </>
          }
          actions={
            <>
              <ActionBtn icon={MessageSquare} label="Contact owner" />
              <OverflowMenu
                actions={[
                  { label: "Share", icon: Share2 },
                  { label: "Flag issue", icon: Flag, danger: true },
                  { label: "Retire resource", icon: XCircle, danger: true },
                ]}
              />
            </>
          }
        />

        <HeroLine
          primary={
            <>
              <span className="font-semibold">{r.capacity}</span>
              <span className="text-white/55"> capacity · </span>
              {r.matchedTo ? (
                <>matched to <span className="font-semibold">{r.matchedTo.personName}</span></>
              ) : (
                <span className="text-white/85">available for deployment</span>
              )}
            </>
          }
          meta={`${r.history.length} events`}
        />

        <AiSummary
          id={r.id}
          tldr={tldr}
          summary={`${r.title} owned by ${r.ownerName}${r.org ? ` (${r.org})` : ""}, currently ${r.status}${r.matchedTo ? ` and matched to ${r.matchedTo.personName} on ${r.matchedTo.caseId}` : ""}. Staged at ${r.location}. Capacity: ${r.capacity}. ${r.history.length} events in deployment history.`}
        />

        <DetailTabs tabs={tabs} defaultKey="activity" />
      </main>
    </CrmShell>
  );
}
