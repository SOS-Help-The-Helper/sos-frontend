"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { AiSummary } from "@/components/crm/ai-summary";
import {
  DetailTopBar, IdentityBand, DetailSection, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
} from "@/components/crm/detail-shell";
import { umbrella, cases, orgs, matches, STATUS_LABEL } from "@/lib/prototype-data";
import { UrgencyBadge } from "@/components/crm/pills";
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

export default function UmbrellaView() {
  const params = useParams();
  const id = params.id as string;
  const isUmbrella = id.startsWith("U-");
  const childCases = isUmbrella ? cases.filter((c) => umbrella.children.includes(c.id)) : cases.filter((c) => c.id === id);
  const [note, setNote] = useState("");
  const orgsInvolved = new Set(childCases.map((c) => c.org)).size;
  const resolvedCount = childCases.filter((c) => c.status === "fulfilled" || c.status === "closed").length;
  const fulfillment = childCases.length ? Math.round((resolvedCount / childCases.length) * 100) : 0;

  return (
    <CrmShell module="Cases">
      <DetailTopBar backTo="/cases" backLabel="Cases" />

      <main className="max-w-[960px] mx-auto px-6 py-7 space-y-5">
        <IdentityBand
          avatar={
            <div className="w-14 h-14 rounded-2xl bg-[#EF4E4B]/15 text-[#EF4E4B] flex items-center justify-center text-[18px] font-semibold">
              {umbrella.citizen.name.split(" ").map((s) => s[0]).join("")}
            </div>
          }
          eyebrow={<span className="font-mono text-[10px] uppercase tracking-wider text-white/45">Umbrella · {umbrella.id}</span>}
          pills={
            <>
              <UrgencyBadge urgency={umbrella.urgency} />
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#89CFF0]/15 text-[#89CFF0]">
                {umbrella.status}
              </span>
            </>
          }
          title={umbrella.citizen.name}
          chips={
            <>
              <MetaChip icon={Phone}>{umbrella.citizen.phone}</MetaChip>
              <MetaChip icon={MapPin}>{umbrella.citizen.county} County</MetaChip>
              <MetaChip icon={Users}>Household of {umbrella.citizen.household}</MetaChip>
              <MetaChip icon={Calendar}>Filed {umbrella.filedAt}</MetaChip>
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
          <Kpi label="Child cases" value={childCases.length} />
          <Kpi label="Orgs involved" value={orgsInvolved} />
          <Kpi label="Fulfilled" value={`${fulfillment}%`} accent={fulfillment === 100 ? "#34D399" : "#F5EBD6"} />
          <Kpi label="Days open" value={3} />
        </div>

        <AiSummary
          id={umbrella.id}
          summary={`Umbrella case for ${umbrella.citizen.name} (household of ${umbrella.citizen.household}, ${umbrella.citizen.county} County) filed ${umbrella.filedAt}. ${childCases.length} child case${childCases.length === 1 ? "" : "s"} spanning ${umbrella.needs.map((n) => n.tag.split(".")[0].toLowerCase()).join(", ")} across ${orgsInvolved} org${orgsInvolved === 1 ? "" : "s"}. ${fulfillment}% fulfilled${umbrella.needs.find((n) => n.state === "unmet") ? `; ${umbrella.needs.filter((n) => n.state === "unmet").map((n) => n.tag).join(", ")} still unmet` : ""}. ${umbrella.citizen.notes}`}
        />

        <CaseTabs note={note} setNote={setNote} childCases={childCases} />
      </main>
    </CrmShell>
  );
}

function CaseTabs({
  note, setNote, childCases,
}: {
  note: string;
  setNote: (v: string) => void;
  childCases: typeof cases;
}) {
  const allMatchIds = Array.from(new Set(childCases.flatMap(() => Object.keys(matches))));
  const aggMatches = allMatchIds.map((id) => matches[id]).filter(Boolean);
  const noteEvents = umbrella.timeline.filter((t) => t.kind === "note");

  const tabs: DetailTab[] = [
    {
      key: "timeline",
      label: "Timeline",
      count: umbrella.timeline.length,
      content: <TimelineTab note={note} setNote={setNote} childCases={childCases} />,
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
            <p className="text-[12.5px] text-white/75 leading-relaxed">{umbrella.citizen.notes}</p>
          </div>
        </div>
      ) : (
        <EmptyTab label="No notes yet." />
      ),
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
  note, setNote, childCases,
}: { note: string; setNote: (v: string) => void; childCases: typeof cases }) {
  return (
    <div className="-m-4">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--hairline)] bg-white/[0.02]">
        <StickyNote size={14} className="text-white/40 shrink-0" />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note, status update, or @mention an org…"
          className="flex-1 bg-transparent text-[13px] placeholder:text-white/35 focus:outline-none"
        />
        <button className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-[#89CFF0]/15 hover:bg-[#89CFF0]/25 text-[#89CFF0] text-[12px] font-medium transition disabled:opacity-40" disabled={!note.trim()}>
          <Send size={11} /> Post
        </button>
      </div>
      <ol className="relative">
        {[...umbrella.timeline].reverse().map((t, i, arr) => {
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
