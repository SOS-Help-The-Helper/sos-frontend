"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { AiSummary } from "@/components/crm/ai-summary";
import {
  DetailTopBar, IdentityBand, DetailSection, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
} from "@/components/crm/detail-shell";
import { umbrella as defaultUmbrella, cases, orgs, matches, STATUS_LABEL, requests as requestDetails, type MatchCandidate } from "@/lib/prototype-data";

type UmbrellaShape = typeof defaultUmbrella;

function resolveView(id: string): UmbrellaShape {
  if (id === defaultUmbrella.id) return defaultUmbrella;
  const c = cases.find((x) => x.id === id || x.umbrella === id);
  if (!c) return defaultUmbrella;

  const siblings = cases.filter((x) => x.citizen === c.citizen && x.county === c.county);
  const req = requestDetails.find((r: any) => r.caseId === c.id);
  const household = (req as any)?.household ?? { adults: 1, children: 0, pets: 0 };
  const householdSize = household.adults + household.children;
  const phone = `(828) 555-0${(100 + (c.id.charCodeAt(2) % 90)).toString()}`;
  const orgName = orgs.find((o) => o.id === c.org)?.name ?? "Org";

  return {
    id: id.startsWith("U-") ? id : `U-${c.id.slice(2)}`,
    status: (c.status === "closed" || c.status === "fulfilled" ? "resolved" : "active") as UmbrellaShape["status"],
    urgency: c.urgency as UmbrellaShape["urgency"],
    citizen: {
      id: c.citizen.toLowerCase().replace(/[^a-z]+/g, "-"),
      name: c.citizen,
      phone,
      county: c.county,
      household: householdSize,
      notes: `Open ${c.taxonomy.join(" + ").toLowerCase()} need in ${c.county} County.`,
    },
    filedAt: c.opened,
    children: siblings.map((s) => s.id),
    requests: siblings.map((s) => ({
      tag: s.taxonomy[0],
      state: (s.status === "in_progress" ? "in_progress" : s.status === "fulfilled" || s.status === "closed" ? "in_progress" : "active") as "active" | "in_progress" | "unmet",
      caseId: s.id as string | null,
    })),
    timeline: [
      { t: c.opened, date: c.opened, who: "System", actor: c.org, kind: "filed" as const, msg: `Request filed — ${c.taxonomy.join(", ")}`, caseId: c.id as string | null },
      { t: c.opened, date: c.opened, who: orgName, actor: c.org, kind: "routed" as const, msg: `Routed to ${orgName}`, caseId: c.id as string | null },
    ],
  } as unknown as UmbrellaShape;
}
import { UrgencyBadge } from "@/components/crm/pills";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import {
  Phone, MessageSquare, MapPin, Users, Plus, AlertTriangle,
  CheckCircle2, FileText, Send, MoreHorizontal, Inbox, Route as RouteIcon,
  HandHelping, Calendar, Truck, StickyNote, ChevronRight, ExternalLink,
  Shield, Sparkles,
} from "lucide-react";

const KIND_META: Record<string, { icon: typeof Inbox; tint: string }> = {
  filed:     { icon: Inbox,        tint: "#F5EBD6" },
  routed:    { icon: RouteIcon,    tint: "#89CFF0" },
  accepted:  { icon: HandHelping,  tint: "#89CFF0" },
  scheduled: { icon: Calendar,     tint: "#89CFF0" },
  delivered: { icon: Truck,        tint: "#34D399" },
  note:      { icon: StickyNote,   tint: "rgba(245,235,214,0.6)" },
};

const NEED_STATE: Record<string, { label: string; fg: string; bg: string }> = {
  active:      { label: "Open",        fg: "#F5EBD6", bg: "rgba(245,235,214,0.12)" },
  in_progress: { label: "In progress", fg: "#89CFF0", bg: "rgba(137,207,240,0.14)" },
  unmet:       { label: "Unmet",       fg: "#EF4E4B", bg: "rgba(239,78,75,0.14)" },
  resolved:    { label: "Resolved",    fg: "#34D399", bg: "rgba(52,211,153,0.14)" },
};

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

  const [umbrellaData, setUmbrellaData] = useState(() => resolveView(id ?? ""));
  const [childCasesData, setChildCasesData] = useState<typeof cases>(() =>
    isUmbrella
      ? cases.filter((c) => resolveView(id ?? "").children.includes(c.id))
      : cases.filter((c) => c.id === id)
  );
  const [liveMatches, setLiveMatches] = useState<MatchCandidate[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [postingNote, setPostingNote] = useState(false);

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

      <main className="max-w-[960px] mx-auto px-6 py-7 space-y-5">
        <IdentityBand
          avatar={
            <div className="w-14 h-14 rounded-2xl bg-[#EF4E4B]/15 text-[#EF4E4B] flex items-center justify-center text-[18px] font-semibold">
              {umbrellaData.citizen.name.split(" ").map((s) => s[0]).join("")}
            </div>
          }
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

        <AiSummary
          id={umbrellaData.id}
          summary={`Umbrella case for ${umbrellaData.citizen.name} (household of ${umbrellaData.citizen.household}, ${umbrellaData.citizen.county} County) filed ${umbrellaData.filedAt}. ${childCasesData.length} child case${childCasesData.length === 1 ? "" : "s"} spanning ${umbrellaData.needs.map((n) => n.tag.split(".")[0].toLowerCase()).join(", ")} across ${orgsInvolved} org${orgsInvolved === 1 ? "" : "s"}. ${fulfillment}% fulfilled${umbrellaData.needs.find((n) => n.state === "unmet") ? `; ${umbrellaData.needs.filter((n) => n.state === "unmet").map((n) => n.tag).join(", ")} still unmet` : ""}. ${umbrellaData.citizen.notes}`}
        />

        <CaseTabs
          note={note}
          setNote={setNote}
          childCases={childCasesData}
          umbrellaData={umbrellaData}
          liveMatches={liveMatches}
          onPostNote={handlePostNote}
          postingNote={postingNote}
          orgId={orgId}
        />
      </main>
    </CrmShell>
  );
}

function CaseTabs({
  note, setNote, childCases, umbrellaData, liveMatches, onPostNote, postingNote, orgId,
}: {
  note: string;
  setNote: (v: string) => void;
  childCases: typeof cases;
  umbrellaData: typeof defaultUmbrella;
  liveMatches: MatchCandidate[] | null;
  onPostNote: () => void;
  postingNote: boolean;
  orgId: string;
}) {
  const allMatchIds = Array.from(new Set(childCases.flatMap(() => Object.keys(matches))));
  const protoMatches = allMatchIds.map((id) => matches[id]).filter(Boolean);
  const aggMatches = liveMatches ?? protoMatches;
  const noteEvents = umbrellaData.timeline.filter((t) => t.kind === "note");

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
                  href={`/directory/request/${c.id}`}
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
      count: aggMatches.length,
      content: (
        <ul className="space-y-2">
          {aggMatches.map((m) => (
            <li key={m.id} className="flex items-center gap-3 p-3 rounded-lg border border-[var(--hairline)]">
              <Sparkles size={14} className="text-[#89CFF0] shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium truncate">{m.title}</p>
                <p className="text-[11px] text-white/55 truncate">{m.blurb}</p>
              </div>
              <span className="font-mono text-[14px] tabular-nums" style={{ color: m.approved ? "#34D399" : "#89CFF0" }}>
                {m.score}
              </span>
            </li>
          ))}
        </ul>
      ),
    },
    {
      key: "notes",
      label: "Notes",
      count: noteEvents.length,
      content: noteEvents.length ? (
        <div className="divide-y divide-[var(--hairline)] -my-2">
          {noteEvents.map((n, i) => (
            <div key={i} className="py-3">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono text-[10px] text-white/45">{n.date} · {n.t} · {n.who}</span>
              </div>
              <p className="text-[13px] text-white/85">{n.msg}</p>
            </div>
          ))}
          <div className="pt-3 mt-3 border-t border-[var(--hairline)]">
            <p className="text-[12.5px] text-white/75 leading-relaxed">{umbrellaData.citizen.notes}</p>
          </div>
        </div>
      ) : (
        <EmptyTab label="No notes yet." />
      ),
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
      <DetailTabs tabs={tabs} defaultKey="timeline" />
      <DetailSection title="Admin" icon={Shield}>
        <AdminItem icon={Users} label="Reassign coordinator" />
        <AdminItem icon={FileText} label="Generate report" />
        <AdminItem icon={AlertTriangle} label="Flag for review" />
        <AdminItem icon={CheckCircle2} label="Close umbrella" danger />
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
  umbrellaData: typeof defaultUmbrella;
  onPostNote: () => void;
  postingNote: boolean;
}) {
  return (
    <div className="-m-4">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--hairline)] bg-white/[0.02]">
        <StickyNote size={14} className="text-white/40 shrink-0" />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note, status update, or @mention an org…"
          className="flex-1 bg-transparent text-[13px] placeholder:text-white/35 focus:outline-none"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && note.trim()) onPostNote(); }}
        />
        <button
          onClick={onPostNote}
          disabled={!note.trim() || postingNote}
          className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-[#89CFF0]/15 hover:bg-[#89CFF0]/25 text-[#89CFF0] text-[12px] font-medium transition disabled:opacity-40"
        >
          <Send size={11} /> {postingNote ? "Posting…" : "Post"}
        </button>
      </div>
      <ol className="relative">
        {[...umbrellaData.timeline].reverse().map((t, i, arr) => {
          const meta = KIND_META[t.kind] ?? KIND_META.note;
          const org = orgs.find((o) => o.id === t.actor);
          const linkedCase = t.caseId ? childCases.find((c) => c.id === t.caseId) : null;
          const Icon = meta.icon;
          const isLast = i === arr.length - 1;
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
                <Link href={`/directory/request/${linkedCase.id}`} className="block">
                  {inner}
                </Link>
              ) : inner}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function ActionBtn({ icon: Icon, label, primary }: { icon: typeof Phone; label: string; primary?: boolean }) {
  return (
    <button
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
