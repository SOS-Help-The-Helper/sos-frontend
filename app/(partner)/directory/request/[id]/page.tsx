"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { CrmShell } from "@/components/crm-shell";
import { AiSummary } from "@/components/crm/ai-summary";
import {
  DetailTopBar, IdentityBand, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
} from "@/components/crm/detail-shell";
import { UrgencyBadge, SubStatusPill } from "@/components/crm/pills";
import { requests, matches, deliveries, cases, type ReqDetail, type MatchCandidate } from "@/lib/prototype-data";
import {
  MapPin, Calendar, User, Check, X, Camera, Truck, Package,
  ShieldCheck, Phone, MessageSquare, MoreHorizontal, Sparkles,
  StickyNote, Users, GitBranch,
} from "lucide-react";

export default function RequestPage() {
  const params = useParams();
  const id = params.id as string;

  const r = useMemo(() => requests.find((x) => x.id === id), [id]);

  if (!r) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/70">
        Request not found ·{" "}
        <Link href="/cases" className="text-[#89CFF0] underline ml-2">Back</Link>
      </div>
    );
  }

  const cands: MatchCandidate[] = r.matchIds.map((mid: string) => matches[mid]).filter(Boolean);
  const delivery = r.deliveryId ? deliveries.find((d) => d.id === r.deliveryId) : null;
  const initials = r.personName.split(" ").map((s: string) => s[0]).join("");
  const householdSize = r.household.adults + r.household.children;

  return (
    <CrmShell module="Cases">
      <DetailTopBar backTo="/cases" backLabel="Cases" />

      <main className="max-w-[960px] mx-auto px-6 py-7 space-y-5">
        <IdentityBand
          avatar={
            <Link
              href={`/directory/person/${r.personId}`}
              className="w-14 h-14 rounded-2xl bg-[#89CFF0]/15 text-[#89CFF0] flex items-center justify-center text-[17px] font-semibold hover:bg-[#89CFF0]/25 transition"
              title={`View ${r.personName}`}
            >
              {initials}
            </Link>
          }
          eyebrow={<span className="font-mono text-[10px] text-white/45">{r.id} · {r.caseId}</span>}
          pills={
            <>
              <SubStatusPill status={r.status} />
              <UrgencyBadge urgency={r.urgency} />
            </>
          }
          title={r.taxonomy}
          chips={
            <>
              <MetaChip icon={User}>
                <Link href={`/directory/person/${r.personId}`} className="hover:text-white transition">
                  {r.personName}
                </Link>
              </MetaChip>
              <MetaChip icon={Users}>
                {r.household.adults}a · {r.household.children}c
                {r.household.pets ? ` · ${r.household.pets}p` : ""}
              </MetaChip>
              <MetaChip icon={MapPin}>{r.county} County</MetaChip>
              <MetaChip icon={Calendar}>{r.daysOpen}d open</MetaChip>
              <span className="font-mono text-[11px] text-white/40">AIRS {r.airs} · OCHA {r.ocha}</span>
            </>
          }
          actions={
            <>
              <ActionBtn icon={Phone} label="Call" />
              <ActionBtn icon={MessageSquare} label="Message" />
              <ActionBtn icon={Check} label="Approve match" primary />
              <button className="w-8 h-8 rounded-md hover:bg-white/8 text-white/55 hover:text-white flex items-center justify-center transition">
                <MoreHorizontal size={14} />
              </button>
            </>
          }
        />

        <AiSummary
          id={`${r.id} · ${r.caseId}`}
          summary={`${r.urgency.toUpperCase()} ${r.taxonomy} request from ${r.personName} (household of ${householdSize}${r.household.pets ? ` + ${r.household.pets} pet${r.household.pets > 1 ? "s" : ""}` : ""}) in ${r.county} County following ${r.disaster}. Status: ${r.status.replace(/_/g, " ")}, open ${r.daysOpen}d, assigned to ${r.assignedTo.replace(/-/g, " ")}. ${cands.length} match candidate${cands.length === 1 ? "" : "s"} scored${cands.find((c) => c.approved) ? `; top match approved (${cands.find((c) => c.approved)!.title})` : ""}.${delivery ? ` Delivery ${delivery.id} is ${delivery.current.replace(/_/g, " ")}.` : ""}`}
        />

        <RequestTabs r={r} cands={cands} delivery={delivery ?? undefined} />
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
      key: "timeline",
      label: "Timeline",
      count: r.notes.length + (delivery ? delivery.steps.length : 0),
      content: (
        <div className="space-y-5">
          {delivery && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-3">
                Delivery · {delivery.origin} → {delivery.destination}
              </p>
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
                        <p className="text-[13px] font-medium" style={{ color: past ? "white" : "rgba(255,255,255,0.55)" }}>
                          {s.label}
                        </p>
                        <span className="font-mono text-[10px] text-white/40">{s.timestamp}</span>
                      </div>
                      {s.location && <p className="font-mono text-[10px] text-white/45 mt-0.5">{s.location}</p>}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
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
      key: "cases",
      label: "Cases",
      count: (parentCase ? 1 : 0) + relatedCases.length,
      content: (
        <ul className="space-y-1">
          {[parentCase, ...relatedCases].filter(Boolean).map((c) => c && (
            <li key={c.id}>
              <Link
                href={`/cases/${c.id}`}
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
      ),
    },
    {
      key: "matches",
      label: "Matches",
      count: cands.length,
      content: <MatchesList cands={cands} />,
    },
    {
      key: "notes",
      label: "Notes",
      count: r.notes.length,
      content: (
        <div className="divide-y divide-[var(--hairline)] -my-2">
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
      ),
    },
    {
      key: "reports",
      label: "Reports",
      content: <EmptyTab label="No reports linked to this request." />,
    },
  ];

  return <DetailTabs tabs={tabs} defaultKey="timeline" />;
}

function MatchesList({ cands }: { cands: MatchCandidate[] }) {
  return (
    <div className="space-y-3">
      {cands.map((c: MatchCandidate) => (
        <div
          key={c.id}
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
      ))}
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
