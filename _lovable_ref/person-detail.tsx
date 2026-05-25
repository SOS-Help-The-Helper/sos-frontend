import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { MapPin, ShieldCheck, Clock, Phone, Mail, ChevronRight, Users, Share2, Plus } from "lucide-react";
import { toast } from "sonner";
import { CrmShell } from "@/components/crm/CrmShell";
import { Avatar } from "@/components/directory/Avatar";

import {
  DetailTopBar, IdentityBand, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
  StatusPill, MetaPopover, OverflowMenu, HeroBlock, ActionBtn,
  DetailLayout, ContextCard, ContextRow, DetailNotFound, DetailError,
} from "@/components/crm/DetailShell";
import { people, type Person } from "@/lib/directory-data";
import { StatusBadge } from "@/components/directory/Badges";
import { Timeline } from "@/components/directory/Timeline";
import { StewardshipChip } from "@/components/directory/StewardshipChip";
import { EditableCell, EditableSelect } from "@/components/directory/EditableCell";
import { usePerson, canEdit, updatePerson, scopeForOrg } from "@/lib/directory-store";

export const Route = createFileRoute("/directory/person/$id")({
  loader: ({ params }): Person => {
    const person = people.find((p) => p.id === params.id);
    if (!person) throw notFound();
    return person;
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Person"} — SOS Connect` },
      { name: "description", content: `${loaderData?.name} profile in the SOS Connect directory.` },
    ],
  }),
  notFoundComponent: () => (
    <DetailNotFound module="Directory" backTo="/directory" backLabel="Directory" entity="Person" />
  ),
  errorComponent: ({ error }) => (
    <DetailError module="Directory" backTo="/directory" backLabel="Directory" message={error.message} />
  ),
  component: PersonPage,
});

const HOUSING_OPTIONS = ["Stable", "Displaced", "At Risk"] as const;

function PersonPage() {
  const seed = Route.useLoaderData();
  const person = usePerson(seed.id) ?? seed;
  const editable = canEdit(person.org.id);
  const housingTint =
    person.housingStatus === "Stable" ? "#34D399" :
    person.housingStatus === "Displaced" ? "#EF4E4B" :
    "#EF4E4B";
  const scoreColor = person.sosScore >= 75 ? "#34D399" : person.sosScore >= 50 ? "#89CFF0" : "#EF4E4B";

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
      <DetailTopBar
        backTo="/directory"
        backLabel="Directory"
        crumbs={[{ label: "People", to: "/directory" }, { label: person.name }]}
      />

      <main className="max-w-[1240px] mx-auto px-4 py-5 md:py-7 space-y-4">
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
                  to="/directory/org/$id"
                  params={{ id: person.org.id }}
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

        <DetailLayout
          main={
            <>
              <HeroBlock
                label="SOS Score"
                value={person.sosScore}
                unit="/ 100"
                accent={scoreColor}
                progress={person.sosScore}
                hint={`${person.role} at ${person.org.name} · ${person.county} County`}
                secondary={[
                  { label: "Community", value: `${person.scoreBreakdown.community}/40` },
                  { label: "Impact", value: `${person.scoreBreakdown.impact}/40` },
                  { label: "Readiness", value: `${person.scoreBreakdown.readiness}/20` },
                ]}
              />
              <DetailTabs tabs={tabs} defaultKey="activity" />
            </>
          }
          rail={
            <>
              <ContextCard title="Stewardship">
                <div className="flex items-start gap-2">
                  <StewardshipChip ownerOrgId={person.org.id} ownerOrgName={person.org.name} size="md" />
                </div>
                <p className="text-[11.5px] text-white/55 mt-2 leading-snug">
                  {editable
                    ? "Maintained by your org · fields are editable inline."
                    : `Maintained by ${person.org.name} · read-only in your view.`}
                </p>
                {!editable && (
                  <button
                    onClick={() => toast.success(`Change request sent to ${person.org.name}.`)}
                    className="mt-2 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md bg-white/6 hover:bg-white/10 text-[11.5px] text-white/80 transition"
                  >
                    Request change
                  </button>
                )}
              </ContextCard>

              <ContextCard title="Contact">
                <ContextRow label="Phone" value={person.phoneMask} />
                <ContextRow label="Email" value={<span className="truncate">{person.email}</span>} />
                <ContextRow label="County" value={person.county} />
                {person.household && (
                  <ContextRow label="Household" value={`${person.household.members.length} members`} />
                )}
                <ContextRow label="ID" value={<span className="font-mono text-[10.5px] text-white/55">{person.id}</span>} />
              </ContextCard>

              <ContextCard title="At a glance">
                <ContextRow label="Housing" value={person.housingStatus} />
                <ContextRow label="Credentials" value={person.credentials.length} />
                <ContextRow label="Skills" value={person.skills.length} />
                <ContextRow label="Visibility" value={scopeForOrg(person.org.id)} />
              </ContextCard>
            </>
          }
        />
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
                <><Clock size={13} className="text-[#89CFF0]" /> Awaiting verification</>
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
                style={{ background: n <= s.level ? "#89CFF0" : "#E5E7EB" }}
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
        to="/directory/org/$id"
        params={{ id: person.org.id }}
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
