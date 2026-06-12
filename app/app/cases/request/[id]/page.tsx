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
import { UrgencyBadge } from "@/components/crm/pills";
import { MatchChainView, type MatchChainData } from "@/components/match/match-chain-view";
import { api } from "@/lib/api";
import { ChatPanel } from "@/components/chat/chat-panel";
import { useAuthContext } from "@/lib/auth-context";
import {
  Phone, MessageSquare, MapPin, Users, AlertTriangle, Plus,
  CheckCircle2, FileText, Send, Calendar, StickyNote, ChevronRight, X,
  Shield, Sparkles, Inbox, Route as RouteIcon, HandHelping, Truck,
  MoreHorizontal,
} from "lucide-react";

type MatchCandidate = {
  id: string; title: string; blurb: string; score: number; approved: boolean;
  breakdown: { category: number; distance: number; urgency: number; capacity: number; trust: number };
  rationale: string;
};

// Default empty request shape for loading state
const EMPTY_REQUEST = {
  id: "",
  status: "active" as string,
  urgency: "medium" as "critical" | "high" | "medium" | "low",
  taxonomy: [] as string[],
  description: "",
  citizen: { id: "", name: "", phone: "", county: "", household: 1, notes: "" },
  filedAt: "",
  umbrellaId: null as string | null,
  timeline: [] as { t: string; date: string; who: string; actor: string; kind: string; msg: string }[],
};

type RequestShape = typeof EMPTY_REQUEST;

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

function fmtTaxonomy(code: string | null | undefined): string {
  if (!code) return "Request";
  return code.split(".").map((p) => p.charAt(0) + p.slice(1).toLowerCase()).join(" — ");
}

function RequestNotFound() {
  return (
    <CrmShell module="Cases">
      <DetailTopBar backTo="/app/cases" backLabel="Cases" />
      <main className="max-w-[960px] mx-auto px-6 py-7 flex flex-col items-center justify-center gap-4 min-h-[40vh] text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/8 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-white/40" />
        </div>
        <div className="space-y-1">
          <p className="text-white font-medium">Request not found</p>
          <p className="text-white/45 text-sm">This request ID doesn&apos;t exist or you don&apos;t have access to it.</p>
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
      <DetailTopBar backTo="/app/cases" backLabel="Cases" />
      <main className="max-w-[960px] mx-auto px-6 py-7 space-y-5 animate-pulse">
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
        <div className="grid grid-cols-4 gap-px bg-[var(--hairline)] rounded-xl overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[var(--surface-1)] px-4 py-3 space-y-1.5">
              <div className="h-2 w-14 bg-white/10 rounded" />
              <div className="h-6 w-8 bg-white/15 rounded" />
            </div>
          ))}
        </div>
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

export default function RequestView() {
  const params = useParams();
  const id = params.id as string;
  const { orgId, loading: authLoading } = useAuthContext();

  const [requestData, setRequestData] = useState<RequestShape>(EMPTY_REQUEST);
  const [liveMatches, setLiveMatches] = useState<MatchCandidate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [note, setNote] = useState("");
  const [postingNote, setPostingNote] = useState(false);
  const [caseNotes, setCaseNotes] = useState<Array<{ id: string; content: string; created_at: string; author_name: string; note_type: string }>>([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline");

  const fetchRequestDetail = useCallback(() => {
    // Request detail — pass the explicit request_id, no generic resolver.
    return api.crmCasesDetail({ request_id: id })
      .then((raw: any) => {
        if (!raw) return;
        // EF returns { request, person, sos, matches, candidates, ... }
        const req = raw.request || raw;
        const person = raw.person || {};
        const sos = raw.sos || {};
        const data = { ...req, person, sos };
        setRequestData((prev) => ({
          ...prev,
          id: req.id || id,
          status: req.status || "active",
          urgency: req.urgency || req.priority || "medium",
          taxonomy: Array.isArray(req.taxonomy)
            ? req.taxonomy
            : [req.taxonomy_code ?? req.category ?? ""].filter(Boolean),
          description: req.description || req.summary || "",
          filedAt: req.filed_at || req.created_at || "",
          umbrellaId: req.sos_id ?? sos.id ?? null,
          citizen: {
            id: person.id || req.person_id || "",
            name: person.display_name || person.first_name || req.contact_name || req.person_name || "",
            phone: person.phone || req.contact_phone || "",
            county: person.home_region || req.county || "",
            household: req.household_size || 1,
            notes: "",
          },
          timeline:
            data.timeline && Array.isArray(data.timeline)
              ? data.timeline.map((t: any) => ({
                  t: t.time ?? t.t ?? "",
                  date: t.date ?? "",
                  who: t.who ?? t.author ?? "",
                  actor: t.actor ?? t.actor_id ?? "",
                  kind: t.kind ?? t.event_type ?? "note",
                  msg: t.msg ?? t.text ?? t.message ?? "",
                }))
              : prev.timeline,
        }));

        if (Array.isArray(data.matches) && data.matches.length > 0) {
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
      .catch(() => { setNotFound(true); })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (authLoading || !orgId) return;
    fetchRequestDetail();
  }, [fetchRequestDetail, orgId, authLoading]);

  const fetchCaseNotes = useCallback(() => {
    return api.crmGetCaseNotes(id)
      .then((data: any) => {
        if (data?.notes && Array.isArray(data.notes)) setCaseNotes(data.notes);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (authLoading || !orgId) return;
    fetchCaseNotes();
  }, [fetchCaseNotes, orgId, authLoading]);

  const handlePostNote = useCallback(async () => {
    const text = note.trim();
    if (!text) return;
    setPostingNote(true);
    try {
      await api.crmCaseAction("add_note", { request_id: id, author_id: orgId, text });
      setNote("");
      await fetchCaseNotes();
    } catch {
      // leave note in input so user can retry
    } finally {
      setPostingNote(false);
    }
  }, [note, id, orgId, fetchCaseNotes]);

  if (loading) return <LoadingSkeleton />;
  if (notFound) return <RequestNotFound />;

  const daysOpen = requestData.filedAt
    ? Math.max(0, Math.floor((Date.now() - new Date(requestData.filedAt).getTime()) / 86400000))
    : 0;
  const matchCount = (liveMatches ?? []).length;
  const approvedCount = (liveMatches ?? []).filter((m) => m.approved).length;
  const taxonomyLabel = requestData.taxonomy.map((t) => fmtTaxonomy(t)).join(" · ") || "Request";

  return (
    <CrmShell module="Cases">
      <DetailTopBar backTo="/app/cases" backLabel="Cases" />

      <main className="max-w-[1240px] mx-auto px-6 py-7 space-y-5">
        <IdentityBand
          avatar={<Avatar name={requestData.citizen.name} size={56} />}
          eyebrow={<span className="font-mono text-xs uppercase tracking-wider text-white/45">Request · {requestData.id}</span>}
          pills={
            <>
              <UrgencyBadge urgency={requestData.urgency} />
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#89CFF0]/15 text-[#89CFF0]">
                {requestData.status.charAt(0).toUpperCase() + requestData.status.slice(1)}
              </span>
            </>
          }
          title={requestData.citizen.name || taxonomyLabel}
          chips={
            <>
              <MetaChip icon={FileText}>{taxonomyLabel}</MetaChip>
              {requestData.citizen.phone && <MetaChip icon={Phone}>{requestData.citizen.phone}</MetaChip>}
              {requestData.citizen.county && <MetaChip icon={MapPin}>{requestData.citizen.county} County</MetaChip>}
              {requestData.filedAt && <MetaChip icon={Calendar}>Filed {requestData.filedAt}</MetaChip>}
            </>
          }
          actions={
            <>
              <ActionBtn icon={Phone} label="Call" onClick={() => toast.info("Coming soon")} />
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
          <Kpi label="Matches" value={matchCount} />
          <Kpi label="Approved" value={approvedCount} accent={approvedCount > 0 ? "#34D399" : "#F5EBD6"} />
          <Kpi label="Status" value={requestData.status} />
          <Kpi label="Days open" value={daysOpen} />
        </div>

        <DetailLayout
          main={
            <>
              <AiSummary
                id={requestData.id}
                summary={`${taxonomyLabel} request${requestData.citizen.name ? ` for ${requestData.citizen.name}` : ""}${requestData.citizen.county ? ` (${requestData.citizen.county} County)` : ""}${requestData.filedAt ? ` filed ${requestData.filedAt}` : ""}. Status ${requestData.status}, ${matchCount} match${matchCount === 1 ? "" : "es"}${approvedCount > 0 ? `, ${approvedCount} approved` : ""}. ${requestData.description}`}
              />
              <RequestTabs
                requestId={id}
                note={note}
                setNote={setNote}
                requestData={requestData}
                liveMatches={liveMatches}
                onPostNote={handlePostNote}
                postingNote={postingNote}
                orgId={orgId}
                caseNotes={caseNotes}
                onCaseNotesUpdate={setCaseNotes}
                activeTab={activeTab}
                onActiveTabChange={setActiveTab}
                onRefetch={fetchRequestDetail}
              />
            </>
          }
          rail={
            <>
              <ContextCard title="Citizen">
                <ContextRow label="Name" value={requestData.citizen.name || "—"} />
                <ContextRow label="Phone" value={requestData.citizen.phone || "—"} />
                <ContextRow label="County" value={requestData.citizen.county ? `${requestData.citizen.county} County` : "—"} />
                <ContextRow label="Household" value={requestData.citizen.household} />
              </ContextCard>
              <ContextCard title="Request">
                <ContextRow label="ID" value={<span className="font-mono text-[10.5px] text-white/55">{requestData.id || "—"}</span>} />
                <ContextRow label="Taxonomy" value={taxonomyLabel} />
                <ContextRow label="Status" value={<span className="capitalize">{requestData.status}</span>} />
                <ContextRow label="Urgency" value={<span className="capitalize">{requestData.urgency}</span>} />
                <ContextRow label="Filed" value={requestData.filedAt || "—"} />
                {requestData.umbrellaId && (
                  <ContextRow
                    label="Umbrella"
                    value={
                      <Link href={`/app/cases/sos/${requestData.umbrellaId}`} className="font-mono text-[10.5px] text-[#89CFF0] hover:underline">
                        {requestData.umbrellaId}
                      </Link>
                    }
                  />
                )}
              </ContextCard>
              {(requestData.description || caseNotes.length > 0) && (
                <ContextCard title="Notes">
                  {requestData.description && (
                    <p className="text-[12px] text-white/75 leading-snug">{requestData.description}</p>
                  )}
                  {caseNotes.slice(0, 2).map((n, i) => (
                    <div key={n.id ?? i} className={`text-[12px] text-white/65 leading-snug ${requestData.description || i > 0 ? "border-t border-white/6 pt-2 mt-2" : ""}`}>
                      <span className="text-white/40 block text-xs mb-0.5">{n.author_name}</span>
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
        entityType="request"
        entityId={id}
        orgId={orgId ?? ""}
        open={chatOpen}
        onClose={() => setChatOpen(false)}
      />
    </CrmShell>
  );
}

function candidateToChainData(m: MatchCandidate, requestData: RequestShape): MatchChainData {
  return {
    id: m.id,
    title: m.title,
    blurb: m.blurb,
    score: m.score,
    pipelineStatus: m.approved ? "accepted" : "proposed",
    survivor: {
      name: requestData.citizen.name || "Unknown",
      urgency: requestData.urgency,
      householdSize: requestData.citizen.household,
      county: requestData.citizen.county,
      state: "FL",
    },
    rv: {
      year: new Date().getFullYear(),
      make: m.title,
      model: "",
      status: m.approved ? "matched" : "available",
      condition: "good",
      vinLast5: "—",
      sleeps: requestData.citizen.household,
    },
    driver: null,
    breakdown: m.breakdown,
    rationale: m.rationale,
  };
}

function RequestTabs({
  requestId, note, setNote, requestData, liveMatches, onPostNote, postingNote, orgId, caseNotes, onCaseNotesUpdate, activeTab, onActiveTabChange, onRefetch,
}: {
  requestId: string;
  note: string;
  setNote: (v: string) => void;
  requestData: RequestShape;
  liveMatches: MatchCandidate[] | null;
  onPostNote: () => void;
  postingNote: boolean;
  orgId: string;
  caseNotes: Array<{ id: string; content: string; created_at: string; author_name: string; note_type: string }>;
  onCaseNotesUpdate?: (notes: any[]) => void;
  activeTab: string;
  onActiveTabChange: (key: string) => void;
  onRefetch: () => void;
}) {
  const aggMatches = liveMatches ?? [];
  const candidateMatches = aggMatches.filter((m) => !m.approved);
  const noteEvents = requestData.timeline.filter((t) => t.kind === "note");

  const [selectedStatus, setSelectedStatus] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);
  const [closingCase, setClosingCase] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (!newStatus) return;
    setChangingStatus(true);
    try {
      await api.crmCaseAction("transition_status", { request_id: requestId, new_status: newStatus });
      toast.success(`Status → ${newStatus}`);
      setSelectedStatus(newStatus);
      onRefetch();
    } catch {
      toast.error("Failed to change status");
    } finally {
      setChangingStatus(false);
    }
  };

  const handleCloseCase = async () => {
    setClosingCase(true);
    try {
      await api.crmCaseAction("transition_status", { request_id: requestId, new_status: "closed" });
      toast.success("Request closed");
      onRefetch();
    } catch {
      toast.error("Failed to close request");
    } finally {
      setClosingCase(false);
    }
  };

  const selectCls =
    "bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[12px] text-white focus:outline-none focus:border-white/25 appearance-none cursor-pointer disabled:opacity-40";

  const tabs: DetailTab[] = [
    {
      key: "timeline",
      label: "Timeline",
      count: requestData.timeline.length,
      content: (
        <TimelineTab
          note={note}
          setNote={setNote}
          umbrellaData={requestData}
          onPostNote={onPostNote}
          postingNote={postingNote}
        />
      ),
    },
    {
      key: "matches",
      label: "Matches",
      count: aggMatches.length || undefined,
      content: aggMatches.length > 0 ? (
        <div className="space-y-4">
          {aggMatches.map((m) => (
            <MatchChainView key={m.id} match={candidateToChainData(m, requestData)} />
          ))}
        </div>
      ) : (
        <EmptyTab label="No matches yet." />
      ),
    },
    {
      key: "candidates",
      label: "Candidates",
      count: candidateMatches.length || undefined,
      content: candidateMatches.length > 0 ? (
        <div className="space-y-4">
          {candidateMatches.map((m) => (
            <MatchChainView key={m.id} match={candidateToChainData(m, requestData)} />
          ))}
        </div>
      ) : (
        <EmptyTab label="No pending candidates." />
      ),
    },
    {
      key: "notes",
      label: "Notes",
      count: caseNotes.length || noteEvents.length || undefined,
      content: <NotesTimeline caseNotes={caseNotes} noteEvents={noteEvents} requestId={requestId} orgId={orgId} onNotesUpdate={onCaseNotesUpdate} />,
    },
  ];

  return (
    <>
      <DetailTabs tabs={tabs} defaultKey="timeline" activeKey={activeTab} onActiveChange={onActiveTabChange} />
      <DetailSection title="Admin" icon={Shield}>
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
        <AdminItem icon={FileText} label="Generate report" onClick={() => toast.info("Coming soon")} />
        <AdminItem icon={AlertTriangle} label="Flag for review" onClick={() => toast.info("Coming soon")} />
        <button
          onClick={handleCloseCase}
          disabled={closingCase}
          className="w-full flex items-center gap-2.5 h-8 px-2 rounded-md text-[12.5px] font-medium transition text-[#EF4E4B] hover:bg-[#EF4E4B]/10 disabled:opacity-40"
        >
          <CheckCircle2 size={13} strokeWidth={1.85} />
          <span className="flex-1 text-left">{closingCase ? "Closing…" : "Close request"}</span>
          <ChevronRight size={12} className="text-white/30" />
        </button>
      </DetailSection>
    </>
  );
}

function TimelineTab({
  note, setNote, umbrellaData, onPostNote, postingNote,
}: {
  note: string;
  setNote: (v: string) => void;
  umbrellaData: RequestShape;
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
      {events.length === 0 ? (
        <div className="px-4 py-8 text-center text-[13px] text-white/40">No activity yet.</div>
      ) : (
        <ol className="relative">
          {visible.map((t, i, arr) => {
            const meta = KIND_META[t.kind] ?? KIND_META.note;
            const Icon = meta.icon;
            const isLast = i === arr.length - 1 && hidden === 0;
            return (
              <li key={i} className={isLast ? "" : "border-b border-white/[0.04]"}>
                <div className="relative flex gap-3.5 px-4 py-3.5">
                  {!isLast && <span className="absolute left-[27.5px] top-9 bottom-0 w-px bg-white/8" />}
                  <span
                    aria-label={`Status: ${t.kind}`}
                    className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-[var(--surface-1)] shrink-0"
                    style={{ background: `${meta.tint}1a`, color: meta.tint }}
                  >
                    <Icon size={13} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12.5px] font-medium" style={{ color: "var(--cream)" }}>{t.who}</span>
                      <span className="font-mono text-xs text-white/40">{t.date} · {t.t}</span>
                    </div>
                    <p className="text-[13px] text-white/85 mt-1 leading-snug">{t.msg}</p>
                  </div>
                </div>
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
      )}

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
              placeholder="Add a note…"
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
  requestId,
  orgId,
  onNotesUpdate,
}: {
  caseNotes: Array<{ id: string; content: string; created_at: string; author_name: string; note_type: string }>;
  noteEvents: Array<{ t: string; date: string; who: string; kind: string; msg: string }>;
  requestId: string;
  orgId: string;
  onNotesUpdate?: (notes: any[]) => void;
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

  const handleAddNote = async () => {
    const text = newNote.trim();
    if (!text) return;
    try {
      await api.crmCaseAction("add_note", { request_id: requestId, text, author_id: orgId });
      setNewNote("");
      const data = await api.crmGetCaseNotes(requestId);
      if (data?.notes && Array.isArray(data.notes)) onNotesUpdate?.(data.notes);
    } catch (error) {
      console.error("Failed to add note:", error);
    }
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
                    aria-label={`Status: ${item.type}`}
                    className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center ring-4 ring-[var(--surface-1)] shrink-0"
                    style={{ background: `${meta.tint}1a`, color: meta.tint }}
                  >
                    <Icon size={13} strokeWidth={2} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-white/8 text-white/75 font-medium">
                        {item.author}
                      </span>
                      <span className="font-mono text-xs text-white/35">{item.timestamp}</span>
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
      <p className="text-[20px] font-semibold tabular-nums mt-0.5 capitalize" style={{ color: accent ?? "var(--cream)" }}>
        {value}
      </p>
    </div>
  );
}

function AdminItem({ icon: Icon, label, danger, onClick }: { icon: typeof Users; label: string; danger?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
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
