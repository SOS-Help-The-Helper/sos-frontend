import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CrmShell } from "@/components/crm/CrmShell";
import {
  DetailTopBar, IdentityBand, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
  StatusPill, MetaPopover, OverflowMenu, ActionBtn,
  HeroBlock, DetailLayout, ContextCard, ContextRow,
  DetailNotFound, DetailError,
} from "@/components/crm/DetailShell";
import { STATUS_LABEL } from "@/lib/prototype-data";
import { requests, matches, deliveries, cases, transportAssignments, orgTransportConfig, TRANSPORT_STATUS_LABEL, type ReqDetail, type MatchCandidate } from "@/lib/prototype-data";
import { MatchChainView } from "@/components/match/MatchChainView";
import { MatchPairView } from "@/components/match/MatchPairView";
import {
  MapPin, Calendar, User, Check, X, Camera, Truck, Package,
  ShieldCheck, Phone, MessageSquare, Sparkles,
  Users, GitBranch, ExternalLink, Flag, XCircle, Share2,
} from "lucide-react";


export const Route = createFileRoute("/directory/request/$id")({
  loader: ({ params }): ReqDetail => {
    const r = requests.find((x) => x.id === params.id);
    if (!r) throw notFound();
    return r;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.taxonomy ?? "Request"} — SOS Connect` }],
  }),
  notFoundComponent: () => (
    <DetailNotFound module="Cases" backTo="/cases" backLabel="Cases" entity="Request" />
  ),
  errorComponent: ({ error }) => (
    <DetailError module="Cases" backTo="/cases" backLabel="Cases" message={error.message} />
  ),
  component: RequestPage,
});

function RequestPage() {
  const r = Route.useLoaderData();
  const cands: MatchCandidate[] = r.matchIds.map((id: string) => matches[id]).filter(Boolean);
  const delivery = r.deliveryId ? deliveries.find((d) => d.id === r.deliveryId) : null;
  const initials = r.personName.split(" ").map((s: string) => s[0]).join("");
  const householdSize = r.household.adults + r.household.children;
  const urgencyTint =
    r.urgency === "critical" ? "#EF4E4B" :
    r.urgency === "high" ? "#EF4E4B" :
    r.urgency === "medium" ? "#89CFF0" :
    "rgba(74,84,98,0.55)";

  const topMatch = cands.find((c) => c.approved) ?? cands[0];
  const heroValue = topMatch ? topMatch.score : cands.length;
  const heroUnit = topMatch ? "/ 100 top match" : cands.length === 0 ? "matches yet" : "candidates";
  const nextHint = topMatch
    ? topMatch.approved
      ? `Approved: ${topMatch.title} · ready for delivery`
      : `Top candidate: ${topMatch.title} — review and approve`
    : `Awaiting matches · assigned to ${r.assignedTo.replace(/-/g, " ")}`;

  return (
    <CrmShell module="Cases">
      <DetailTopBar
        backTo="/cases"
        backLabel="Cases"
        crumbs={[{ label: "Cases", to: "/cases" }, { label: r.personName }, { label: r.taxonomy }]}
      />

      <main className="max-w-[1240px] mx-auto px-4 py-5 md:py-7 space-y-4">
        <IdentityBand
          avatar={
            <Link
              to="/directory/person/$id"
              params={{ id: r.personId }}
              className="w-14 h-14 rounded-2xl bg-[#89CFF0]/15 text-[#89CFF0] flex items-center justify-center text-[17px] font-semibold hover:bg-[#89CFF0]/25 transition"
              title={`View ${r.personName}`}
            >
              {initials}
            </Link>
          }
          pills={<StatusPill tint={urgencyTint}>{r.urgency} · {STATUS_LABEL[r.status as keyof typeof STATUS_LABEL] ?? r.status}</StatusPill>}
          title={r.taxonomy}
          chips={
            <>
              <MetaChip icon={User}>
                <Link to="/directory/person/$id" params={{ id: r.personId }} className="hover:text-white transition">
                  {r.personName}
                </Link>
              </MetaChip>
              <MetaChip icon={MapPin}>{r.county} County</MetaChip>
              <MetaPopover>
                <MetaChip icon={Users}>
                  {r.household.adults}a · {r.household.children}c
                  {r.household.pets ? ` · ${r.household.pets}p` : ""}
                </MetaChip>
                <MetaChip icon={Calendar}>{r.daysOpen}d open</MetaChip>
                <span className="font-mono text-[10px] text-white/40">{r.id} · {r.caseId}</span>
                <span className="font-mono text-[10px] text-white/40">AIRS {r.airs} · OCHA {r.ocha}</span>
              </MetaPopover>
            </>
          }
          actions={
            <>
              <ActionBtn icon={Phone} label="Call" />
              <ActionBtn icon={Check} label="Approve match" primary />
              <OverflowMenu
                actions={[
                  { label: "Message citizen", icon: MessageSquare },
                  { label: "Reassign", icon: Users },
                  { label: "Share", icon: Share2 },
                  { label: "Flag for review", icon: Flag, danger: true },
                  { label: "Close request", icon: XCircle, danger: true },
                ]}
              />
            </>
          }
        />

        <DetailLayout
          main={
            <>
              <HeroBlock
                label={topMatch ? "Top match score" : "Matches"}
                value={heroValue}
                unit={heroUnit}
                accent={topMatch?.approved ? "#34D399" : urgencyTint}
                progress={topMatch ? topMatch.score : undefined}
                hint={nextHint}
                secondary={[
                  { label: "Urgency", value: <span className="capitalize">{r.urgency}</span> },
                  { label: "Days open", value: r.daysOpen },
                  { label: "Matches", value: cands.length },
                ]}
              />
              <RequestTabs r={r} cands={cands} delivery={delivery ?? undefined} />
            </>
          }
          rail={
            <>
              <ContextCard title="Citizen">
                <Link
                  to="/directory/person/$id"
                  params={{ id: r.personId }}
                  className="text-[13px] text-[#89CFF0] hover:underline"
                >
                  {r.personName}
                </Link>
                <p className="text-[11.5px] text-white/55 mt-1">
                  Household of {householdSize}
                  {r.household.pets ? ` + ${r.household.pets} pet${r.household.pets > 1 ? "s" : ""}` : ""}
                </p>
              </ContextCard>
              <ContextCard title="Request">
                <ContextRow label="ID" value={<span className="font-mono text-[10.5px] text-white/55">{r.id}</span>} />
                <ContextRow label="Case" value={<Link to="/cases/$id" params={{ id: r.caseId }} className="font-mono text-[10.5px] text-[#89CFF0] hover:underline">{r.caseId}</Link>} />
                <ContextRow label="County" value={r.county} />
                <ContextRow label="Disaster" value={<span className="font-mono text-[11px]">{r.disaster}</span>} />
                <ContextRow label="Assigned" value={<span className="capitalize">{r.assignedTo.replace(/-/g, " ")}</span>} />
                <ContextRow label="AIRS" value={<span className="font-mono text-[11px]">{r.airs}</span>} />
              </ContextCard>
              {delivery && (
                <ContextCard title="Delivery">
                  <ContextRow label="ID" value={<span className="font-mono text-[10.5px] text-white/55">{delivery.id}</span>} />
                  <ContextRow label="Status" value={<span className="capitalize">{delivery.current.replace(/_/g, " ")}</span>} />
                  <ContextRow label="Route" value={`${delivery.origin} → ${delivery.destination}`} />
                </ContextCard>
              )}
            </>
          }
        />
      </main>
    </CrmShell>
  );
}

function RequestTabs({
  r, cands, delivery,
}: {
  r: ReqDetail;
  cands: MatchCandidate[];
  delivery: ReturnType<typeof deliveries.find>;
}) {
  const parentCase = cases.find((c) => c.id === r.caseId);
  const relatedCases = cases.filter((c) => c.citizen.toLowerCase().includes(r.personName.split(" ")[0].toLowerCase()) && c.id !== r.caseId);

  const tabs: DetailTab[] = [
    {
      key: "activity",
      label: "Activity",
      count: r.notes.length + (delivery ? delivery.steps.length : 0),
      content: (
        <div className="space-y-5">
          {delivery && (() => {
            const ta = transportAssignments.find(t => t.resourceId === delivery.resourceId);
            const cfg = ta ? orgTransportConfig[ta.org] : null;
            const pipeline = cfg?.statusPipeline ?? [];
            const currentIdx = ta ? pipeline.indexOf(ta.status) : -1;
            return (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">
                    Delivery · {delivery.origin} → {delivery.destination}
                    {ta && <span className="ml-2 text-white/35">· {ta.id}</span>}
                  </p>
                  {ta && (
                    <Link
                      to="/drive/$id"
                      params={{ id: ta.id }}
                      className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-[#89CFF0]/15 hover:bg-[#89CFF0]/25 text-[#89CFF0] text-[11px] font-medium transition"
                    >
                      <ExternalLink size={10} /> Driver page
                    </Link>
                  )}
                </div>
                {ta && pipeline.length > 0 ? (
                  <ol className="relative ml-2 space-y-3 border-l border-[var(--hairline)] pl-6">
                    {pipeline.map((s, i) => {
                      const past = i < currentIdx;
                      const isCurrent = i === currentIdx;
                      const color = past || isCurrent ? "#34D399" : "rgba(245,235,214,0.35)";
                      const hist = ta.statusHistory.find(h => h.status === s);
                      return (
                        <li key={s} className="relative">
                          <span
                            className={`absolute -left-[30px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-[var(--surface-1)] ${isCurrent ? "animate-pulse" : ""}`}
                            style={{ background: past || isCurrent ? "rgba(52,211,153,0.18)" : "rgba(245,235,214,0.06)" }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                          </span>
                          <div className="flex items-center justify-between">
                            <p className="text-[12.5px] font-medium" style={{ color: past || isCurrent ? "var(--sos-navy)" : "#9CA3AF" }}>
                              {TRANSPORT_STATUS_LABEL[s]}
                              {hist?.photo && <Camera size={10} className="inline ml-1.5 text-[#89CFF0]" />}
                            </p>
                            <span className="font-mono text-[10px] text-white/40">{hist?.timestamp ?? ""}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <ol className="relative ml-2 space-y-4 border-l border-[var(--hairline)] pl-6">
                    {delivery.steps.map((s, i) => {
                      const past = delivery.steps.findIndex((x) => x.key === delivery.current) >= i;
                      const isCurrent = s.key === delivery.current;
                      const Icon = s.key === "picked_up" || s.key === "delivered" ? Camera : s.key === "in_transit" ? Truck : s.key === "confirmed" ? ShieldCheck : Package;
                      const color = past ? "#34D399" : "rgba(245,235,214,0.35)";
                      return (
                        <li key={s.key} className="relative">
                          <span
                            className={`absolute -left-[34px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-[var(--surface-1)] ${isCurrent ? "animate-pulse" : ""}`}
                            style={{ background: past ? "rgba(52,211,153,0.18)" : "rgba(245,235,214,0.06)" }}
                          >
                            <Icon size={12} style={{ color }} />
                          </span>
                          <div className="flex items-center justify-between">
                            <p className="text-[13px] font-medium" style={{ color: past ? "var(--sos-navy)" : "#6B7280" }}>
                              {s.label}
                            </p>
                            <span className="font-mono text-[10px] text-white/40">{s.timestamp}</span>
                          </div>
                          {s.location && <p className="font-mono text-[10px] text-white/45 mt-0.5">{s.location}</p>}
                        </li>
                      );
                    })}
                  </ol>
                )}
              </div>
            );
          })()}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">Activity</p>
            <div className="divide-y divide-[var(--hairline)]">
              {r.notes.map((n: ReqDetail["notes"][number], i: number) => (
                <div key={i} className="py-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${n.system ? "bg-white/6 text-white/55" : "bg-[#89CFF0]/12 text-[#89CFF0]"}`}>
                      {n.system ? "system" : "manual"}
                    </span>
                    <span className="font-mono text-[10px] text-white/45">{n.ts} · {n.who}</span>
                  </div>
                  <p className="text-[13px] text-white/85">{n.msg}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "matches",
      label: "Matches",
      count: cands.length,
      content: <MatchesList cands={cands} />,
    },
    {
      key: "files",
      label: "Files",
      content: (parentCase || relatedCases.length > 0) ? (
        <ul className="space-y-1">
          {[parentCase, ...relatedCases].filter(Boolean).map((c) => c && (
            <li key={c.id}>
              <Link
                to="/cases/$id"
                params={{ id: c.id }}
                className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-md hover:bg-white/5 transition"
              >
                <GitBranch size={13} className="text-white/40" />
                <span className="font-mono text-[10.5px] text-white/45 w-12 shrink-0">{c.id}</span>
                <p className="font-mono text-[10.5px] text-white/80 truncate flex-1">{c.taxonomy.join(" · ")}</p>
                <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/8 text-white/65 shrink-0">
                  {c.status.replace(/_/g, " ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyTab label="No linked cases or reports." />
      ),
    },
  ];

  return <DetailTabs tabs={tabs} defaultKey="activity" />;
}

function MatchesList({ cands }: { cands: MatchCandidate[] }) {
  const chainMatch = cands.find((c) => c.survivor && c.rv && c.pipelineStatus);
  const others = cands.filter((c) => c.id !== chainMatch?.id);

  return (
    <div className="space-y-4">
      {chainMatch && <MatchChainView match={chainMatch} />}
      {others.length > 0 && (
        <div className="space-y-3">
          {chainMatch && (
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">
              Alternate options · {others.length}
            </p>
          )}
          {others.map((c) => {
            // 2-way view when survivor + resource are seeded
            if (c.survivor && c.resource) {
              return <MatchPairView key={c.id} match={c} />;
            }
            // Fallback: legacy compact card for matches without seeded chain/pair data
            return <LegacyMatchCard key={c.id} c={c} />;
          })}
        </div>
      )}
    </div>
  );
}

function LegacyMatchCard({ c }: { c: MatchCandidate }) {
  return (
    <div
      className={`rounded-xl border p-4 ${c.approved ? "bg-[#89CFF0]/8 border-[#89CFF0]/30" : "bg-[var(--surface-app)] border-[var(--hairline)]"}`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Sparkles size={12} className="text-[#89CFF0]" />
            <p className="text-[14px] font-medium">{c.title}</p>
            {c.approved && (
              <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-[#34D399]">
                <Check size={10} /> approved
              </span>
            )}
          </div>
          <p className="text-[12px] text-white/55">{c.blurb}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-mono text-[22px] font-semibold tabular-nums" style={{ color: c.approved ? "#34D399" : "#89CFF0" }}>{c.score}</p>
          <p className="font-mono text-[9px] uppercase tracking-wider text-white/40">/ 100</p>
        </div>
      </div>
      <div className="grid grid-cols-5 gap-2 mt-3">
        <Bar label="Cat" v={c.breakdown.category} max={30} />
        <Bar label="Dist" v={c.breakdown.distance} max={25} />
        <Bar label="Urg" v={c.breakdown.urgency} max={20} />
        <Bar label="Cap" v={c.breakdown.capacity} max={15} />
        <Bar label="Trust" v={c.breakdown.trust} max={10} />
      </div>
      <p className="text-[12px] text-white/55 italic mt-3">{c.rationale}</p>
      {!c.approved && (
        <div className="flex items-center gap-2 mt-3">
          <button className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-[#34D399]/15 text-[#34D399] text-[11px] font-medium hover:bg-[#34D399]/25 transition">
            <Check size={11} /> Approve
          </button>
          <button className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white/6 text-white/65 text-[11px] font-medium hover:bg-white/12 transition">
            <X size={11} /> Reject
          </button>
        </div>
      )}
    </div>
  );
}

function Bar({ label, v, max }: { label: string; v: number; max: number }) {
  return (
    <div>
      <div className="h-1 rounded-full bg-white/8 overflow-hidden">
        <div className="h-full bg-[#89CFF0]" style={{ width: `${(v / max) * 100}%` }} />
      </div>
      <p className="font-mono text-[9px] uppercase tracking-wider text-white/40 mt-1">{label} {v}</p>
    </div>
  );
}
