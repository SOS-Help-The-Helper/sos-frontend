"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Mail, Phone, Globe, Plus, MapPin, ChevronRight, Share2, Flag, Building2, Users, MessageSquare, Pencil, Check, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import { ChatPanel } from "@/components/chat/chat-panel";
import { CrmShell } from "@/components/crm-shell";
import { Avatar } from "@/components/directory/Avatar";
import { AiSummary } from "@/components/crm/AiSummary";
import {
  DetailTopBar, IdentityBand, MetaChip,
  DetailTabs, EmptyTab, type DetailTab,
  StatusPill, MetaPopover, OverflowMenu, HeroLine, ActionBtn,
} from "@/components/crm/DetailShell";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";

const CAP_COLORS: Record<string, string> = {
  Housing: "#89CFF0", Food: "#F5EBD6", Medical: "#EF4E4B",
  Logistics: "#F5EBD6", Transport: "#34D399", Wellness: "#EF4E4B",
};

export default function OrgPage() {
  const { id } = useParams<{ id: string }>();
  const { orgId } = useAuthContext();
  const [org, setOrg] = useState<any>(null);
  const [error, setError] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [members, setMembers] = useState<any[]>([]);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWebsite, setEditWebsite] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteSaving, setInviteSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.crmGetOrg(id as string)
      .then((res: any) => {
        if (res) setOrg(res);
        else setError(true);
      })
      .catch(() => {
        setError(true);
        toast.error("Failed to load organization");
      });
    api.crmOrgStats(id as string).then((res: any) => setStats(res ?? {})).catch(() => {});
    api.crmOrgMembers(id as string).then((res: any) => setMembers(res?.members ?? [])).catch(() => {});
  }, [id]);

  useEffect(() => {
    if (org) {
      setEditName(org.name ?? org.org_name ?? '');
      setEditEmail(org.email ?? org.contact_email ?? '');
      setEditPhone(org.phone ?? org.contact_phone ?? '');
      setEditWebsite(org.website ?? '');
    }
  }, [org]);

  async function saveOrg() {
    setSaving(true);
    try {
      await (api as any).efCall('sos-coordination', { action: 'directory.update_org', org_id: id, name: editName, email: editEmail, phone: editPhone, website: editWebsite });
      toast.success('Organization updated');
      setEditMode(false);
    } catch {
      toast.error('Failed to update organization');
    } finally {
      setSaving(false);
    }
  }

  async function inviteMember() {
    if (!inviteEmail.trim()) return;
    setInviteSaving(true);
    try {
      await (api as any).efCall('sos-coordination', { action: 'directory.invite_member', org_id: id, email: inviteEmail, role: 'Volunteer' });
      toast.success('Member invited');
      setInviteOpen(false);
      setInviteEmail('');
      api.crmOrgMembers(id as string).then((res: any) => setMembers(res?.members ?? [])).catch(() => {});
    } catch {
      toast.error('Failed to invite member');
    } finally {
      setInviteSaving(false);
    }
  }

  if (error) return (
    <CrmShell module="Directory">
      <div className="flex flex-col items-center gap-3 py-20 text-white/40">
        <p>Failed to load organization.</p>
        <a href="/app/directory" className="text-sm underline text-white/60">Back to Directory</a>
      </div>
    </CrmShell>
  );
  if (!org) return <CrmShell module="Directory"><div className="p-10 text-center text-white/50">Loading organization...</div></CrmShell>;
  const orgName = org.name ?? org.org_name ?? "Unknown Org";
  const orgType = org.type ?? org.org_type ?? "partner";
  const location = org.location ?? org.city ?? org.state ?? "";
  const email = org.email ?? org.contact_email ?? "";
  const phone = org.phone ?? org.contact_phone ?? "";
  const website = org.website ?? "";
  const capabilities = org.capabilities ?? org.services ?? [];
  const counties = org.counties ?? [];
  const memberCount = members.length || org.member_count || 0;
  const trustPct = org.trust ? Math.round(org.trust * 100) : 75;
  const trustTint = trustPct >= 85 ? "#34D399" : trustPct >= 65 ? "#89CFF0" : "#F5EBD6";

  const tabs: DetailTab[] = [
    {
      key: "members",
      label: "Members",
      count: memberCount,
      content: <MembersTab members={members} />,
    },
    {
      key: "stats",
      label: "Stats",
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Active", value: stats.active_cases ?? 0 },
              { label: "Fulfilled", value: stats.fulfilled ?? 0 },
              { label: "Matches", value: stats.total_matches ?? 0 },
            ].map(s => (
              <div key={s.label} className="rounded-xl bg-white/5 border border-white/8 p-3 text-center">
                <p className="text-[20px] font-semibold tabular-nums">{s.value}</p>
                <p className="font-mono text-xs text-white/45 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
  ];

  return (
    <CrmShell module="Directory">
      <DetailTopBar backTo="/app/directory" backLabel="Directory" />

      <main className="max-w-[960px] mx-auto px-4 md:px-6 py-5 md:py-7 space-y-4">
        <IdentityBand
          avatar={
            <div className="w-14 h-14 rounded-2xl bg-[#89CFF0]/12 text-[#89CFF0] flex items-center justify-center text-[17px] font-semibold tracking-tight">
              {(orgName).split(" ").map((s) => s[0]).slice(0, 2).join("")}
            </div>
          }
          pills={<StatusPill tint={trustTint}>{orgType}</StatusPill>}
          title={orgName}
          chips={
            <>
              {location && <MetaChip icon={MapPin}>{location}</MetaChip>}
              <MetaPopover>
                {email && <MetaChip icon={Mail}>{email}</MetaChip>}
                {phone && <MetaChip icon={Phone}>{phone}</MetaChip>}
                {website && <MetaChip icon={Globe}>{website}</MetaChip>}
                {capabilities.length > 0 && <MetaChip icon={Building2}>
                  {capabilities.join(", ")}
                </MetaChip>}
                <span className="font-mono text-xs text-white/40">{org.id}</span>
              </MetaPopover>
            </>
          }
          actions={
            <>
              <ActionBtn icon={editMode ? XIcon : Pencil} label={editMode ? "Cancel" : "Edit"} onClick={() => setEditMode(v => !v)} />
              <ActionBtn icon={MessageSquare} label="Chat" onClick={() => setChatOpen(true)} />
              <ActionBtn icon={Plus} label="Invite" primary onClick={() => setInviteOpen(v => !v)} />
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
              <span className="font-semibold tabular-nums">{stats.active_cases ?? 0}</span>
              <span className="text-white/55"> active · </span>
              <span className="font-semibold tabular-nums">{stats.fulfilled ?? 0}</span>
              <span className="text-white/55"> fulfilled · </span>
              <span className="font-semibold tabular-nums">{stats.total_matches ?? 0}</span>
              <span className="text-white/55"> matches</span>
            </>
          }
          meta={`${trustPct}% trust · ${memberCount} members`}
          progress={trustPct}
          accent={trustTint}
        />

        <AiSummary
          id={org.id}
          tldr={`${orgType} · ${memberCount} members · ${stats.active_cases ?? 0} active cases.`}
          summary={`${orgName} is a ${orgType.toLowerCase()} based in ${location || "WNC"}, with ${memberCount} members. Trust score ${trustPct}%. ${capabilities.length > 0 ? `Capabilities: ${capabilities.join(", ")}.` : ""} Currently handling ${stats.active_cases ?? 0} active cases with ${stats.fulfilled ?? 0} fulfilled.`}
        />

        {editMode && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
            <p className="text-[11px] uppercase tracking-widest text-white/45 font-mono mb-1">Edit Organization</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: 'Name', value: editName, set: setEditName, placeholder: 'Organization name' },
                { label: 'Email', value: editEmail, set: setEditEmail, placeholder: 'contact@org.org' },
                { label: 'Phone', value: editPhone, set: setEditPhone, placeholder: '+1 555 000 0000' },
                { label: 'Website', value: editWebsite, set: setEditWebsite, placeholder: 'https://...' },
              ].map(f => (
                <div key={f.label} className="flex flex-col gap-1">
                  <label className="text-[11px] text-white/50">{f.label}</label>
                  <input
                    type="text"
                    value={f.value}
                    onChange={e => f.set(e.target.value)}
                    placeholder={f.placeholder}
                    className="bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/30 outline-none focus:border-[#89CFF0]/60"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditMode(false)} className="px-3 py-1.5 rounded-lg text-[12px] text-white/60 border border-white/10 hover:bg-white/5 transition">Cancel</button>
              <button onClick={saveOrg} disabled={saving} className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-[#EF4E4B] text-white hover:bg-[#d94441] transition disabled:opacity-50 flex items-center gap-1.5">
                <Check size={12} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {inviteOpen && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
            <p className="text-[11px] uppercase tracking-widest text-white/45 font-mono mb-1">Invite Member</p>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] text-white/50">Email address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="volunteer@org.org"
                className="bg-white/8 border border-white/15 rounded-lg px-3 py-2 text-[13px] text-white placeholder-white/30 outline-none focus:border-[#89CFF0]/60"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => { setInviteOpen(false); setInviteEmail(''); }} className="px-3 py-1.5 rounded-lg text-[12px] text-white/60 border border-white/10 hover:bg-white/5 transition">Cancel</button>
              <button onClick={inviteMember} disabled={inviteSaving || !inviteEmail.trim()} className="px-4 py-1.5 rounded-lg text-[12px] font-medium bg-[#EF4E4B] text-white hover:bg-[#d94441] transition disabled:opacity-50 flex items-center gap-1.5">
                <Plus size={12} /> {inviteSaving ? 'Inviting…' : 'Send invite'}
              </button>
            </div>
          </div>
        )}

        <DetailTabs tabs={tabs} defaultKey="activity" />
      </main>
      <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} entityType="organization" entityId={id} orgId={orgId} />
    </CrmShell>
  );
}

function MembersTab({ members }: { members: any[] }) {
  if (members.length === 0) return <EmptyTab label="No members found." />;
  return (
    <div className="-m-1 rounded-xl bg-[var(--surface-app)] border border-[var(--hairline)] overflow-hidden divide-y divide-[var(--hairline)]">
      {members.map((m: any) => (
        <Link
          key={m.id || m.person_id}
          href={`/app/directory/person/${m.person_id || m.id}`}
          className="flex items-center gap-3 px-4 py-3 hover:bg-white/4 transition"
        >
          <Avatar name={m.display_name || m.name || "?"} size={32} />
          <span className="flex-1 text-[13.5px] font-medium">{m.display_name || m.name || "Unknown"}</span>
          <span className="text-[11.5px] text-white/45 mr-1">{m.role || "Member"}</span>
          <ChevronRight size={14} className="text-white/25" />
        </Link>
      ))}
    </div>
  );
}

function CoverageTab({ capabilities, counties }: { capabilities: string[]; counties: string[] }) {
  if (counties.length === 0 && capabilities.length === 0) return <EmptyTab label="No coverage data." />;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {capabilities.map((c) => {
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
        {counties.map((c) => (
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
