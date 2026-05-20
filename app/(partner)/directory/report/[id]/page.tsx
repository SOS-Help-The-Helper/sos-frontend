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
import { reports, type ReportDetail } from "@/lib/prototype-data";
import { api } from "@/lib/api";
import { MapPin, ShieldCheck, Camera, User, AlertTriangle, Calendar } from "lucide-react";

const SEV: Record<ReportDetail["severity"], string> = {
  Critical: "#EF4E4B",
  Elevated: "#F5EBD6",
  Routine: "#89CFF0",
};

export default function ReportPage() {
  const params = useParams();
  const id = params.id as string;

  const proto = useMemo(() => reports.find((x) => x.id === id), [id]);
  const [liveData, setLiveData] = useState<ReportDetail | null>(null);

  useEffect(() => {
    Promise.resolve({ data: null as any }).then(({ data }) => {
      if (!data) return;
      const found = data.find((r: Record<string, unknown>) => r.id === id);
      if (!found) return;
      const sevMap: Record<string, ReportDetail["severity"]> = {
        critical: "Critical", elevated: "Elevated", routine: "Routine",
      };
      const rawSev = (found.severity as string | undefined)?.toLowerCase() ?? "";
      setLiveData({
        id: found.id as string,
        taxonomy: found.category as string,
        severity: sevMap[rawSev] ?? "Routine",
        reporterId: "",
        reporterName: "Unknown",
        location: found.latitude && found.longitude
          ? `${found.latitude}, ${found.longitude}`
          : "Unknown",
        disaster: "",
        date: found.created_at
          ? new Date(found.created_at as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "Unknown",
        verifiedBy: found.verification_status === "verified" ? "Verified" : undefined,
        corroborators: 0,
        resolution: found.status === "resolved" ? "Resolved" : undefined,
      });
    });
  }, [id]);

  const r: ReportDetail | null = liveData ?? proto ?? null;

  if (!r) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/70">
        Report not found ·{" "}
        <Link href="/reports" className="text-[#89CFF0] underline ml-2">Back</Link>
      </div>
    );
  }

  const sev = SEV[r.severity as ReportDetail["severity"]];

  const timelineEntries: { label: string; date: string; color: string }[] = [
    { label: "Reported", date: r.date, color: "#F5EBD6" },
    ...(r.verifiedBy ? [{ label: `Verified by ${r.verifiedBy}`, date: r.date, color: "#89CFF0" }] : []),
    ...(r.resolution ? [{ label: r.resolution, date: r.resolution, color: "#34D399" }] : []),
  ];

  const tabs: DetailTab[] = [
    {
      key: "timeline",
      label: "Timeline",
      count: timelineEntries.length,
      content: (
        <div className="space-y-5">
          <div className="relative h-[220px] rounded-xl overflow-hidden bg-gradient-to-br from-[#0B1822] to-[#0a0a0a] flex items-center justify-center">
            <Camera size={32} className="text-white/20" />
            <div className="absolute top-3 left-3 flex items-center gap-2">
              {r.verifiedBy ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#34D399]/20 text-[#34D399] text-[11px] font-medium backdrop-blur-sm">
                  <ShieldCheck size={12} /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/10 text-white/75 text-[11px] font-medium backdrop-blur-sm">
                  Unverified
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/40 text-white/70 text-[11px] backdrop-blur-sm">
                +{r.corroborators} corroborating
              </span>
            </div>
          </div>
          <ol className="relative ml-2 space-y-4 border-l border-[var(--hairline)] pl-6">
            {timelineEntries.map((t, i) => (
              <li key={i} className="relative">
                <span
                  className="absolute -left-[34px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-[var(--surface-1)]"
                  style={{ background: `${t.color}26` }}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                </span>
                <div className="flex items-center justify-between">
                  <p className="text-[13px] text-white/85">{t.label}</p>
                  <span className="font-mono text-[10px] text-white/40">{t.date}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      ),
    },
    {
      key: "cases",
      label: "Cases",
      content: <EmptyTab label="No cases linked to this report." />,
    },
    {
      key: "matches",
      label: "Matches",
      content: <EmptyTab label="No matches generated from this report." />,
    },
    {
      key: "notes",
      label: "Notes",
      content: (
        <div className="space-y-3 text-[13px] text-white/85">
          <p>
            <span className="font-mono text-[10px] uppercase tracking-wider text-white/45 mr-2">Resolution</span>
            {r.resolution ?? "Open · awaiting resolution"}
          </p>
        </div>
      ),
    },
    {
      key: "reports",
      label: "Reports",
      count: r.corroborators,
      content: r.corroborators > 0 ? (
        <p className="text-[13px] text-white/75">
          {r.corroborators} corroborating report{r.corroborators === 1 ? "" : "s"} from nearby reporters.
        </p>
      ) : (
        <EmptyTab label="No corroborating reports." />
      ),
    },
  ];

  return (
    <CrmShell module="Cases">
      <DetailTopBar backTo="/reports" backLabel="Reports" />

      <main className="max-w-[960px] mx-auto px-6 py-7 space-y-5">
        <IdentityBand
          avatar={
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: `${sev}22`, color: sev }}
            >
              <AlertTriangle size={22} />
            </div>
          }
          eyebrow={<span className="font-mono text-[10px] text-white/45">{r.id}</span>}
          pills={
            <>
              <span
                className="inline-flex items-center px-1.5 py-0.5 rounded font-mono text-[9px] uppercase tracking-wider"
                style={{ color: sev, background: `${sev}1A` }}
              >
                {r.severity}
              </span>
              {r.verifiedBy && (
                <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-[#34D399]">
                  <ShieldCheck size={11} /> verified
                </span>
              )}
            </>
          }
          title={r.taxonomy}
          chips={
            <>
              <MetaChip icon={User}>
                <Link href={`/directory/person/${r.reporterId}`} className="hover:text-white transition">
                  {r.reporterName}
                </Link>
              </MetaChip>
              <MetaChip icon={MapPin}>{r.location}</MetaChip>
              <MetaChip icon={Calendar}>{r.date}</MetaChip>
              <span className="font-mono text-[11px] text-white/40">{r.disaster}</span>
            </>
          }
        />

        <AiSummary
          id={r.id}
          summary={`${r.severity} ${r.taxonomy} report filed by ${r.reporterName} at ${r.location} during ${r.disaster} on ${r.date}. ${r.verifiedBy ? `Verified by ${r.verifiedBy} with ${r.corroborators} corroborating report${r.corroborators === 1 ? "" : "s"}.` : `Unverified, ${r.corroborators} corroborating report${r.corroborators === 1 ? "" : "s"}.`} ${r.resolution ?? "Currently open and awaiting resolution."}`}
        />

        <DetailTabs tabs={tabs} defaultKey="timeline" />
      </main>
    </CrmShell>
  );
}
