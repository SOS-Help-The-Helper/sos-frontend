"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CrmShell } from "@/components/crm-shell";
import { AiSummary } from "@/components/crm/AiSummary";
import {
  DetailTopBar, IdentityBand, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
  StatusPill, MetaPopover, OverflowMenu, ActionBtn,
} from "@/components/crm/DetailShell";
import { reports, type ReportDetail } from "@/lib/prototype-data";
import { MapPin, ShieldCheck, Camera, User, AlertTriangle, Calendar, Phone, Share2, Flag, XCircle } from "lucide-react";


const SEV: Record<ReportDetail["severity"], string> = {
  Critical: "#EF4E4B",
  Elevated: "#F5EBD6",
  Routine: "#89CFF0",
};

export default function ReportPage() {
  const r = Route.useLoaderData();
  const sev = SEV[r.severity as ReportDetail["severity"]];

  const timelineEntries: { label: string; date: string; color: string }[] = [
    { label: "Reported", date: r.date, color: "#F5EBD6" },
    ...(r.verifiedBy ? [{ label: `Verified by ${r.verifiedBy}`, date: r.date, color: "#89CFF0" }] : []),
    ...(r.resolution ? [{ label: r.resolution, date: r.resolution, color: "#34D399" }] : []),
  ];

  const tabs: DetailTab[] = [
    {
      key: "activity",
      label: "Activity",
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
                  <span className="text-[10.5px] text-white/40" title={t.date}>{t.date}</span>
                </div>
              </li>
            ))}
          </ol>
          {r.resolution && (
            <p className="text-[12.5px] text-white/65 pt-2 border-t border-[var(--hairline)]">
              <span className="text-white/45">Resolution: </span>
              {r.resolution}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "cases",
      label: "Cases",
      content: <EmptyTab label="No cases linked to this report." />,
    },
    {
      key: "files",
      label: "Files",
      count: r.corroborators,
      content: r.corroborators > 0 ? (
        <p className="text-[13px] text-white/75">
          {r.corroborators} corroborating report{r.corroborators === 1 ? "" : "s"} from nearby reporters.
        </p>
      ) : (
        <EmptyTab label="No files or corroborating reports." />
      ),
    },
  ];

  return (
    <CrmShell module="Cases">
      <DetailTopBar backTo="/reports" backLabel="Reports" />

      <main className="max-w-[960px] mx-auto px-4 md:px-6 py-5 md:py-7 space-y-4">
        <IdentityBand
          avatar={
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: `${sev}22`, color: sev }}
            >
              <AlertTriangle size={22} />
            </div>
          }
          pills={
            <StatusPill tint={sev}>
              {r.severity} · {r.verifiedBy ? "verified" : "unverified"}
            </StatusPill>
          }
          title={r.taxonomy}
          chips={
            <>
              <MetaChip icon={MapPin}>{r.location}</MetaChip>
              <MetaPopover>
                <MetaChip icon={User}>
                  <Link href={`/directory/person/${r.reporterId}`} className="hover:text-white transition">
                    {r.reporterName}
                  </Link>
                </MetaChip>
                <MetaChip icon={Calendar}>{r.date}</MetaChip>
                <span className="font-mono text-[10px] text-white/40">{r.id}</span>
                <span className="font-mono text-[10px] text-white/40">{r.disaster}</span>
              </MetaPopover>
            </>
          }
          actions={
            <>
              <ActionBtn icon={Phone} label="Call reporter" />
              <OverflowMenu
                actions={[
                  { label: "Share", icon: Share2 },
                  { label: "Flag report", icon: Flag, danger: true },
                  { label: "Close report", icon: XCircle, danger: true },
                ]}
              />
            </>
          }
        />

        <AiSummary
          id={r.id}
          tldr={`${r.severity} ${r.taxonomy.toLowerCase()} at ${r.location} · ${r.verifiedBy ? "verified" : "unverified"} · +${r.corroborators}.`}
          summary={`${r.severity} ${r.taxonomy} report filed by ${r.reporterName} at ${r.location} during ${r.disaster} on ${r.date}. ${r.verifiedBy ? `Verified by ${r.verifiedBy} with ${r.corroborators} corroborating report${r.corroborators === 1 ? "" : "s"}.` : `Unverified, ${r.corroborators} corroborating report${r.corroborators === 1 ? "" : "s"}.`} ${r.resolution ?? "Currently open and awaiting resolution."}`}
        />

        <DetailTabs tabs={tabs} defaultKey="activity" />
      </main>
    </CrmShell>
  );
}
