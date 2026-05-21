"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Mail, Phone, Globe, Plus, MapPin, ChevronRight, Share2, Flag, Building2 } from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { Avatar } from "@/components/directory/Avatar";
import { AiSummary } from "@/components/crm/AiSummary";
import {
  DetailTopBar, IdentityBand, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
  StatusPill, MetaPopover, OverflowMenu, HeroLine, ActionBtn,
} from "@/components/crm/DetailShell";
import { orgs, type Org } from "@/lib/directory-data";
import { Timeline } from "@/components/directory/Timeline";


const CAP_COLORS: Record<string, string> = {
  Housing: "#89CFF0", Food: "#F5EBD6", Medical: "#EF4E4B",
  Logistics: "#F5EBD6", Transport: "#34D399", Wellness: "#EF4E4B",
};

export default function OrgPage() {
  const { id } = useParams<{ id: string }>();
  const org = orgs.find((o) => o.id === id);
  if (!org) return <CrmShell module="Directory"><div className="p-10 text-center text-white/50">Organization not found</div></CrmShell>;
  const trustPct = Math.round(org.trust * 100);
  const trustTint = trustPct >= 85 ? "#34D399" : trustPct >= 65 ? "#89CFF0" : "#F5EBD6";

  const tabs: DetailTab[] = [
    {
      key: "activity",
      label: "Activity",
      count: org.history.length,
      content: <Timeline entries={org.history} />,
    },
    {
      key: "members",
      label: "Members",
      count: org.members.length,
      content: <MembersTab org={org} />,
    },
    {
      key: "files",
      label: "Files",
      content: <CoverageTab org={org} />,
    },
  ];

  return (
    <CrmShell module="Directory">
      <DetailTopBar backTo="/directory" backLabel="Directory" />

      <main className="max-w-[960px] mx-auto px-4 md:px-6 py-5 md:py-7 space-y-4">
        <IdentityBand
          avatar={
            <div className="w-14 h-14 rounded-2xl bg-[#89CFF0]/12 text-[#89CFF0] flex items-center justify-center text-[17px] font-semibold tracking-tight">
              {org.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </div>
          }
          pills={<StatusPill tint={trustTint}>{org.type}</StatusPill>}
          title={org.name}
          chips={
            <>
              <MetaChip icon={MapPin}>{org.location}</MetaChip>
              <MetaPopover>
                <MetaChip icon={Mail}>{org.email}</MetaChip>
                <MetaChip icon={Phone}>{org.phone}</MetaChip>
                <MetaChip icon={Globe}>{org.website}</MetaChip>
                <MetaChip icon={Building2}>
                  {org.capabilities.join(", ")}
                </MetaChip>
                <span className="font-mono text-[10px] text-white/40">{org.id}</span>
              </MetaPopover>
            </>
          }
          actions={
            <>
              <ActionBtn icon={Mail} label="Email" />
              <ActionBtn icon={Plus} label="Invite member" primary />
              <OverflowMenu
                actions={[
                  { label: "Share", icon: Share2 },
                  { label: "Flag org", icon: Flag, danger: true },
                ]}
              />
            </>
          }
        />

        <HeroLine
          primary={
            <>
              <span className="font-semibold tabular-nums">{org.stats.active}</span>
              <span className="text-white/55"> active · </span>
              <span className="font-semibold tabular-nums">{org.stats.fulfilled}</span>
              <span className="text-white/55"> fulfilled · </span>
              <span className="text-white/70">avg {org.stats.avgResponse}</span>
            </>
          }
          meta={`${trustPct}% trust · ${org.memberCount} members`}
          progress={trustPct}
          accent={trustTint}
        />

        <AiSummary
          id={org.id}
          tldr={`${org.type} · ${org.memberCount} members · ${org.stats.active} active cases.`}
          summary={`${org.name} is a ${org.type.toLowerCase()} based in ${org.location}, with ${org.memberCount} members serving ${org.counties.length} counties (${org.counties.join(", ")}). Trust score ${trustPct}%. Capabilities: ${org.capabilities.join(", ")}. Currently handling ${org.stats.active} active cases with ${org.stats.fulfilled} fulfilled and avg response of ${org.stats.avgResponse}.`}
        />

        <DetailTabs tabs={tabs} defaultKey="activity" />
      </main>
    </CrmShell>
  );
}

function MembersTab({ org }: { org: Org }) {
  return (
    <div className="-m-1 rounded-xl bg-[var(--surface-app)] border border-[var(--hairline)] overflow-hidden divide-y divide-[var(--hairline)]">
      {org.members.map((m) => (
        <Link
          key={m.id}
          href={`/directory/person/${m.id}`}
          className="flex items-center gap-3 px-4 py-3 hover:bg-white/4 transition"
        >
          <Avatar name={m.name} size={32} />
          <span className="flex-1 text-[13.5px] font-medium">{m.name}</span>
          <span className="text-[11.5px] text-white/45 mr-1">{m.role}</span>
          <ChevronRight size={14} className="text-white/25" />
        </Link>
      ))}
    </div>
  );
}

function CoverageTab({ org }: { org: Org }) {
  if (org.counties.length === 0) return <EmptyTab label="No coverage data." />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {org.capabilities.map((c) => {
          const color = CAP_COLORS[c] ?? "#89CFF0";
          return (
            <span
              key={c}
              className="px-2 py-1 text-[11.5px] font-medium rounded-md"
              style={{ background: `${color}1A`, color }}
            >
              {c}
            </span>
          );
        })}
      </div>
      <div className="rounded-xl bg-[var(--surface-app)] border border-[var(--hairline)] overflow-hidden divide-y divide-[var(--hairline)]">
        {org.counties.map((c) => (
          <div key={c} className="flex items-center justify-between px-4 py-2.5">
            <span className="flex items-center gap-2 text-[13px]">
              <MapPin size={13} className="text-[#89CFF0]" /> {c} County
            </span>
            <span className="text-[11.5px] text-white/40">NC</span>
          </div>
        ))}
      </div>
      <div className="h-[180px] rounded-xl overflow-hidden bg-[#0B1822]">
        <svg viewBox="0 0 400 200" className="w-full h-full">
          <defs>
            <radialGradient id="cov" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#EF4E4B" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#EF4E4B" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="400" height="200" fill="#0B1822" />
          <path d="M 40 80 Q 120 40 200 70 T 380 90 L 370 170 Q 240 195 160 160 T 40 150 Z" fill="#15293A" stroke="rgba(137,207,240,0.18)" strokeWidth="1" />
          <circle cx="200" cy="110" r="80" fill="url(#cov)" />
          <circle cx="200" cy="110" r="5" fill="#EF4E4B" />
        </svg>
      </div>
    </div>
  );
}
