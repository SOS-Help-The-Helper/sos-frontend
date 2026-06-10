"use client";
import { useEffect, useState } from "react";
import { Mail, Search, UserPlus, X } from "lucide-react";
import { Avatar } from "@/components/directory/Avatar";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { toast } from "sonner";

type Role = "Owner" | "Admin" | "Coordinator" | "Volunteer" | string;
type Status = "Active" | "Invited";

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  lastActive: string;
};

const ROLES: Role[] = ["Owner", "Admin", "Coordinator", "Volunteer"];
const INVITE_ROLES: Role[] = ["Admin", "Coordinator", "Volunteer"];

const ROLE_TINT: Record<Role, string> = {
  Owner: "#EF4E4B",
  Admin: "#F5EBD6",
  Coordinator: "#89CFF0",
  Volunteer: "#94a3b8",
};

export default function PeopleSettings() {
  const { orgId } = useAuthContext();
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("Coordinator");
  const [inviting, setInviting] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!orgId) return;
    api.crmOrgMembers(orgId).then((res: any) => {
      const list = res?.members ?? [];
      setMembers(list.map((m: any) => ({
        id: m.id ?? m.person_id ?? "",
        name: m.display_name ?? m.name ?? "Unknown",
        email: m.email ?? "",
        role: m.role ?? "Volunteer",
        status: "Active" as Status,
        lastActive: "—",
      })));
    }).catch(() => { toast.error("Failed to load team members"); });
  }, [orgId]);

  async function handleInvite() {
    if (!orgId || !inviteEmail) return;
    setInviting(true);
    try {
      await api.efCall("sos-coordination", { action: "directory.invite_member", org_id: orgId, email: inviteEmail, role: inviteRole });
      toast.success(`Invite sent to ${inviteEmail}`);
      setInviteOpen(false);
      setInviteEmail("");
      setInviteRole("Coordinator");
    } catch {
      toast.error("Failed to send invite");
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(member: Member) {
    if (!orgId) return;
    if (!confirm(`Remove ${member.name} from this org?`)) return;
    try {
      await api.efCall("sos-coordination", { action: "directory.remove_member", org_id: orgId, person_id: member.id });
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success(`${member.name} removed`);
    } catch {
      toast.error("Failed to remove member");
    }
  }

  async function handleRoleChange(member: Member, role: Role) {
    if (!orgId) return;
    const prev = members;
    setMembers((ms) => ms.map((m) => m.id === member.id ? { ...m, role } : m));
    try {
      await api.efCall("sos-coordination", { action: "directory.change_role", org_id: orgId, person_id: member.id, role });
      toast.success(`${member.name} is now ${role}`);
    } catch {
      setMembers(prev);
      toast.error("Failed to update role");
    }
  }

  const filtered = members.filter((m) =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase())
  );
  const active = members.filter((m) => m.status === "Active").length;
  const invited = members.filter((m) => m.status === "Invited").length;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[15px] font-semibold">Team</h2>
            <p className="text-[12px] text-white/55 mt-0.5">
              <span className="text-white/75">{active} active</span>
              {invited > 0 && <> · <span className="text-white/55">{invited} invited</span></>}
            </p>
          </div>
          <button
            onClick={() => setInviteOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#89CFF0] text-[#0a0a0a] text-[13px] font-semibold hover:bg-[#89CFF0]/90 transition"
          >
            <UserPlus size={13} /> Invite member
          </button>
        </div>

        {inviteOpen && (
          <div className="mb-4 rounded-xl border border-[var(--hairline)] bg-white/[0.03] p-4 space-y-3">
            <p className="text-[12px] font-semibold text-white/70">Invite a new member</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@org.org"
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/5 border border-[var(--hairline)] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40"
                />
              </div>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as Role)}
                className="h-9 px-3 rounded-lg bg-white/5 border border-[var(--hairline)] text-[13px] text-white focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40"
              >
                {INVITE_ROLES.map((r) => (
                  <option key={r} value={r} style={{ background: "#0F1E2B" }}>{r}</option>
                ))}
              </select>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail}
                className="h-9 px-4 rounded-lg bg-[#89CFF0] text-[#0a0a0a] text-[13px] font-semibold hover:bg-[#89CFF0]/90 transition disabled:opacity-50 shrink-0"
              >
                {inviting ? "Sending…" : "Invite"}
              </button>
            </div>
          </div>
        )}

        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/5 border border-[var(--hairline)] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40"
          />
        </div>

        <div className="rounded-xl border border-[var(--hairline)] overflow-hidden divide-y divide-[var(--hairline)]">
          {filtered.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-3 hover:bg-white/[0.02] transition">
              <Avatar name={m.name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13.5px] font-medium truncate">{m.name}</p>
                  {m.status === "Invited" && (
                    <span className="text-xs font-mono uppercase tracking-wider text-[#F5EBD6] bg-[#F5EBD6]/12 px-1.5 py-0.5 rounded">
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-white/50 truncate">{m.email}</p>
              </div>
              <div className="hidden sm:block text-right">
                <select
                  value={m.role}
                  onChange={(e) => handleRoleChange(m, e.target.value as Role)}
                  className="text-[12px] font-medium px-2 py-0.5 rounded-md bg-transparent border border-transparent hover:border-white/10 focus:outline-none focus:border-white/20 cursor-pointer"
                  style={{ color: ROLE_TINT[m.role] ?? "#94a3b8" }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r} style={{ color: "#0a0a0a", background: "#fff" }}>{r}</option>
                  ))}
                </select>
                <p className="text-[11px] text-white/40 mt-0.5">{m.lastActive}</p>
              </div>
              <button
                onClick={() => handleRemove(m)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-white/45 hover:text-[#EF4E4B] hover:bg-white/5 transition"
                title="Remove member"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-5">
        <h2 className="text-[15px] font-semibold mb-1">Roles</h2>
        <p className="text-[12px] text-white/55 mb-4">What each role can do in SOS Connect.</p>
        <div className="space-y-2">
          {([
            { role: "Owner", desc: "Full access. Billing, delete org, transfer ownership." },
            { role: "Admin", desc: "Manage people, modules, and all records." },
            { role: "Coordinator", desc: "Create and edit cases, requests, and resources." },
            { role: "Volunteer", desc: "View assignments and update their own tasks." },
          ] as { role: Role; desc: string }[]).map((r) => (
            <div key={r.role} className="flex items-start gap-3 px-3 py-2.5 rounded-lg bg-white/3">
              <span
                className="text-[12px] font-medium px-2 py-0.5 rounded-md shrink-0 mt-px"
                style={{ color: ROLE_TINT[r.role], background: `${ROLE_TINT[r.role]}14` }}
              >
                {r.role}
              </span>
              <p className="text-[12.5px] text-white/70">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
