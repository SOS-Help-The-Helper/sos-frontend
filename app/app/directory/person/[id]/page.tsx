"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { MapPin, ShieldCheck, Clock, Phone, Mail, ChevronRight, Users, Share2, Plus, MessageSquare, Pencil, Check, X as XIcon, Archive } from "lucide-react";
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
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { ChatPanel } from "@/components/chat/chat-panel";

interface LinkedRequest {
  id: string;
  status?: string;
  created_at?: string;
  household_size?: number;
  has_children?: boolean;
  has_elderly?: boolean;
  has_disabled?: boolean;
  has_pets?: boolean;
  [key: string]: unknown;
}

interface ApiPersonData {
  id: string;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
  [key: string]: unknown;
}

interface ApiResponse {
  person?: ApiPersonData;
  requests?: LinkedRequest[];
  [key: string]: unknown;
}


const HOUSING_OPTIONS = ["Stable", "Displaced", "At Risk"] as const;

export default function PersonPage() {
  const { id } = useParams<{ id: string }>();
  const { orgId } = useAuthContext();
  const [apiData, setApiData] = useState<ApiResponse | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.crmGetPerson(id)
      .then((data: unknown) => setApiData(data as ApiResponse))
      .catch(() => setApiData(null));
  }, [id]);

  const seed = people.find((p) => p.id === id);
  if (!seed) return <CrmShell module="Directory"><div className="p-10 text-center text-white/50">Person not found</div></CrmShell>;
  const person = usePerson(seed.id) ?? seed;

  function openEdit() {
    setEditName(person.name);
    setEditPhone(person.phoneMask ?? "");
    setEditEmail(person.email ?? "");
    setEditMode(true);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await api.crmUpdatePerson(id, "display_name", editName);
      await api.crmUpdatePerson(id, "phone", editPhone);
      await api.crmUpdatePerson(id, "email", editEmail);
      toast.success("Person updated");
      setEditMode(false);
    } catch {
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  function cancelEdit() {
    setEditMode(false);
  }
  const editable = canEdit(person.org.id);

  const apiPerson = apiData?.person;
  const linkedRequests: LinkedRequest[] = apiData?.requests ?? [];
  const householdRequest = linkedRequests.find(
    (r) => r.household_size != null || r.has_children || r.has_elderly || r.has_disabled || r.has_pets
  );
  const personLat = apiPerson?.lat ?? apiPerson?.latitude;
  const personLng = apiPerson?.lng ?? apiPerson?.longitude;
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
      key: "requests",
      label: "Requests",
      count: linkedRequests.length || undefined,
      content: <RequestsTab requests={linkedRequests} />,
    },
    {
      key: "credentials",
      label: "Credentials",
      count: (person.credentials ?? []).length,
      content: <CredentialsTab person={person} />,
    },
    {
      key: "skills",
      label: "Skills",
      count: (person.skills ?? []).length,
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
                  href={`/app/directory/org/${person.org.id}`}
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
              <ActionBtn icon={MessageSquare} label="Chat" onClick={() => setChatOpen(true)} />
              <ActionBtn icon={Pencil} label="Edit" onClick={openEdit} />
              <OverflowMenu
                actions={[
                  { label: "Locate", icon: MapPin },
                  { label: "Share", icon: Share2 },
                ]}
              />
            </>
          }
        />

        {editMode && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
            <p className="text-[11px] font-mono uppercase tracking-wider text-white/45">Edit Person</p>
            <div className="space-y-2">
              <input
                className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
                placeholder="Name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <input
                className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
                placeholder="Phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
              <input
                className="w-full bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-[13px] text-white placeholder:text-white/30 focus:outline-none focus:border-white/25"
                placeholder="Email"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 h-9 rounded-lg bg-[#EF4E4B] hover:bg-[#EF4E4B]/80 disabled:opacity-50 text-white text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition"
              >
                <Check size={13} /> {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="h-9 px-4 rounded-lg bg-white/8 hover:bg-white/12 disabled:opacity-50 text-white/70 text-[13px] font-medium inline-flex items-center justify-center gap-1.5 transition"
              >
                <XIcon size={13} /> Cancel
              </button>
            </div>
          </div>
        )}

        <StewardshipBand
          ownerOrgId={person.org.id}
          ownerOrgName={person.org.name}
          onRequestChange={() => (() => {})()}
        />

        {householdRequest && (
          <div className="flex flex-wrap gap-2 px-1">
            {householdRequest.household_size != null && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">
                <Users size={11} className="text-white/50" />
                {householdRequest.household_size} members
              </span>
            )}
            {householdRequest.has_children && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">👶 Children</span>
            )}
            {householdRequest.has_elderly && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">👴 Elderly</span>
            )}
            {householdRequest.has_disabled && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">♿ Disabled</span>
            )}
            {householdRequest.has_pets && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/70">🐾 Pets</span>
            )}
          </div>
        )}

        {personLat != null && personLng != null && (
          <div className="rounded-xl overflow-hidden border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+ef4e4b(${personLng},${personLat})/${personLng},${personLat},12,0/300x200@2x?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}`}
              alt="Person location"
              className="w-full h-[160px] object-cover"
              width={600}
              height={320}
            />
          </div>
        )}

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
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} entityType="person" entityId={id} orgId={orgId} />
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
  if ((person.credentials ?? []).length === 0) return <EmptyTab label="No credentials on file." />;
  return (
    <div className="space-y-3 -m-1">
      <ListGroup>
        {(person.credentials ?? []).map((c) => (
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
  if ((person.skills ?? []).length === 0) return <EmptyTab label="No skills tracked." />;
  const sourceMap = {
    self: { label: "Self-reported", tone: "neutral" as const },
    credential: { label: "Credential", tone: "green" as const },
    org: { label: "Org verified", tone: "blue" as const },
  };
  const levels = ["Basic", "Intermediate", "Advanced", "Expert"];

  return (
    <ListGroup>
      {(person.skills ?? []).map((s) => (
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
        href={`/app/directory/org/${person.org.id}`}
        className="flex items-center gap-3 px-4 py-3 hover:bg-white/4 transition"
      >
        <div className="w-9 h-9 rounded-lg bg-[#89CFF0]/12 text-[#89CFF0] flex items-center justify-center text-[13px] font-semibold">
          {(person.org.name || "?").split(" ").map((s) => s[0]).slice(0, 2).join("")}
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

function RequestsTab({ requests }: { requests: LinkedRequest[] }) {
  if (requests.length === 0) return <EmptyTab label="No linked requests." />;
  return (
    <ListGroup>
      {requests.map((r) => (
        <div key={r.id} className="px-4 py-3.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium capitalize">{r.status ?? "Unknown"}</p>
            {r.created_at && (
              <p className="text-[11.5px] text-white/45 mt-0.5">
                {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </p>
            )}
          </div>
          <span className="font-mono text-[10px] text-white/30 truncate max-w-[120px]">{r.id}</span>
        </div>
      ))}
    </ListGroup>
  );
}
