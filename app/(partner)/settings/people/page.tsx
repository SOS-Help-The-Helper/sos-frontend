"use client";
import { useRouter } from "next/navigation";
import { Mail, MoreHorizontal, Search, UserPlus } from "lucide-react";
import { Avatar } from "@/components/directory/Avatar";


type Role = "Owner" | "Admin" | "Coordinator" | "Volunteer";
type Status = "Active" | "Invited";

type Member = {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: Status;
  lastActive: string;
};

const MEMBERS: Member[] = [
  { id: "u1", name: "Melissa Hart", email: "melissa@mountainareaaid.org", role: "Owner", status: "Active", lastActive: "now" },
  { id: "u2", name: "Diego Alvarez", email: "diego@mountainareaaid.org", role: "Admin", status: "Active", lastActive: "2h ago" },
  { id: "u3", name: "Priya Shah", email: "priya@mountainareaaid.org", role: "Coordinator", status: "Active", lastActive: "yesterday" },
  { id: "u4", name: "Jordan Lee", email: "jordan@mountainareaaid.org", role: "Coordinator", status: "Active", lastActive: "3d ago" },
  { id: "u5", name: "Sam Okafor", email: "sam@mountainareaaid.org", role: "Volunteer", status: "Active", lastActive: "1w ago" },
  { id: "u6", name: "Riley Chen", email: "riley.chen@gmail.com", role: "Volunteer", status: "Invited", lastActive: "—" },
];

const ROLE_TINT: Record<Role, string> = {
  Owner: "#EF4E4B",
  Admin: "#F5EBD6",
  Coordinator: "#89CFF0",
  Volunteer: "#94a3b8",
};

export default function PeopleSettings() {
  const active = MEMBERS.filter((m) => m.status === "Active").length;
  const invited = MEMBERS.filter((m) => m.status === "Invited").length;

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
          <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-[#89CFF0] text-[#0a0a0a] text-[13px] font-semibold hover:bg-[#89CFF0]/90 transition">
            <UserPlus size={13} /> Invite
          </button>
        </div>

        <div className="relative mb-3">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            placeholder="Search by name or email"
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/5 border border-[var(--hairline)] text-[13px] focus:outline-none focus:ring-2 focus:ring-[#89CFF0]/40"
          />
        </div>

        <div className="rounded-xl border border-[var(--hairline)] overflow-hidden divide-y divide-[var(--hairline)]">
          {MEMBERS.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-3 py-3 hover:bg-white/[0.02] transition">
              <Avatar name={m.name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13.5px] font-medium truncate">{m.name}</p>
                  {m.status === "Invited" && (
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#F5EBD6] bg-[#F5EBD6]/12 px-1.5 py-0.5 rounded">
                      Pending
                    </span>
                  )}
                </div>
                <p className="text-[12px] text-white/50 truncate">{m.email}</p>
              </div>
              <div className="hidden sm:block text-right">
                <span
                  className="inline-block text-[12px] font-medium px-2 py-0.5 rounded-md"
                  style={{ color: ROLE_TINT[m.role], background: `${ROLE_TINT[m.role]}14` }}
                >
                  {m.role}
                </span>
                <p className="text-[11px] text-white/40 mt-0.5">{m.lastActive}</p>
              </div>
              <button className="w-8 h-8 rounded-md flex items-center justify-center text-white/45 hover:text-white hover:bg-white/5 transition">
                {m.status === "Invited" ? <Mail size={14} /> : <MoreHorizontal size={14} />}
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
