'use client';

import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, ShieldCheck, Clock, Phone, Mail, ChevronRight, Users, Share2, Plus } from "lucide-react";
import { toast } from "sonner";
import { CrmShell } from "@/components/crm-shell";
import { Avatar } from "@/components/directory/Avatar";
import { AiSummary } from "@/components/crm/AiSummary";
import {
  DetailTopBar, IdentityBand, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
  StatusPill, MetaPopover, OverflowMenu, HeroLine, ActionBtn,
} from "@/components/crm/DetailShell";
import { people, type Person } from "@/lib/directory-data";
import { StatusBadge } from "@/components/directory/Badges";
import { Timeline } from "@/components/directory/Timeline";
import { StewardshipBand } from "@/components/directory/StewardshipChip";
import { EditableCell, EditableSelect } from "@/components/directory/EditableCell";
import { usePerson, canEdit, updatePerson } from "@/lib/directory-store";

const HOUSING_OPTIONS = ["Stable", "Displaced", "At Risk"] as const;

export default function PersonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const found = people.find((p) => p.id === id);
  const person = usePerson(id) ?? found;

  if (!person) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/70">
        Person not found ·{" "}
        <Link href="/directory" className="text-[#89CFF0] underline ml-2">Back</Link>
      </div>
    );
  }

  const editable = canEdit(person.org.id);
  const housingTint =
    person.housingStatus === "Stable" ? "#34D399" :
    person.housingStatus === "Displaced" ? "#F5EBD6" :
    "#EF4E4B";
  const scoreColor = person.sosScore >= 75 ? "#34D399" : person.sosScore >= 50 ? "#89CFF0" : "#F5EBD6";

  const tabs: DetailTab[] = [
    {
      key: "activity",
      label: "Activity",
      count: person.history.length,
      content: <Timeline entries={person.history} />,
    },
    {
      key: "credentials",
      label: "Credentials",
      count: person.credentials.length,
      content: <CredentialsTab person={person} />,
    },
    {
      key: "skills",
      label: "Skills",
      count: person.skills.length,
      content: <SkillsTab person={person} />,
    },
  ];

  return (
    <CrmShell module="Directory">
      <DetailTopBar backTo="/directory" backLabel="Directory" />

      <main className="max-w-[960px] mx-auto px-4 md:px-6 py-5 md:py-7 space-y-4">
        <IdentityBand
          avatar={<Avatar name={person.name} size={56} />}
          pills={
            editable ? (
              <span
                className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded"
                style={{ color: housingTint, background: `${housingTint}1a` }}
              >
                <span className="w-1 h-1 rounded-full" style={{ background: housingTint }} />
                <EditableSelect
                  value={person.housingStatus}
                  editable
                  onCommit={(v) => updatePerson(person.id, "housingStatus", v, { kind: "user", label: "you" })}
                  options={HOUSING_OPTIONS}
                  className="!h-5 !text-[9.5px] uppercase tracking-wider font-mono"
                />
              </span>
            ) : (
              <StatusPill tint={housingTint}>{person.housingStatus}</StatusPill>
            )
          }
          title={person.name}
          chips={
            <>
              <MetaChip>
                <Link
                  href={`/directory/org/${person.org.id}`}
                  className="hover:text-white transition"
                >
                  {person.org.name}
                </Link>
                <span className="text-white/35 mx-1">·</span>
                <EditableCell
                  value={person.role}
                  editable={editable}
                  onCommit={(v) => updatePerson(person.id, "role", v, { kind: "user", label: "you" })}
                  className="text-white/65"
                />
              </MetaChip>
              <MetaPopover>
                <MetaChip icon={Phone}>
                  <EditableCell
                    value={person.phoneMask}
                    editable={editable}
                    onCommit={(v) => updatePerson(person.id, "phoneMask", v, { kind: "user", label: "you" })}
                  />
                </MetaChip>
                <MetaChip icon={Mail}>
                  <EditableCell
                    value={person.email}
                    editable={editable}
                    onCommit={(v) => updatePerson(person.id, "email", v, { kind: "user", label: "you" })}
                  />
                </MetaChip>
                <MetaChip icon={MapPin}>
                  <EditableCell
                    value={person.county}
                    editable={editable}
                    onCommit={(v) => updatePerson(person.id, "county", v, { kind: "user", label: "you" })}
                  />
                  <span className="ml-1">County</span>
                </MetaChip>
                {person.household && (
                  <MetaChip icon={Users}>Household of {person.household.members.length}</MetaChip>
                )}
                <span className="font-mono text-[10px] text-white/40">{person.id}</span>
              </MetaPopover>
            </>
          }
          actions={
            <>
              <ActionBtn icon={Phone} label="Call" />
              <ActionBtn icon={Mail} label="Email" />
              <OverflowMenu
                actions={[
                  { label: "Locate", icon: MapPin },
                  { label: "Share", icon: Share2 },
                ]}
              />
            </>
          }
        />

        <StewardshipBand
          ownerOrgId={person.org.id}
          ownerOrgName={person.org.name}
          onRequestChange={() => toast.success(`Change request sent to ${person.org.name}.`)}
        />

        <HeroLine
          primary={
            <>
              <span className="font-semibold tabular-nums" style={{ color: scoreColor }}>{person.sosScore}</span>
              <span className="text-white/55"> SOS Score · </span>
              <span className="text-white/70">
                Community {person.scoreBreakdown.community}/40 · Impact {person.scoreBreakdown.impact}/40 · Readiness {person.scoreBreakdown.readiness}/20
              </span>
            </>
          }
          progress={person.sosScore}
          accent={scoreColor}
        />

        <AiSummary
          id={person.id}
          tldr={`${person.role} at ${person.org.name} · ${person.housingStatus.toLowerCase()} · SOS ${person.sosScore}.`}
          summary={`${person.name} is a ${person.role.toLowerCase()} at ${person.org.name}, based in ${person.county} County. Currently ${person.housingStatus.toLowerCase()}. SOS score ${person.sosScore} (Community ${person.scoreBreakdown.community}, Impact ${person.scoreBreakdown.impact}, Readiness ${person.scoreBreakdown.readiness}). Holds ${person.credentials.length} credential${person.credentials.length === 1 ? "" : "s"} and ${person.skills.length} tracked skill${person.skills.length === 1 ? "" : "s"}.`}
        />

        <DetailTabs tabs={tabs} defaultKey="activity" />
      </main>
    </CrmShell>
  );
}

function ListGroup({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[var(--surface-app)] border border-[var(--hairline)] overflow-hidden divide-y divide-[var(--hairline)]">
      {children}
    </div>
  );
}

function CredentialsTab({ person }: { person: Person }) {
  if (person.credentials.length === 0) return <EmptyTab label="No credentials on file." />;
  return (
    <div className="space-y-3 -m-1">
      <ListGroup>
        {person.credentials.map((c) => (
          <div key={c.id} className="px-4 py-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-medium">{c.type}</p>
                <p className="text-[12px] text-white/50 mt-0.5">{c.issuer}</p>
              </div>
              <StatusBadge tone={c.status === "verified" ? "green" : c.status === "pending" ? "yellow" : "red"}>
                {c.status === "verified" ? "Verified" : c.status === "pending" ? "Pending" : "Expired"}
              </StatusBadge>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-[12px] text-white/50">
              {c.status === "verified" ? (
                <><ShieldCheck size={13} className="text-[#34D399]" /> Verified by {c.verifiedBy} · {c.verifiedOn}</>
              ) : c.status === "pending" ? (
                <><Clock size={13} className="text-[#F5EBD6]" /> Awaiting verification</>
              ) : (
                <span className="text-[#EF4E4B]">Expired — renew required</span>
              )}
              {c.expiry && c.status === "verified" && <span className="ml-auto text-white/35">Expires {c.expiry}</span>}
            </div>
          </div>
        ))}
      </ListGroup>
      <button className="w-full h-9 rounded-lg bg-white/5 hover:bg-white/8 text-white/75 text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5 transition">
        <Plus size={13} /> Add credential
      </button>
    </div>
  );
}

function SkillsTab({ person }: { person: Person }) {
  if (person.skills.length === 0) return <EmptyTab label="No skills tracked." />;
  const sourceMap = {
    self: { label: "Self-reported", tone: "neutral" as const },
    credential: { label: "Credential", tone: "green" as const },
    org: { label: "Org verified", tone: "blue" as const },
  };
  const levels = ["Basic", "Intermediate", "Advanced", "Expert"];

  return (
    <ListGroup>
      {person.skills.map((s) => (
        <div key={s.name} className="px-4 py-3.5">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-[14px] font-medium">{s.name}</p>
              <p className="text-[12px] text-white/45 mt-0.5">{levels[s.level - 1]}</p>
            </div>
            <StatusBadge tone={sourceMap[s.source].tone}>{sourceMap[s.source].label}</StatusBadge>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="flex-1 h-1 rounded-full"
                style={{ background: n <= s.level ? "#89CFF0" : "rgba(255,255,255,0.08)" }}
              />
            ))}
          </div>
        </div>
      ))}
      {person.household && (
        <div className="px-4 py-3.5 bg-white/[0.02]">
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">Household · {person.household.address}</p>
          <div className="space-y-2">
            {person.household.members.map((m) => (
              <div key={m.name} className="flex items-center gap-3">
                <Avatar name={m.name} size={28} />
                <span className="flex-1 text-[13px]">{m.name}</span>
                <span className="text-[11.5px] text-white/45">{m.relation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <Link
        href={`/directory/org/${person.org.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-white/4 transition"
      >
        <div className="w-9 h-9 rounded-lg bg-[#89CFF0]/12 text-[#89CFF0] flex items-center justify-center text-[13px] font-semibold">
          {person.org.name.split(" ").map((s) => s[0]).slice(0, 2).join("")}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium truncate">{person.org.name}</p>
          <p className="text-[11.5px] text-white/45 truncate">{person.role} · since Jan 2023</p>
        </div>
        <ChevronRight size={14} className="text-white/25" />
      </Link>
    </ListGroup>
  );
}
