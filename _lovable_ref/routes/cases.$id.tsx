import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CrmShell } from "@/components/crm/CrmShell";
import { AiSummary } from "@/components/crm/AiSummary";
import {
  DetailTopBar, IdentityBand, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
  StatusPill, MetaPopover, OverflowMenu, HeroLine, ActionBtn,
} from "@/components/crm/DetailShell";
import { umbrella, cases, orgs, matches, STATUS_LABEL } from "@/lib/prototype-data";
import {
  Phone, MessageSquare, MapPin, Users, Plus, AlertTriangle,
  Inbox, Route as RouteIcon, FileText,
  HandHelping, Calendar, Truck, StickyNote, ChevronRight,
  Sparkles, X, Send, Flag, XCircle, Share2,
} from "lucide-react";

export const Route = createFileRoute("/cases/$id")({
  head: () => ({ meta: [{ title: `Umbrella — SOS Connect` }] }),
  component: UmbrellaView,
});

const KIND_META: Record<string, { icon: typeof Inbox; tint: string }> = {
  filed:     { icon: Inbox,        tint: "#F5EBD6" },
  routed:    { icon: RouteIcon,    tint: "#89CFF0" },
  accepted:  { icon: HandHelping,  tint: "#89CFF0" },
  scheduled: { icon: Calendar,     tint: "#89CFF0" },
  delivered: { icon: Truck,        tint: "#34D399" },
  note:      { icon: StickyNote,   tint: "rgba(245,235,214,0.6)" },
};

const URGENCY_TINT: Record<string, string> = {
  critical: "#EF4E4B",
  high: "#F5EBD6",
  medium: "#89CFF0",
  low: "rgba(245,235,214,0.55)",
};

function UmbrellaView() {
  const { id } = Route.useParams();
  const isUmbrella = id.startsWith("U-");
  const childCases = isUmbrella ? cases.filter((c) => umbrella.children.includes(c.id)) : cases.filter((c) => c.id === id);
  const orgsInvolved = new Set(childCases.map((c) => c.org)).size;
  const resolvedCount = childCases.filter((c) => c.status === "fulfilled" || c.status === "closed").length;
  const fulfillment = childCases.length ? Math.round((resolvedCount / childCases.length) * 100) : 0;
  const tint = URGENCY_TINT[umbrella.urgency] ?? "#89CFF0";

  const tldr = `Household of ${umbrella.citizen.household} in ${umbrella.citizen.county} · ${umbrella.requests.map((n) => n.tag.split(".")[0].toLowerCase()).join(", ")}${umbrella.requests.find((n) => n.state === "unmet") ? " · 1+ unmet" : ""}.`;

  return (
    <CrmShell module="Cases">
      <DetailTopBar backTo="/cases" backLabel="Cases" />

      <main className="max-w-[960px] mx-auto px-4 md:px-6 py-5 md:py-7 space-y-4">
        <IdentityBand
          avatar={
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[#EF4E4B]/12 text-[#EF4E4B] flex items-center justify-center text-[16px] md:text-[18px] font-semibold">
              {umbrella.citizen.name.split(" ").map((s) => s[0]).join("")}
            </div>
          }
          pills={<StatusPill tint={tint}>{umbrella.urgency} · {umbrella.status}</StatusPill>}
          title={umbrella.citizen.name}
          chips={
            <>
              <MetaChip icon={MapPin}>{umbrella.citizen.county} County</MetaChip>
              <MetaPopover>
                <MetaChip icon={Phone}>{umbrella.citizen.phone}</MetaChip>
                <MetaChip icon={Users}>Household of {umbrella.citizen.household}</MetaChip>
                <MetaChip icon={Calendar}>Filed {umbrella.filedAt}</MetaChip>
                <span className="font-mono text-[10px] text-white/40">Umbrella {umbrella.id}</span>
              </MetaPopover>
            </>
          }
          actions={
            <>
              <ActionBtn icon={Phone} label="Call" />
              <ActionBtn icon={Plus} label="Add request" primary />
              <OverflowMenu
                actions={[
                  { label: "Message citizen", icon: MessageSquare },
                  { label: "Reassign coordinator", icon: Users },
                  { label: "Generate report", icon: FileText },
                  { label: "Share", icon: Share2 },
                  { label: "Flag for review", icon: Flag, danger: true },
                  { label: "Close umbrella", icon: XCircle, danger: true },
                ]}
              />
            </>
          }
        />

        <HeroLine
          primary={
            <>
              <span className="font-semibold tabular-nums">{resolvedCount}</span>
              <span className="text-white/55"> of </span>
              <span className="font-semibold tabular-nums">{childCases.length}</span>
              <span className="text-white/55"> requests fulfilled</span>
            </>
          }
          meta={`${orgsInvolved} ${orgsInvolved === 1 ? "org" : "orgs"} · day 3`}
          progress={fulfillment}
          accent={fulfillment === 100 ? "#34D399" : "#89CFF0"}
        />

        <AiSummary
          id={umbrella.id}
          tldr={tldr}
          summary={`Umbrella case for ${umbrella.citizen.name} (household of ${umbrella.citizen.household}, ${umbrella.citizen.county} County) filed ${umbrella.filedAt}. ${childCases.length} child case${childCases.length === 1 ? "" : "s"} spanning ${umbrella.requests.map((n) => n.tag.split(".")[0].toLowerCase()).join(", ")} across ${orgsInvolved} org${orgsInvolved === 1 ? "" : "s"}. ${fulfillment}% fulfilled${umbrella.requests.find((n) => n.state === "unmet") ? `; ${umbrella.requests.filter((n) => n.state === "unmet").map((n) => n.tag).join(", ")} still unmet` : ""}. ${umbrella.citizen.notes}`}
        />

        <CaseTabs childCases={childCases} />
      </main>
    </CrmShell>
  );
}

function CaseTabs({ childCases }: { childCases: typeof cases }) {
  const allMatchIds = Array.from(new Set(childCases.flatMap(() => Object.keys(matches))));
  const aggMatches = allMatchIds.map((id) => matches[id]).filter(Boolean);
  const activityCount = umbrella.timeline.length;

  const tabs: DetailTab[] = [
    {
      key: "activity",
      label: "Activity",
      count: activityCount,
      content: <ActivityTab childCases={childCases} />,
    },
    {
      key: "requests",
      label: "Requests",
      count: childCases.length,
      content: <RequestsTab childCases={childCases} aggMatches={aggMatches} />,
    },
    {
      key: "files",
      label: "Files",
      content: <EmptyTab label="No resources or reports linked yet." />,
    },
  ];

  return <DetailTabs tabs={tabs} defaultKey="activity" />;
}

function RequestsTab({
  childCases, aggMatches,
}: { childCases: typeof cases; aggMatches: Array<(typeof matches)[string]> }) {
  // Group matches per case (prototype data shares match pool, so just show count)
  const matchCount = aggMatches.length;
  return (
    <ul className="space-y-1">
      {childCases.map((c) => {
        const org = orgs.find((o) => o.id === c.org);
        return (
          <li key={c.id}>
            <Link
              to="/directory/request/$id"
              params={{ id: c.id }}
              className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-md hover:bg-white/5 transition"
            >
              <span className="font-mono text-[10.5px] text-white/45 w-12 shrink-0">{c.id}</span>
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[10.5px] text-white/80 truncate">{c.taxonomy.join(" · ")}</p>
                {org && <p className="text-[11px] truncate text-white/55">{org.name}</p>}
              </div>
              {matchCount > 0 && (
                <span className="inline-flex items-center gap-1 font-mono text-[10px] text-white/55 shrink-0">
                  <Sparkles size={10} className="text-[#89CFF0]" /> {matchCount}
                </span>
              )}
              <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/6 text-white/55 shrink-0">
                {STATUS_LABEL[c.status]}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function ActivityTab({ childCases }: { childCases: typeof cases }) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [note, setNote] = useState("");
  const events = [...umbrella.timeline].reverse();
  const visible = showAll ? events : events.slice(0, 5);
  const hidden = events.length - visible.length;

  return (
    <div className="-m-4">
      {/* Add note — collapsed by default */}
      <div className="px-4 py-2.5 border-b border-[var(--hairline)]">
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
              disabled={!note.trim()}
              onClick={() => { setNote(""); setComposerOpen(false); }}
            >
              <Send size={11} /> Post
            </button>
          </div>
        )}
      </div>

      <ol className="relative">
        {visible.map((t, i, arr) => {
          const meta = KIND_META[t.kind] ?? KIND_META.note;
          const linkedCase = t.caseId ? childCases.find((c) => c.id === t.caseId) : null;
          const Icon = meta.icon;
          const isLast = i === arr.length - 1 && hidden === 0;
          const inner = (
            <div className={`relative flex gap-3 px-4 py-3 transition ${linkedCase ? "hover:bg-white/4 cursor-pointer" : ""}`}>
              {!isLast && <span className="absolute left-[26px] top-8 bottom-0 w-px bg-white/6" />}
              <span
                className="relative z-10 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-[var(--surface-1)] shrink-0"
                style={{ background: `${meta.tint}1a`, color: meta.tint }}
              >
                <Icon size={11} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[12.5px] font-medium text-[var(--cream)]">{t.who}</span>
                  <span
                    className="text-[10.5px] text-white/40"
                    title={`${t.date} · ${t.t}`}
                  >
                    {t.date}
                  </span>
                  {linkedCase && (
                    <span className="font-mono text-[9.5px] tracking-wider text-white/45 inline-flex items-center gap-0.5">
                      {linkedCase.id}
                      <ChevronRight size={9} />
                    </span>
                  )}
                </div>
                <p className="text-[13px] text-white/80 mt-0.5 leading-snug">{t.msg}</p>
              </div>
            </div>
          );
          return (
            <li key={i} className={isLast ? "" : "border-b border-white/[0.04]"}>
              {linkedCase ? (
                <Link to="/directory/request/$id" params={{ id: linkedCase.id }} className="block">
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
    </div>
  );
}
