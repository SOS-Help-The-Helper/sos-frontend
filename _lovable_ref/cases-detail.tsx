import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CrmShell } from "@/components/crm/CrmShell";
import {
  DetailTopBar, IdentityBand, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
  StatusPill, MetaPopover, OverflowMenu, ActionBtn,
  HeroBlock, DetailLayout, ContextCard, ContextRow,
} from "@/components/crm/DetailShell";
import { defaultCase, cases, orgs, matches, STATUS_LABEL, requests as requestDetails, availableResources } from "@/lib/prototype-data";
import {
  Phone, MessageSquare, MapPin, Users, Plus, AlertTriangle,
  Inbox, Route as RouteIcon, FileText,
  HandHelping, Calendar, Truck, StickyNote, ChevronRight,
  Sparkles, X, Send, Flag, XCircle, Share2, Package,
} from "lucide-react";

type MatchSearch = { matched?: string; matchedOrg?: string };

export const Route = createFileRoute("/cases/$id")({
  head: () => ({ meta: [{ title: `Case — SOS Connect` }] }),
  validateSearch: (s: Record<string, unknown>): MatchSearch => ({
    matched: typeof s.matched === "string" ? s.matched : undefined,
    matchedOrg: typeof s.matchedOrg === "string" ? s.matchedOrg : undefined,
  }),
  component: CaseDetailView,
});

const KIND_META: Record<string, { icon: typeof Inbox; tint: string }> = {
  filed:     { icon: Inbox,        tint: "#89CFF0" },
  routed:    { icon: RouteIcon,    tint: "#89CFF0" },
  accepted:  { icon: HandHelping,  tint: "#89CFF0" },
  scheduled: { icon: Calendar,     tint: "#89CFF0" },
  delivered: { icon: Truck,        tint: "#34D399" },
  note:      { icon: StickyNote,   tint: "rgba(245,235,214,0.6)" },
};

const URGENCY_TINT: Record<string, string> = {
  critical: "#EF4E4B",
  high: "#EF4E4B",
  medium: "#89CFF0",
  low: "rgba(74,84,98,0.55)",
};

type CaseDetailShape = typeof defaultCase;

function resolveView(id: string): CaseDetailShape {
  if (id === defaultCase.id) return defaultCase;
  const c = cases.find((x) => x.id === id || x.parentCaseId === id);
  if (!c) return defaultCase;

  const siblings = cases.filter((x) => x.citizen === c.citizen && x.county === c.county);
  const req = requestDetails.find((r) => r.caseId === c.id);
  const household = req?.household ?? { adults: 1, children: 0, pets: 0 };
  const householdSize = household.adults + household.children;
  const phone = `(828) 555-0${(100 + (c.id.charCodeAt(2) % 90)).toString()}`;
  const orgName = orgs.find((o) => o.id === c.org)?.name ?? "Org";

  return {
    id: id.startsWith("U-") ? id : `U-${c.id.slice(2)}`,
    status: (c.status === "closed" || c.status === "fulfilled" ? "resolved" : "active") as CaseDetailShape["status"],
    urgency: c.urgency as CaseDetailShape["urgency"],
    citizen: {
      id: c.citizen.toLowerCase().replace(/[^a-z]+/g, "-"),
      name: c.citizen,
      phone,
      county: c.county,
      household: householdSize,
      notes: req?.notes?.[req.notes.length - 1]?.msg ?? `Open ${c.taxonomy.join(" + ").toLowerCase()} need in ${c.county} County.`,
    },
    filedAt: c.opened,
    children: siblings.map((s) => s.id),
    requests: siblings.map((s) => ({
      tag: s.taxonomy[0],
      state: (s.status === "in_progress"
        ? "in_progress"
        : s.status === "fulfilled" || s.status === "closed"
        ? "in_progress"
        : "active") as "active" | "in_progress" | "unmet",
      caseId: s.id as string | null,
    })),
    timeline: (req?.notes && req.notes.length
      ? req.notes
      : [
          { ts: c.opened, who: "System", msg: `Request filed — ${c.taxonomy.join(", ")}`, system: true },
          { ts: c.opened, who: orgName, msg: `Routed to ${orgName}` },
        ]
    ).map((n, i) => ({
      t: n.ts,
      date: n.ts,
      who: n.who,
      actor: c.org,
      kind: (i === 0 ? "filed" : n.system ? "routed" : "note") as "filed" | "routed" | "note",
      msg: n.msg,
      caseId: c.id as string | null,
    })),
  } as unknown as CaseDetailShape;
}

function CaseDetailView() {
  const { id } = Route.useParams();
  const { matched, matchedOrg } = Route.useSearch();
  const matchedResource = matched ? availableResources.find((r) => r.id === matched) : undefined;
  const matchedOrgObj = matchedOrg ? orgs.find((o) => o.id === matchedOrg) : undefined;
  const caseView = resolveView(id);
  const isParent = id.startsWith("U-");
  const childCases = isParent
    ? cases.filter((c) => caseView.children.includes(c.id))
    : cases.filter((c) => c.id === id);
  const orgsInvolved = new Set(childCases.map((c) => c.org)).size;
  const resolvedCount = childCases.filter((c) => c.status === "fulfilled" || c.status === "closed").length;
  const fulfillment = childCases.length ? Math.round((resolvedCount / childCases.length) * 100) : 0;
  const tint = URGENCY_TINT[caseView.urgency] ?? "#89CFF0";

  const accent = fulfillment === 100 ? "#34D399" : fulfillment > 0 ? "#89CFF0" : "#EF4E4B";
  const unmet = caseView.requests.filter((n) => n.state === "unmet");
  const nextHint =
    unmet.length > 0
      ? `${unmet.length} request${unmet.length === 1 ? "" : "s"} still unmet — ${unmet.map((u) => u.tag.split(".")[0].toLowerCase()).join(", ")}`
      : fulfillment === 100
      ? "All requests fulfilled — case can be closed."
      : `Open need in ${caseView.citizen.county} County · day 3`;

  return (
    <CrmShell module="Cases">
      <DetailTopBar
        backTo="/cases"
        backLabel="Cases"
        crumbs={[{ label: "Cases", to: "/cases" }, { label: caseView.citizen.name }]}
      />

      <main className="max-w-[1240px] mx-auto px-4 py-5 md:py-7 space-y-4">
        <IdentityBand
          avatar={
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[#EF4E4B]/12 text-[#EF4E4B] flex items-center justify-center text-[16px] md:text-[18px] font-semibold">
              {caseView.citizen.name.split(" ").map((s) => s[0]).join("")}
            </div>
          }
          pills={<StatusPill tint={tint}>{caseView.urgency} · {caseView.status}</StatusPill>}
          title={caseView.citizen.name}
          chips={
            <>
              <MetaChip icon={MapPin}>{caseView.citizen.county} County</MetaChip>
              <MetaPopover>
                <MetaChip icon={Phone}>{caseView.citizen.phone}</MetaChip>
                <MetaChip icon={Users}>Household of {caseView.citizen.household}</MetaChip>
                <MetaChip icon={Calendar}>Filed {caseView.filedAt}</MetaChip>
                <span className="font-mono text-[10px] text-white/40">Case {caseView.id}</span>
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
                  { label: "Close case", icon: XCircle, danger: true },
                ]}
              />
            </>
          }
        />

        {matchedResource && (
          <div className="rounded-2xl bg-[#34D399]/[0.08] border border-[#34D399]/30 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#34D399]/20 text-[#34D399] flex items-center justify-center shrink-0">
              <Package size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#34D399]/20 text-[#34D399]">Just matched</span>
                <span className="font-mono text-[10px] text-white/45">{matchedResource.id}</span>
              </div>
              <p className="text-[14px] font-medium mt-1">{matchedResource.title}</p>
              <p className="text-[12px] text-white/65 mt-0.5">
                {matchedResource.capacity} · {matchedResource.location}
              </p>
              <p className="font-mono text-[10px] text-white/50 mt-1">
                Offered by {matchedResource.ownerName} · available {matchedResource.available}
              </p>
            </div>
          </div>
        )}
        {matchedOrgObj && (
          <div className="rounded-2xl bg-[#34D399]/[0.08] border border-[#34D399]/30 p-4 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#34D399]/20 text-[#34D399] flex items-center justify-center shrink-0">
              <HandHelping size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#34D399]/20 text-[#34D399]">Just matched</span>
                <span className="font-mono text-[10px] text-white/45">{matchedOrgObj.id}</span>
              </div>
              <p className="text-[14px] font-medium mt-1">Routed to {matchedOrgObj.name}</p>
              <p className="text-[12px] text-white/65 mt-0.5">
                Serves {matchedOrgObj.counties.join(", ")} · {matchedOrgObj.people} people on staff
              </p>
            </div>
          </div>
        )}

        <DetailLayout
          main={
            <>
              <HeroBlock
                label="Fulfillment"
                value={resolvedCount}
                unit={`/ ${childCases.length} requests`}
                accent={accent}
                progress={fulfillment}
                hint={nextHint}
                secondary={[
                  { label: "Orgs involved", value: orgsInvolved },
                  { label: "Open", value: childCases.length - resolvedCount },
                  { label: "Day", value: 3 },
                ]}
              />
              <CaseTabs childCases={childCases} caseView={caseView} />
            </>
          }
          rail={
            <>
              <ContextCard title="Citizen">
                <ContextRow label="Name" value={caseView.citizen.name} />
                <ContextRow label="Phone" value={caseView.citizen.phone} />
                <ContextRow label="County" value={caseView.citizen.county} />
                <ContextRow label="Household" value={caseView.citizen.household} />
              </ContextCard>
              <ContextCard title="Case">
                <ContextRow label="ID" value={<span className="font-mono text-[10.5px] text-white/55">{caseView.id}</span>} />
                <ContextRow label="Status" value={<span className="capitalize">{caseView.status}</span>} />
                <ContextRow label="Urgency" value={<span className="capitalize">{caseView.urgency}</span>} />
                <ContextRow label="Filed" value={caseView.filedAt} />
                <ContextRow label="Requests" value={childCases.length} />
              </ContextCard>
              {caseView.citizen.notes && (
                <ContextCard title="Notes">
                  <p className="text-[12px] text-white/75 leading-snug">{caseView.citizen.notes}</p>
                </ContextCard>
              )}
            </>
          }
        />
      </main>
    </CrmShell>
  );
}

function CaseTabs({ childCases, caseView }: { childCases: typeof cases; caseView: CaseDetailShape }) {
  const allMatchIds = Array.from(new Set(childCases.flatMap(() => Object.keys(matches))));
  const aggMatches = allMatchIds.map((id) => matches[id]).filter(Boolean);
  const activityCount = caseView.timeline.length;

  const tabs: DetailTab[] = [
    {
      key: "activity",
      label: "Activity",
      count: activityCount,
      content: <ActivityTab childCases={childCases} caseView={caseView} />,
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

function ActivityTab({ childCases, caseView }: { childCases: typeof cases; caseView: CaseDetailShape }) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [note, setNote] = useState("");
  const events = [...caseView.timeline].reverse();
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
