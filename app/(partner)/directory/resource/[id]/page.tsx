"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useEffect, useState } from "react";
import { CrmShell } from "@/components/crm-shell";
import { AiSummary } from "@/components/crm/ai-summary";
import {
  DetailTopBar, IdentityBand, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
} from "@/components/crm/detail-shell";
import { resources, type ResourceDetail } from "@/lib/prototype-data";
import { api } from "@/lib/api";
import { User, MapPin, Package, Calendar, GitBranch } from "lucide-react";

type HistEntry = ResourceDetail["history"][number];

export default function ResourcePage() {
  const params = useParams();
  const id = params.id as string;

  const proto = useMemo(() => resources.find((x) => x.id === id), [id]);
  const [liveData, setLiveData] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api.from("resources").select("*").eq("id", id).single().then(({ data }) => {
      if (data) setLiveData(data);
    });
  }, [id]);

  const r: ResourceDetail | null = useMemo(() => {
    if (liveData) {
      const loc = liveData.locations as Record<string, unknown> | null | undefined;
      const locationText = loc
        ? [loc.street_address, loc.city, loc.state].filter(Boolean).join(", ")
        : (liveData.latitude && liveData.longitude ? `${liveData.latitude}, ${liveData.longitude}` : "Unknown");
      return {
        id: liveData.id as string,
        title: (liveData.taxonomy_code as string) ?? "Resource",
        taxonomy: liveData.category as string,
        status: (liveData.status as ResourceDetail["status"]) ?? "available",
        ownerName: liveData.org_id as string,
        ownerId: liveData.org_id as string,
        org: undefined,
        location: locationText,
        capacity: liveData.capacity_available != null
          ? `${liveData.capacity_available} / ${liveData.capacity_total ?? "?"}`
          : "Unknown",
        matchedTo: undefined,
        history: [],
      } as ResourceDetail;
    }
    return proto ?? null;
  }, [liveData, proto]);

  if (!r) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/70">
        Resource not found ·{" "}
        <Link href="/inventory" className="text-[#89CFF0] underline ml-2">Back</Link>
      </div>
    );
  }

  const statusColor =
    r.status === "deployed" ? "#34D399" : r.status === "matched" ? "#89CFF0" : "#F5EBD6";

  const tabs: DetailTab[] = [
    {
      key: "timeline",
      label: "Timeline",
      count: r.history.length,
      content: (
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
                <span className="font-mono text-[10px] text-white/40">{h.date}</span>
              </div>
            </li>
          ))}
        </ol>
      ),
    },
    {
      key: "cases",
      label: "Cases",
      count: r.matchedTo ? 1 : 0,
      content: r.matchedTo ? (
        <Link
          href={`/cases/${r.matchedTo.caseId}`}
          className="flex items-center gap-2.5 py-2 px-2 -mx-2 rounded-md hover:bg-white/5 transition"
        >
          <GitBranch size={13} className="text-white/40" />
          <span className="font-mono text-[10.5px] text-white/45 w-16 shrink-0">{r.matchedTo.caseId}</span>
          <p className="text-[13px] text-white/85 flex-1">{r.matchedTo.personName}</p>
        </Link>
      ) : (
        <EmptyTab label="Not matched to any case yet." />
      ),
    },
    {
      key: "matches",
      label: "Matches",
      content: r.matchedTo ? (
        <div className="rounded-xl border border-[#89CFF0]/30 bg-[#89CFF0]/8 p-4">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Currently matched to</p>
          <Link href={`/cases/${r.matchedTo.caseId}`} className="text-[14px] font-medium text-[#89CFF0] hover:underline">
            {r.matchedTo.personName}
          </Link>
          <p className="font-mono text-[11px] text-white/55 mt-0.5">{r.matchedTo.caseId}</p>
        </div>
      ) : (
        <EmptyTab label="No active matches. Available for deployment." />
      ),
    },
    {
      key: "notes",
      label: "Notes",
      content: <EmptyTab label="No notes on this resource." />,
    },
    {
      key: "reports",
      label: "Reports",
      content: <EmptyTab label="No reports linked." />,
    },
  ];

  return (
    <CrmShell module="Cases">
      <DetailTopBar backTo="/inventory" backLabel="Resources" />

      <main className="max-w-[960px] mx-auto px-6 py-7 space-y-5">
        <IdentityBand
          avatar={
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: `${statusColor}22`, color: statusColor }}
            >
              <Package size={22} />
            </div>
          }
          eyebrow={<span className="font-mono text-[10px] text-white/45">{r.id}</span>}
          pills={
            <span
              className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider"
              style={{ color: statusColor, background: `${statusColor}1A` }}
            >
              {r.status}
            </span>
          }
          title={r.title}
          chips={
            <>
              <span className="font-mono text-[11px] text-white/55">{r.taxonomy}</span>
              <MetaChip icon={User}>
                <Link href={`/directory/person/${r.ownerId}`} className="hover:text-white transition">
                  {r.ownerName}
                </Link>
                {r.org && <span className="text-white/40"> · {r.org}</span>}
              </MetaChip>
              <MetaChip icon={MapPin}>{r.location}</MetaChip>
              <MetaChip icon={Calendar}>{r.capacity}</MetaChip>
            </>
          }
        />

        <AiSummary
          id={r.id}
          summary={`${r.title} owned by ${r.ownerName}${r.org ? ` (${r.org})` : ""}, currently ${r.status}${r.matchedTo ? ` and matched to ${r.matchedTo.personName} on ${r.matchedTo.caseId}` : ""}. Staged at ${r.location}. Capacity: ${r.capacity}. ${r.history.length} events in deployment history.`}
        />

        <DetailTabs tabs={tabs} defaultKey="timeline" />
      </main>
    </CrmShell>
  );
}
