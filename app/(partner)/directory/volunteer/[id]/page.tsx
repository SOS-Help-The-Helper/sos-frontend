"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Clock, Phone, MessageSquare, Share2, Flag, XCircle } from "lucide-react";
import { CrmShell } from "@/components/crm-shell";
import { Avatar } from "@/components/directory/Avatar";
import { AiSummary } from "@/components/crm/AiSummary";
import {
  DetailTopBar, IdentityBand, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
  StatusPill, MetaPopover, OverflowMenu, HeroLine, ActionBtn,
} from "@/components/crm/DetailShell";
import { api } from "@/lib/api";

interface PersonData {
  id: string;
  display_name: string;
  sos_score?: number;
  impact_score?: number;
  community_score?: number;
  readiness_score?: number;
  created_at?: string;
  [key: string]: unknown;
}

export default function VolunteerPage() {
  const { id } = useParams<{ id: string }>();
  const [person, setPerson] = useState<PersonData | null | undefined>(undefined);

  useEffect(() => {
    api.crmGetPerson(id)
      .then((data: any) => {
        const p = data?.person ?? data;
        setPerson(p?.id ? p : null);
      })
      .catch(() => setPerson(null));
  }, [id]);

  if (person === undefined) {
    return (
      <CrmShell module="Directory">
        <DetailTopBar backTo="/directory" backLabel="Directory" />
        <main className="max-w-[960px] mx-auto px-4 md:px-6 py-5 md:py-7 space-y-4 animate-pulse">
          <div className="h-20 rounded-xl bg-white/5" />
          <div className="h-16 rounded-xl bg-white/5" />
          <div className="h-48 rounded-xl bg-white/5" />
        </main>
      </CrmShell>
    );
  }

  if (!person) return <CrmShell module="Directory"><DetailTopBar backTo="/directory" backLabel="Directory" /><div className="p-10 text-center text-white/50">Volunteer not found</div></CrmShell>;

  const v = {
    id: person.id,
    name: person.display_name || 'Unknown',
    status: 'active' as const,
    hours: person.impact_score || 0,
    skills: [] as string[],
  };

  const statusTint = "#34D399";

  const tabs: DetailTab[] = [
    {
      key: "activity",
      label: "Activity",
      content: <EmptyTab label="No recent activity logged." />,
    },
    {
      key: "assignments",
      label: "Assignments",
      content: <EmptyTab label="No active assignments." />,
    },
    {
      key: "skills",
      label: "Skills",
      count: v.skills.length,
      content: v.skills.length === 0 ? (
        <EmptyTab label="No skills listed yet. Skills will populate from credential records." />
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {v.skills.map((s: string) => (
            <span key={s} className="h-7 px-2.5 inline-flex items-center rounded-md bg-white/6 text-[12px] text-white/85">
              {s}
            </span>
          ))}
        </div>
      ),
    },
  ];

  return (
    <CrmShell module="Directory">
      <DetailTopBar backTo="/directory" backLabel="Directory" />

      <main className="max-w-[960px] mx-auto px-4 md:px-6 py-5 md:py-7 space-y-4">
        <IdentityBand
          avatar={<Avatar name={v.name} size={56} />}
          pills={<StatusPill tint={statusTint}>{v.status}</StatusPill>}
          title={v.name}
          chips={
            <>
              <MetaChip icon={Clock}>{v.hours}h logged</MetaChip>
              <MetaPopover>
                <span className="font-mono text-[10px] text-white/40">{v.id}</span>
                <MetaChip>{v.skills.length} skill{v.skills.length === 1 ? "" : "s"}</MetaChip>
              </MetaPopover>
            </>
          }
          actions={
            <>
              <ActionBtn icon={Phone} label="Call" />
              <ActionBtn icon={MessageSquare} label="Message" />
              <OverflowMenu
                actions={[
                  { label: "Share", icon: Share2 },
                  { label: "Flag", icon: Flag, danger: true },
                  { label: "Deactivate", icon: XCircle, danger: true },
                ]}
              />
            </>
          }
        />

        <HeroLine
          primary={
            <>
              <span className="font-semibold tabular-nums">{v.hours}</span>
              <span className="text-white/55"> hours logged · </span>
              <span className="text-white/70 capitalize">{v.status}</span>
            </>
          }
          meta={`${v.skills.length} ${v.skills.length === 1 ? "skill" : "skills"}`}
        />

        <AiSummary
          id={v.id}
          tldr={`${v.status} volunteer · ${v.hours}h logged.`}
          summary={`${v.name} is a ${v.status} volunteer with ${v.hours} hours logged. Tracked skills: ${v.skills.length > 0 ? v.skills.join(", ") : "none on file"}.`}
        />

        <DetailTabs tabs={tabs} defaultKey="activity" />
      </main>
    </CrmShell>
  );
}
