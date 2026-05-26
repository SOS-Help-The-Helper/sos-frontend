"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import { Avatar } from "@/components/directory/Avatar";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { AiSummary } from "@/components/crm/ai-summary";
import {
  DetailTopBar, IdentityBand, DetailSection, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
  ContextCard, ContextRow, DetailLayout,
} from "@/components/crm/detail-shell";
import { STATUS_LABEL } from "@/lib/display-constants";
type MatchCandidate = {
  id: string; title: string; blurb: string; score: number; approved: boolean;
  breakdown: { category: number; distance: number; urgency: number; capacity: number; trust: number };
  rationale: string;
};

// Default empty umbrella shape for loading state
const EMPTY_UMBRELLA = {
  id: "",
  status: "active" as "active" | "resolved" | "closed",
  urgency: "medium" as "critical" | "high" | "medium" | "low",
  citizen: { id: "", name: "", phone: "", county: "", household: 1, notes: "" },
  filedAt: "",
  children: [] as string[],
  requests: [] as { tag: string; state: "active" | "in_progress" | "unmet" | "resolved"; caseId: string | null }[],
  needs: [] as { tag: string; state: "active" | "in_progress" | "unmet" | "resolved" }[],
  timeline: [] as { t: string; date: string; who: string; actor: string; kind: string; msg: string; caseId: string | null }[],
};

type UmbrellaShape = typeof EMPTY_UMBRELLA;

// placeholder — real data loaded via EF
const cases: any[] = [];
const orgs: any[] = [];
const matches: Record<string, any> = {};
import { UrgencyBadge } from "@/components/crm/pills";
import { MatchChainView, type MatchChainData } from "@/components/match/match-chain-view";
import { api } from "@/lib/api";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useAuthContext } from "@/lib/auth-context";
import {
  Phone, MessageSquare, MapPin, Users, Plus, AlertTriangle,
  CheckCircle2, FileText, Send, MoreHorizontal, Inbox, Route as RouteIcon,
  HandHelping, Calendar, Truck, StickyNote, ChevronRight, ExternalLink,
  Shield, Sparkles, X, Package,
} from "lucide-react";

const KIND_META: Record<string, { icon: typeof Inbox; tint: string }> = {
  filed:     { icon: Inbox,        tint: "#F5EBD6" },
  routed:    { icon: RouteIcon,    tint: "#89CFF0" },
  accepted:  { icon: HandHelping,  tint: "#89CFF0" },
  scheduled: { icon: Calendar,     tint: "#89CFF0" },
  delivered: { icon: Truck,        tint: "#34D399" },
  note:      { icon: StickyNote,   tint: "rgba(245,235,214,0.6)" },
  matched:   { icon: Sparkles,     tint: "#89CFF0" },
  fulfilled: { icon: CheckCircle2, tint: "#34D399" },
};

const NEED_STATE: Record<string, { label: string; fg: string; bg: string }> = {
  active:      { label: "Open",        fg: "#F5EBD6", bg: "rgba(245,235,214,0.12)" },
  in_progress: { label: "In progress", fg: "#89CFF0", bg: "rgba(137,207,240,0.14)" },
  unmet:       { label: "Unmet",       fg: "#EF4E4B", bg: "rgba(239,78,75,0.14)" },
  resolved:    { label: "Resolved",    fg: "#34D399", bg: "rgba(52,211,153,0.14)" },
};

function CaseNotFound() {
  return (
    <CrmShell module="Cases">
      <DetailTopBar backTo="/cases" backLabel="Cases" />
      <main className="max-w-[960px] mx-auto px-6 py-7 flex flex-col items-center justify-center gap-4 min-h-[40vh] text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/8 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-white/40" />
        </div>
        <div className="space-y-1">
          <p className="text-white font-medium">Case not found</p>
          <p className="text-white/45 text-sm">This case ID doesn&apos;t exist or you don&apos;t have access to it.</p>
        </div>
        <Link
          href="/app/cases"
          className="mt-2 px-4 py-2 rounded-lg bg-white/8 hover:bg-white/12 text-sm text-white/70 hover:text-white transition-colors"
        >
          Back to Cases
        </Link>
      </main>
    </CrmShell>
  );
}

function LoadingSkeleton() {
  return (
    <CrmShell module="Cases">
      <DetailTopBar backTo="/cases" backLabel="Cases" />
      <main className="max-w-[960px] mx-auto px-6 py-7 space-y-5 animate-pulse">
        {/* Identity band skeleton */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 shrink-0" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-2.5 w-24 bg-white/10 rounded" />
            <div className="h-5 w-40 bg-white/15 rounded" />
            <div className="flex gap-2 mt-2">
              <div className="h-5 w-24 bg-white/8 rounded-full" />
              <div className="h-5 w-20 bg-white/8 rounded-full" />
            </div>
          </div>
        </div>
        {/* KPI strip skeleton */}
        <div className="grid grid-cols-4 gap-px bg-[var(--hairline)] rounded-xl overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[var(--surface-1)] px-4 py-3 space-y-1.5">
              <div className="h-2 w-14 bg-white/10 rounded" />
              <div className="h-6 w-8 bg-white/15 rounded" />
            </div>
          ))}
        </div>
        {/* Summary skeleton */}
        <div className="rounded-xl bg-white/4 border border-[var(--hairline)] p-4 space-y-2">
          <div className="h-2.5 w-full bg-white/10 rounded" />
          <div className="h-2.5 w-4/5 bg-white/10 rounded" />
          <div className="h-2.5 w-3/5 bg-white/10 rounded" />
        </div>
        {/* Tabs skeleton */}
        <div className="rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4 space-y-3">
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-3 w-16 bg-white/10 rounded" />
            ))}
          </div>
          <div className="h-px bg-[var(--hairline)]" />
          <div className="space-y-3 pt-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-white/8 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-2.5 w-32 bg-white/10 rounded" />
                  <div className="h-2.5 w-48 bg-white/8 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </CrmShell>
  );
}

export default function UmbrellaView() {
  const params = useParams();
  const id = params.id as string;
  const isUmbrella = id.startsWith("U-");
  const { orgId } = useAuthContext();

  const [umbrellaData, setUmbrellaData] = useState<UmbrellaShape>(EMPTY_UMBRELLA);
  const [childCasesData, setChildCasesData] = useState<any[]>([]);
  const [liveMatches, setLiveMatches] = useState<MatchCandidate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [note, setNote] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [caseNotes, setCaseNotes] = useState<Array<{ id: string; content: string; created_at: string; author_name: string; note_type: string }>>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline");

  useEffect(() => {
    const efParams = isUmbrella ? { person_id: id } : { request_id: id };
    api.crmCasesDetail(efParams)
      .then((data: any) => {
        if (!data) return;
        // Map timeline events if present
        if (data.timeline && Array.isArray(data.timeline) && data.timeline.length > 0) {
          setUmbrellaData((prev) => ({
            ...prev,
            timeline: data.timeline.map((t: any) => ({
              t: t.time ?? t.t ?? "",
              date: t.date ?? "",
              who: t.who ?? t.author ?? "",
              actor: t.actor ?? t.actor_id ?? "",
              kind: t.kind ?? t.event_type ?? "note",
              msg: t.msg ?? t.text ?? t.message ?? "",
              caseId: t.case_id ?? t.caseId ?? null,
            })),
          }));
        }
        // Map requests/child cases if present
        if (data.requests && Array.isArray(data.requests) && data.requests.length > 0) {
          const mapped = data.requests.map((r: any) => ({
            id: r.id,
            citizen: r.citizen ?? r.person_name ?? "",
            county: r.county ?? "",
            taxonomy: Array.isArray(r.taxonomy) ? r.taxonomy : [r.taxonomy_code ?? r.category ?? ""],
            status: r.status ?? "active",
            urgency: r.urgency ?? "medium",
            org: r.org_id ?? r.org ?? "",
            opened: r.opened ?? r.created_at ?? "",
            daysOpen: r.days_open ?? 0,
            umbrella: r.umbrella_id ?? null,
            assignedTo: r.assigned_to ?? null,
            matchCount: r.match_count ?? 0,
          }));
          setChildCasesData(mapped as typeof cases);
        }
        // Map matches if present
        if (data.matches && Array.isArray(data.matches) && data.matches.length > 0) {
          setLiveMatches(
            data.matches.map((m: any): MatchCandidate => ({
              id: m.id ?? m.match_id,
              title: m.title ?? m.resource_name ?? m.id,
              blurb: m.blurb ?? m.description ?? "",
              score: m.score ?? 0,
              breakdown: m.breakdown ?? { category: 0, distance: 0, urgency: 0, capacity: 0, trust: 0 },
              approved: m.approved ?? false,
              rationale: m.rationale ?? "",
            }))
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id, isUmbrella]);

  useEffect(() => {
    api.crmGetCaseNotes(id)
      .then((data: any) => {
        if (data?.notes && Array.isArray(data.notes)) setCaseNotes(data.notes);
      })
      .catch(() => {});
  }, [id]);

  const handlePostNote = useCallback(async () => {
    const text = note.trim();
    if (!text) return;
    setPostingNote(true);
    try {
      const requestId = isUmbrella ? (childCasesData[0]?.id ?? id) : id;
      await api.crmCaseAction("add_note", {
        request_id: requestId,
        author_id: orgId,
        text,
      });
      setNote("");
    } catch {
      // fall through — note stays in input so user can retry
    } finally {
      setPostingNote(false);
    }
  }, [note, id, isUmbrella, childCasesData, orgId]);

  if (loading) return <LoadingSkeleton />;

  const orgsInvolved = new Set(childCasesData.map((c) => c.org)).size;
  const resolvedCount = childCasesData.filter((c) => c.status === "fulfilled" || c.status === "closed").length;
  const fulfillment = childCasesData.length ? Math.round((resolvedCount / childCasesData.length) * 100) : 0;

  return (
    <CrmShell module="Cases">
      <DetailTopBar backTo="/cases" backLabel="Cases" />

      <main className="max-w-[1240px] mx-auto px-6 py-7 space-y-5">
        <IdentityBand
          avatar={<Avatar name={umbrellaData.citizen.name} size={56} />}
          eyebrow={<span className="font-mono text-[10px] uppercase tracking-wider text-white/45">Umbrella · {umbrellaData.id}</span>}
          pills={
            <>
              <UrgencyBadge urgency={umbrellaData.urgency} />
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#89CFF0]/15 text-[#89CFF0]">
                {umbrellaData.status}
              </span>
            </>
          }
          title={umbrellaData.citizen.name}
          chips={
            <>
              <MetaChip icon={Phone}>{umbrellaData.citizen.phone}</MetaChip>
              <MetaChip icon={MapPin}>{umbrellaData.citizen.county} County</MetaChip>
              <MetaChip icon={Users}>Household of {umbrellaData.citizen.household}</MetaChip>
              <MetaChip icon={Calendar}>Filed {umbrellaData.filedAt}</MetaChip>
            </>
          }
          actions={
            <>
              <ActionBtn icon={Phone} label="Call" />
              <ActionBtn icon={MessageSquare} label="Message" />
              <ActionBtn icon={Plus} label="Add need" primary />
              <ActionBtn icon={Sparkles} label="Find matches" onClick={() => setActiveTab("matches")} />
              <button
                onClick={() => setChatOpen(true)}
                className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-white/6 hover:bg-white/10 text-white/85 text-[12px] font-medium transition"
                aria-label="Open chat"
              >
                <MessageSquare size={12} strokeWidth={2} />
                Chat
              </button>
              <button className="w-8 h-8 rounded-md hover:bg-white/8 text-white/55 hover:text-white flex items-center justify-center transition">
                <MoreHorizontal size={14} />
              </button>
            </>
          }
        />

        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-px bg-[var(--hairline)] rounded-xl overflow-hidden">
          <Kpi label="Child cases" value={childCasesData.length} />
          <Kpi label="Orgs involved" value={orgsInvolved} />
          <Kpi label="Fulfilled" value={`${fulfillment}%`} accent={fulfillment === 100 ? "#34D399" : "#F5EBD6"} />
          <Kpi label="Days open" value={3} />
        </div>

        <DetailLayout
          main={
            <>
              <AiSummary
                id={umbrellaData.id}
                summary={`Umbrella case for ${umbrellaData.citizen.name} (household of ${umbrellaData.citizen.household}, ${umbrellaData.citizen.county} County) filed ${umbrellaData.filedAt}. ${childCasesData.length} child case${childCasesData.length === 1 ? "" : "s"} spanning ${umbrellaData.needs.map((n) => n.tag.split(".")[0].toLowerCase()).join(", ")} across ${orgsInvolved} org${orgsInvolved === 1 ? "" : "s"}. ${fulfillment}% fulfilled${umbrellaData.needs.find((n) => n.state === "unmet") ? `; ${umbrellaData.needs.filter((n) => n.state === "unmet").map((n) => n.tag).join(", ")} still unmet` : ""}. ${umbrellaData.citizen.notes}`}
              />
              <CaseTabs
                sosId={id}
                note={note}
                setNote={setNote}
                childCases={childCasesData}
                umbrellaData={umbrellaData}
                liveMatches={liveMatches}
                onPostNote={handlePostNote}
                postingNote={postingNote}
                orgId={orgId}
                caseNotes={caseNotes}
                activeTab={activeTab}
                onActiveTabChange={setActiveTab}
              />
            </>
          }
          rail={
            <>
              <ContextCard title="Citizen">
                <ContextRow label="Name" value={umbrellaData.citizen.name || "—"} />
                <ContextRow label="Phone" value={umbrellaData.citizen.phone || "—"} />
                <ContextRow label="County" value={umbrellaData.citizen.county ? `${umbrellaData.citizen.county} County` : "—"} />
                <ContextRow label="Household" value={umbrellaData.citizen.household} />
              </ContextCard>
              <ContextCard title="Case">
                <ContextRow label="ID" value={<span className="font-mono text-[10.5px] text-white/55">{umbrellaData.id || "—"}</span>} />
                <ContextRow label="Status" value={<span className="capitalize">{umbrellaData.status}</span>} />
                <ContextRow label="Urgency" value={<span className="capitalize">{umbrellaData.urgency}</span>} />
                <ContextRow label="Filed" value={umbrellaData.filedAt || "—"} />
                <ContextRow label="Requests" value={childCasesData.length} />
              </ContextCard>
              {(umbrellaData.citizen.notes || caseNotes.length > 0) && (
                <ContextCard title="Notes">
                  {umbrellaData.citizen.notes && (
                    <p className="text-[12px] text-white/75 leading-snug">{umbrellaData.citizen.notes}</p>
                  )}
                  {caseNotes.slice(0, 2).map((n, i) => (
                    <div key={n.id ?? i} className={`text-[12px] text-white/65 leading-snug ${umbrellaData.citizen.notes || i > 0 ? "border-t border-white/6 pt-2 mt-2" : ""}`}>
                      <span className="text-white/40 block text-[10px] mb-0.5">{n.author_name}</span>
                      {n.content}
                    </div>
                  ))}
                </ContextCard>
              )}
            </>
          }
        />
      </main>

      <ChatPanel
        entityType="sos"
        entityId={id}
        orgId={orgId ?? ""}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </CrmShell>
  );
}

function candidateToChainData(m: MatchCandidate, umbrellaData: UmbrellaShape): MatchChainData {
  return {
    id: m.id,
    title: m.title,
    blurb: m.blurb,
    score: m.score,
    pipelineStatus: m.approved ? "accepted" : "proposed",
    survivor: {
      name: umbrellaData.citizen.name || "Unknown",
      urgency: umbrellaData.urgency,
      householdSize: umbrellaData.citizen.household,
      county: umbrellaData.citizen.county,
      state: "FL",
    },
    rv: {
      year: new Date().getFullYear(),
      make: m.title,
      model: "",
      status: m.approved ? "matched" : "available",
      condition: "good",
      vinLast5: "—",
      sleeps: umbrellaData.citizen.household,
    },
    driver: null,
    breakdown: m.breakdown,
    rationale: m.rationale,
  };
}

function CaseTabs({
  sosId, note, setNote, childCases, umbrellaData, liveMatches, onPostNote, postingNote, orgId, caseNotes, activeTab, onActiveTabChange,
}: {
  sosId: string;
  note: string;
  setNote: (v: string) => void;
  childCases: typeof cases;
  umbrellaData: UmbrellaShape;
  liveMatches: MatchCandidate[] | null;
  onPostNote: () => void;
  postingNote: boolean;
  orgId: string;
  caseNotes: Array<{ id: string; content: string; created_at: string; author_name: string; note_type: string }>;
  activeTab: string;
  onActiveTabChange: (key: string) => void;
}) {
  const allMatchIds = Array.from(new Set(childCases.flatMap(() => Object.keys(matches))));
  const protoMatches = allMatchIds.map((id) => matches[id]).filter(Boolean);
  const aggMatches = liveMatches ?? protoMatches;
  const noteEvents = umbrellaData.timeline.filter((t) => t.kind === "note");

  // Admin action state
  const [availableOrgs, setAvailableOrgs] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOrg, setSelectedOrg] = useState("");
  const [assigningOrg, setAssigningOrg] = useState(false);
  const [closingCase, setClosingCase] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);
  const firstRequestId = childCases[0]?.id ?? sosId;

  useEffect(() => {
    api.crmBrowseOrgs({ limit: 50 })
      .then((data: any) => {
        const items: any[] = data?.orgs ?? data?.organizations ?? (Array.isArray(data) ? data : []);
        setAvailableOrgs(items.map((o: any) => ({ id: o.id, name: o.name ?? o.slug ?? o.id })));
      })
      .catch(() => {});
  }, []);

  const handleCloseCase = async () => {
    setClosingCase(true);
    try {
      await api.crmCaseAction("close_case", { sos_id: sosId });
      toast.success("Case closed");
    } catch {
      toast.error("Failed to close case");
    } finally {
      setClosingCase(false);
    }
  };

  const handleAssignOrg = async (orgId: string) => {
    if (!orgId) return;
    setAssigningOrg(true);
    try {
      await api.crmCaseAction("assign_case", { sos_id: sosId, org_id: orgId });
      const orgName = availableOrgs.find((o) => o.id === orgId)?.name ?? orgId;
      toast.success(`Assigned to ${orgName}`);
      setSelectedOrg(orgId);
    } catch {
      toast.error("Failed to assign org");
    } finally {
      setAssigningOrg(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!newStatus) return;
    setChangingStatus(true);
    try {
      await api.crmCaseAction("transition_status", { request_id: firstRequestId, new_status: newStatus });
      toast.success(`Status → ${newStatus}`);
      setSelectedStatus(newStatus);
    } catch {
      toast.error("Failed to change status");
    } finally {
      setChangingStatus(false);
    }
  };

  const selectCls =
    "bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[12px] text-white focus:outline-none focus:border-white/25 appearance-none cursor-pointer disabled:opacity-40";

  const tabs: DetailTab[] = [
    {
      key: "timeline",
      label: "Timeline",
      count: umbrellaData.timeline.length,
      content: (
        <TimelineTab
          note={note}
          setNote={setNote}
          childCases={childCases}
          umbrellaData={umbrellaData}
          onPostNote={onPostNote}
          postingNote={postingNote}
        />
      ),
    },
    {
      key: "requests",
      label: "Requests",
      count: childCases.length,
      content: (
        <ul className="space-y-1">
          {childCases.map((c) => {
            const org = orgs.find((o) => o.id === c.org);
            return (
              <li key={c.id}>
                <Link
                  href={`/app/directory/request/${c.id}`}
                  className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-md hover:bg-white/5 transition"
                >
                  <span className="font-mono text-[10.5px] text-white/45 w-12 shrink-0">{c.id}</span>
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10.5px] text-white/80 truncate">{c.taxonomy.join(" · ")}</p>
                    {org && <p className="text-[11px] truncate" style={{ color: org.color }}>{org.name}</p>}
                  </div>
                  <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/8 text-white/65 shrink-0">
                    {STATUS_LABEL[c.status]}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ),
    },
    {
      key: "resources",
      label: "Resources",
      content: <EmptyTab label="No resources matched yet." />,
    },
    {
      key: "matches",
      label: "Matches",
      count: aggMatches.length || undefined,
      content: aggMatches.length > 0 ? (
        <div className="space-y-4">
          {aggMatches.map((m) => (
            <MatchChainView key={m.id} match={candidateToChainData(m, umbrellaData)} />
          ))}
        </div>
      ) : (
        <EmptyTab label="No matches yet." />
      ),
    },
    {
      key: "notes",
      label: "Notes",
      count: caseNotes.length || noteEvents.length || undefined,
      content: <NotesTimeline caseNotes={caseNotes} noteEvents={noteEvents} />,
    },
    {
      key: "comms",
      label: "Communication",
      content: <CommunicationTab umbrellaId={umbrellaData.id} orgId={orgId} />,
    },
    {
      key: "reports",
      label: "Reports",
      content: <EmptyTab label="No reports linked to this case." />,
    },
  ];

  return (
    <>
      <DetailTabs tabs={tabs} defaultKey="timeline" activeKey={activeTab} onActiveChange={onActiveTabChange} />
      <DetailSection title="Admin" icon={Shield}>
        {/* Assign to org */}
        <div className="flex items-center gap-2.5 h-8 px-2">
          <Users size={13} strokeWidth={1.85} className="text-white/55 shrink-0" />
          <span className="flex-1 text-left text-[12.5px] font-medium text-white/75">Assign to org</span>
          <select
            className={selectCls}
            value={selectedOrg}
            disabled={assigningOrg || availableOrgs.length === 0}
            onChange={(e) => handleAssignOrg(e.target.value)}
          >
            <option value="">Select org…</option>
            {availableOrgs.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        {/* Change status */}
        <div className="flex items-center gap-2.5 h-8 px-2">
          <RouteIcon size={13} strokeWidth={1.85} className="text-white/55 shrink-0" />
          <span className="flex-1 text-left text-[12.5px] font-medium text-white/75">Change status</span>
          <select
            className={selectCls}
            value={selectedStatus}
            disabled={changingStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="">Select status…</option>
            <option value="active">Active</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <AdminItem icon={FileText} label="Generate report" />
        <AdminItem icon={AlertTriangle} label="Flag for review" />
        {/* Close case */}
        <button
          onClick={handleCloseCase}
          disabled={closingCase}
          className="w-full flex items-center gap-2.5 h-8 px-2 rounded-md text-[12.5px] font-medium transition text-[#EF4E4B] hover:bg-[#EF4E4B]/10 disabled:opacity-40"
        >
          <CheckCircle2 size={13} strokeWidth={1.85} />
          <span className="flex-1 text-left">{closingCase ? "Closing…" : "Close case"}</span>
          <ChevronRight size={12} className="text-white/30" />
        </button>
      </DetailSection>
    </>
  );
}

function TimelineTab({
  note, setNote, childCases, umbrellaData, onPostNote, postingNote,
}: {
  note: string;
  setNote: (v: string) => void;
  childCases: typeof cases;
  umbrellaData: UmbrellaShape;
  onPostNote: () => void;
  postingNote: boolean;
}) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const events = [...umbrellaData.timeline].reverse();
  const visible = showAll ? events : events.slice(0, 5);
  const hidden = events.length - visible.length;

  return (
    <div className="-m-4">
      <ol className="relative">
        {visible.map((t, i, arr) => {
          const meta = KIND_META[t.kind] ?? KIND_META.note;
          const org = orgs.find((o: any) => o.id === t.actor);
          const linkedCase = t.caseId ? childCases.find((c: any) => c.id === t.caseId) : null;
          const Icon = meta.icon;
          const isLast = i === arr.length - 1 && hidden === 0;
          const inner = (
            <div className={`relative flex gap-3.5 px-4 py-3.5 transition ${linkedCase ? "hover:bg-white/4 cursor-pointer" : ""}`}>
              {!isLast && <span className="absolute left-[27.5px] top-9 bottom-0 w-px bg-white/8" />}
              <span
                className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-[var(--surface-1)] shrink-0"
                style={{ background: `${meta.tint}1a`, color: meta.tint }}
              >
                <Icon size={13} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12.5px] font-medium" style={{ color: org?.color ?? "var(--cream)" }}>
                    {t.who}
                  </span>
                  <span className="font-mono text-[10px] text-white/40">{t.date} · {t.t}</span>
                  {linkedCase && (
                    <span className="font-mono text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/8 text-white/65 inline-flex items-center gap-1">
                      {linkedCase.id}
                      <ChevronRight size={9} />
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-white/85 mt-1 leading-snug">{t.msg}</p>
              </div>
              {linkedCase && <ExternalLink size={12} className="text-white/30 mt-1 shrink-0" />}
            </div>
          );
          return (
            <li key={i} className={isLast ? "" : "border-b border-white/[0.04]"}>
              {linkedCase ? (
                <Link href={`/app/directory/request/${linkedCase.id}`} className="block">
                  {inner}
                </Link>
              ) : inner}
            </li>
          );
        })}
        {hidden > 0 && (
          <li className="border-t border-[var(--hairline)]">
            <button
              onClick={() => setShowAll(true)}
              className="w-full px-4 py-3 text-[12px] text-white/55 hover:text-white hover:bg-white/[0.03] transition text-left"
            >
              Show {hidden} earlier {hidden === 1 ? "event" : "events"}
            </button>
          </li>
        )}
      </ol>

      {/* Add note — at the bottom, collapsed by default */}
      <div className="px-4 py-2.5 border-t border-[var(--hairline)]">
        {!composerOpen ? (
          <button
            onClick={() => setComposerOpen(true)}
            className="inline-flex items-center gap-1.5 text-[12.5px] text-white/55 hover:text-white/85 transition"
          >
            <Plus size={12} /> Add note
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <StickyNote size={14} className="text-white/40 shrink-0" />
            <input
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note or @mention an org…"
              className="flex-1 bg-transparent text-[13px] placeholder:text-white/35 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && note.trim()) {
                  onPostNote();
                  setComposerOpen(false);
                }
              }}
            />
            <button
              onClick={() => { setNote(""); setComposerOpen(false); }}
              className="w-7 h-7 rounded-md hover:bg-white/6 text-white/45 flex items-center justify-center"
              aria-label="Cancel"
            >
              <X size={12} />
            </button>
            <button
              className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-[#89CFF0]/15 hover:bg-[#89CFF0]/25 text-[#89CFF0] text-[12px] font-medium transition disabled:opacity-40"
              disabled={!note.trim() || postingNote}
              onClick={() => { onPostNote(); setComposerOpen(false); }}
            >
              <Send size={11} /> {postingNote ? "Posting…" : "Post"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const NOTE_TYPE_META: Record<string, { icon: typeof StickyNote; tint: string }> = {
  note:   { icon: StickyNote, tint: "rgba(245,235,214,0.6)" },
  filed:  { icon: Inbox,      tint: "#F5EBD6" },
  routed: { icon: RouteIcon,  tint: "#89CFF0" },
};

function NotesTimeline({
  caseNotes,
  noteEvents,
}: {
  caseNotes: Array<{ id: string; content: string; created_at: string; author_name: string; note_type: string }>;
  noteEvents: Array<{ t: string; date: string; who: string; kind: string; msg: string }>;
}) {
  const [newNote, setNewNote] = useState("");

  const items = caseNotes.length > 0
    ? caseNotes.map((n) => ({
        id: n.id,
        type: n.note_type || "note",
        author: n.author_name,
        timestamp: n.created_at,
        content: n.content,
      }))
    : noteEvents.map((n, i) => ({
        id: String(i),
        type: n.kind || "note",
        author: n.who,
        timestamp: `${n.date} · ${n.t}`,
        content: n.msg,
      }));

  const handleAddNote = () => {
    const text = newNote.trim();
    if (!text) return;
    console.log("add note:", text);
    setNewNote("");
  };

  return (
    <div className="-m-4">
      {items.length === 0 ? (
        <div className="px-4 py-8 text-center text-[13px] text-white/40">No notes yet.</div>
      ) : (
        <ol className="relative">
          {items.map((item, i) => {
            const meta = NOTE_TYPE_META[item.type] ?? NOTE_TYPE_META.note;
            const Icon = meta.icon;
            const isLast = i === items.length - 1;
            return (
              <li key={item.id ?? i} className={isLast ? "" : "border-b border-white/[0.04]"}>
                <div className="relative flex gap-3.5 px-4 py-3.5">
                  {!isLast && <span className="absolute left-[27.5px] top-9 bottom-0 w-px bg-white/8" />}
                  <span
                    className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-[var(--surface-1)] shrink-0"
                    style={{ background: `${meta.tint}1a`, color: meta.tint }}
                  >
                    <Icon size={13} strokeWidth={2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-white/8 text-white/75 font-medium">
                        {item.author}
                      </span>
                      <span className="font-mono text-[10px] text-white/35">{item.timestamp}</span>
                      {item.type !== "note" && (
                        <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/6 text-white/45">
                          {item.type}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-white/85 mt-1 leading-snug">{item.content}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      {/* Add note composer */}
      <div className="px-4 py-2.5 border-t border-[var(--hairline)]">
        <div className="flex items-center gap-2">
          <StickyNote size={14} className="text-white/40 shrink-0" />
          <input
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note…"
            className="flex-1 bg-transparent text-[13px] placeholder:text-white/35 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && newNote.trim()) handleAddNote();
            }}
          />
          <button
            className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-[#89CFF0]/15 hover:bg-[#89CFF0]/25 text-[#89CFF0] text-[12px] font-medium transition disabled:opacity-40"
            disabled={!newNote.trim()}
            onClick={handleAddNote}
          >
            <Send size={11} /> Add
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, primary, onClick }: { icon: typeof Phone; label: string; primary?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-[12px] font-medium transition ${
        primary
          ? "bg-[#EF4E4B] hover:bg-[#d94340] text-white"
          : "bg-white/6 hover:bg-white/10 text-white/85"
      }`}
    >
      <Icon size={12} strokeWidth={2} />
      {label}
    </button>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="bg-[var(--surface-1)] px-4 py-3">
      <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/45">{label}</p>
      <p className="text-[20px] font-semibold tabular-nums mt-0.5" style={{ color: accent ?? "var(--cream)" }}>
        {value}
      </p>
    </div>
  );
}

function AdminItem({ icon: Icon, label, danger }: { icon: typeof Users; label: string; danger?: boolean }) {
  return (
    <button
      className={`w-full flex items-center gap-2.5 h-8 px-2 rounded-md text-[12.5px] font-medium transition ${
        danger ? "text-[#EF4E4B] hover:bg-[#EF4E4B]/10" : "text-white/75 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon size={13} strokeWidth={1.85} />
      <span className="flex-1 text-left">{label}</span>
      <ChevronRight size={12} className="text-white/30" />
    </button>
  );
}

function CommunicationTab({ umbrellaId, orgId }: { umbrellaId: string; orgId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchMessages = useCallback(async () => {
    try {
      const data = await api.crmGetCaseNotes(umbrellaId);
      if (Array.isArray(data)) setMessages(data);
      else if (data && Array.isArray((data as any).notes)) setMessages((data as any).notes);
    } catch {
      // leave messages empty on error
    } finally {
      setLoading(false);
    }
  }, [umbrellaId]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  const handleSend = async () => {
    const text = newMessage.trim();
    if (!text) return;
    try {
      await api.crmCaseAction("add_case_note", { sos_id: umbrellaId, note_text: text, org_id: orgId });
      setNewMessage("");
      await fetchMessages();
    } catch {
      // leave input populated so user can retry
    }
  };

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/5 rounded-lg p-3 space-y-1.5 border border-white/10">
            <div className="h-2 w-24 bg-white/10 rounded" />
            <div className="h-2.5 w-3/4 bg-white/8 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="space-y-2">
        {messages.length === 0 ? (
          <p className="text-[13px] text-white/40 py-4 text-center">No messages yet.</p>
        ) : (
          messages.map((m: any, i: number) => {
            const isSystem = m.note_type === "system";
            return (
              <div
                key={m.id ?? i}
                className="bg-white/5 rounded-lg p-3 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-medium text-white/70">{m.org_name ?? m.author ?? "Unknown"}</span>
                  <span className="font-mono text-[10px] text-white/35">{m.created_at ?? m.timestamp ?? ""}</span>
                </div>
                <p className={`text-[13px] leading-snug ${isSystem ? "italic text-white/45" : "text-white/85"}`}>
                  {m.note_text ?? m.text ?? m.message ?? ""}
                </p>
              </div>
            );
          })
        )}
      </div>

      <div className="flex items-end gap-2 pt-1">
        <textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Write a message…"
          rows={2}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[13px] placeholder:text-white/35 focus:outline-none focus:border-white/20 resize-none"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && newMessage.trim()) { e.preventDefault(); handleSend(); } }}
        />
        <button
          onClick={handleSend}
          disabled={!newMessage.trim()}
          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#89CFF0]/15 hover:bg-[#89CFF0]/25 text-[#89CFF0] text-[12px] font-medium transition disabled:opacity-40 shrink-0"
        >
          <Send size={12} /> Send
        </button>
      </div>
    </div>
  );
}
