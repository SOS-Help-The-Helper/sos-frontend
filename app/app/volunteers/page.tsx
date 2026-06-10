'use client';

import { useState, Fragment } from "react";
import { useApiFetch } from "@/lib/use-api-fetch";
import Link from "next/link";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";
import { toast } from "sonner";
import { Plus, ShieldCheck, Search, X, Star, Truck, CheckCircle2, AlertCircle, Calendar as CalendarIcon } from "lucide-react";

type VolunteerDetail = {
  id: string; name: string; org: string; phone: string; skills: string[];
  hours: number; status: string; rating: number; completedMissions: number;
  towCapacity?: { maxWeight: number; hitchTypes: string[] };
  availability: { day: string; slots: string[] }[];
  deployments: { date: string; hours: number; role: string; mission: string }[];
  credentials: { name: string; type: string; verified: boolean; expires?: string }[];
};
const volunteerDetails: VolunteerDetail[] = [];
const orgs: { id: string; name: string; color: string }[] = [];

const protoVolunteers = [] as { id: string; name: string; skills: string[]; hours: number; status: string }[];

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function extractList(res: unknown, keys: string[]): unknown[] {
  if (Array.isArray(res)) return res;
  const obj = res as Record<string, unknown>;
  for (const k of keys) {
    if (Array.isArray(obj?.[k])) return obj[k] as unknown[];
  }
  return [];
}

type VolunteerRow = typeof protoVolunteers[number];

function mapVolunteers(data: unknown[]): VolunteerRow[] {
  return data.map((r) => {
    const v = r as Record<string, unknown>;
    return {
      id: String(v.id ?? v.volunteer_id ?? ""),
      name: String(v.name ?? v.full_name ?? ""),
      skills: Array.isArray(v.skills) ? (v.skills as string[]) : [],
      hours: Number(v.hours ?? v.total_hours ?? 0),
      status: (v.status as VolunteerRow["status"]) ?? "active",
    };
  }).filter(v => v.id && v.name);
}

export default function VolunteersPage() {
  const { orgId } = useAuthContext();
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [skillFilter, setSkillFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addSkills, setAddSkills] = useState("");
  const [addBusy, setAddBusy] = useState(false);
  const [hasCdl, setHasCdl] = useState(false);
  const [availableToday, setAvailableToday] = useState(false);

  const { data: volunteersData, refetch: refreshVolunteers } = useApiFetch(
    () => api.crmVolunteersAvailable(orgId).then((res) =>
      mapVolunteers(extractList(res, ["volunteers", "data", "results"]))
    ),
    "Failed to load volunteers",
    [orgId]
  );
  const volunteers = volunteersData ?? [];

  async function handleAddVolunteer(e: React.FormEvent) {
    e.preventDefault();
    if (!addName.trim()) return;
    setAddBusy(true);
    try {
      await api.submitIntake({
        person_name: addName.trim(),
        email: addEmail.trim(),
        phone: addPhone.trim(),
        org_id: orgId,
        records: [{ type: 'resource', taxonomy_code: 'volunteer', notes: addSkills.trim() }],
      });
      toast.success(`${addName.trim()} added as volunteer`);
      setShowAddForm(false);
      setAddName(""); setAddEmail(""); setAddPhone(""); setAddSkills("");
      refreshVolunteers();
    } catch {
      toast.error("Failed to add volunteer");
    } finally {
      setAddBusy(false);
    }
  }

  async function handleStatusChange(volId: string, newStatus: string) {
    try {
      await api.efCall('sos-coordination', { action: 'directory.update_person', person_id: volId, field: 'status', value: newStatus });
      toast.success("Status updated");
      refreshVolunteers();
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function handleAssign(volId: string) {
    const inputId = window.prompt("Case/Event ID to assign to:");
    if (!inputId?.trim()) return;
    try {
      await api.efCall('sos-coordination', { action: 'cases.assign', sos_id: inputId.trim(), person_id: volId });
      toast.success("Assigned");
    } catch {
      toast.error("Failed to assign");
    }
  }

  const active = volunteers.filter(v => v.status === "active").length;
  const assigned = volunteerDetails.filter(v => v.status === "assigned").length;
  const allSkills = Array.from(new Set(volunteers.flatMap(v => v.skills))).sort();

  let filtered = volunteers;
  if (skillFilter) filtered = filtered.filter(v => v.skills.includes(skillFilter));
  if (statusFilter) filtered = filtered.filter(v => v.status === statusFilter);

  const drawer = drawerId ? volunteers.find(v => v.id === drawerId) as VolunteerDetail | undefined : null;

  return (
    <CrmShell module="Volunteers">
      <PageHeader
        title="Volunteers"
        subtitle={`${active} active · ${assigned} on assignment`}
        actions={
          <button
            onClick={() => setShowAddForm(v => !v)}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition"
          >
            <Plus size={12} /> Add volunteer
          </button>
        }
      />

      {showAddForm && (
        <form onSubmit={handleAddVolunteer} className="mx-4 mt-3 rounded-xl bg-white/5 border border-white/10 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-white/45 block mb-1">Name *</label>
            <input
              value={addName} onChange={e => setAddName(e.target.value)}
              placeholder="Jane Smith"
              className="w-full h-9 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12.5px] focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-white/45 block mb-1">Email</label>
            <input
              type="email" value={addEmail} onChange={e => setAddEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full h-9 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12.5px] focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-white/45 block mb-1">Phone</label>
            <input
              type="tel" value={addPhone} onChange={e => setAddPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              className="w-full h-9 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12.5px] focus:outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="font-mono text-xs uppercase tracking-wider text-white/45 block mb-1">Skills (comma separated)</label>
            <input
              value={addSkills} onChange={e => setAddSkills(e.target.value)}
              placeholder="First aid, Driving, Spanish"
              className="w-full h-9 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12.5px] focus:outline-none focus:border-white/30"
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2 justify-end">
            <button type="button" onClick={() => setShowAddForm(false)} className="h-8 px-3 rounded-lg bg-white/6 hover:bg-white/12 text-[12px] transition">Cancel</button>
            <button type="submit" disabled={addBusy || !addName.trim()} className="h-8 px-4 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] disabled:opacity-50 text-[12px] font-medium transition">
              {addBusy ? "Saving…" : "Add volunteer"}
            </button>
          </div>
        </form>
      )}

      <div className="px-4 pt-4 pb-4 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <select value={skillFilter ?? ""} onChange={(e) => setSkillFilter(e.target.value || null)} className="h-8 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12px]">
              <option value="">All skills</option>
              {allSkills.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={statusFilter ?? ""} onChange={(e) => setStatusFilter(e.target.value || null)} className="h-8 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12px]">
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="assigned">Assigned</option>
              <option value="new">New</option>
              <option value="inactive">Inactive</option>
            </select>
            <button
              aria-pressed={hasCdl}
              onClick={() => setHasCdl(v => !v)}
              className="h-8 px-3 rounded-md bg-white/6 hover:bg-white/12 text-[12px] transition">Has CDL</button>
            <button
              aria-pressed={availableToday}
              onClick={() => setAvailableToday(v => !v)}
              className="h-8 px-3 rounded-md bg-white/6 hover:bg-white/12 text-[12px] transition">Available today</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map((v) => {
              const detail = volunteerDetails.find(d => d.id === v.id);
              const org = detail ? orgs.find(o => o.id === detail.org) : null;
              return (
                <div
                  key={v.id}
                  className="rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 p-4 transition"
                >
                  <button
                    onClick={() => setDrawerId(v.id)}
                    className="text-left w-full"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-[12.5px] font-semibold shrink-0" style={{ background: `${org?.color ?? "#89CFF0"}22`, color: org?.color ?? "#89CFF0" }}>
                        {v.name.split(" ").map((s: string) => s[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-[13.5px] truncate">{v.name}</p>
                          {detail?.credentials?.some(c => c.verified) && <ShieldCheck size={11} className="text-[#34D399] shrink-0" />}
                        </div>
                        <p className="font-mono text-xs text-white/45">{v.id} · <span style={{ color: org?.color }}>{org?.name ?? "—"}</span></p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {v.skills.slice(0, 3).map((s: string) => (
                            <span key={s} className="font-mono text-[9.5px] px-1.5 py-0.5 rounded bg-white/6 text-white/65">{s}</span>
                          ))}
                        </div>
                        {detail?.towCapacity && (
                          <div className="flex items-center gap-1 mt-2 text-[10.5px] text-white/55">
                            <Truck size={10} /> {detail.towCapacity.maxWeight.toLocaleString()} lbs · {detail.towCapacity.hitchTypes.join(", ").replace(/_/g, " ")}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono text-[15px] tabular-nums text-white/85">{v.hours}<span className="text-xs text-white/40">h</span></p>
                        {detail && (
                          <div className="flex items-center gap-0.5 justify-end mt-0.5">
                            <Star size={9} className="fill-[#F5EBD6] text-[#F5EBD6]" />
                            <span className="font-mono text-xs text-white/65">{detail.rating}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/8">
                    <select
                      value={v.status}
                      onClick={e => e.stopPropagation()}
                      onChange={e => handleStatusChange(v.id, e.target.value)}
                      className="flex-1 h-7 rounded-md bg-white/6 border border-white/10 px-2 text-[11px] focus:outline-none focus:border-white/30"
                    >
                      <option value="available">Available</option>
                      <option value="assigned">Assigned</option>
                      <option value="on_break">On break</option>
                      <option value="inactive">Inactive</option>
                    </select>
                    <button
                      onClick={() => handleAssign(v.id)}
                      className="h-7 px-3 rounded-md bg-[#89CFF0]/15 hover:bg-[#89CFF0]/25 text-[#89CFF0] text-[11px] font-medium transition"
                    >
                      Assign
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Week availability grid */}
          <section className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <CalendarIcon size={13} className="text-white/45" />
              <p className="font-mono text-[10.5px] uppercase tracking-wider text-white/55">Week availability</p>
            </div>
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left font-mono text-[9px] uppercase tracking-wider text-white/45 border-b border-white/10">
                  <th className="px-3 py-2 font-normal w-32">Volunteer</th>
                  {DAYS.map(d => <th key={d} className="px-2 py-2 font-normal text-center">{d}</th>)}
                </tr>
              </thead>
              <tbody>
                {volunteerDetails.map((v) => (
                  <tr key={v.id} className="border-t border-white/5 hover:bg-white/4 transition">
                    <td className="px-3 py-2 text-[12px] font-medium">{v.name}</td>
                    {DAYS.map((d) => {
                      const slot = (v.availability ?? []).find((a: { day: string; slots: string[] }) => a.day === d);
                      const filled = slot ? slot.slots.length : 0;
                      const color = filled === 0 ? "transparent" : filled >= 3 ? "#34D399" : filled === 2 ? "#89CFF0" : "#F5EBD6";
                      return (
                        <td key={d} className="px-2 py-2 text-center">
                          <div className="w-6 h-6 mx-auto rounded flex items-center justify-center" style={{ background: filled === 0 ? "rgba(255,255,255,0.04)" : `${color}33`, border: filled === 0 ? "1px dashed rgba(255,255,255,0.08)" : `1px solid ${color}66` }}>
                            {filled > 0 && <span className="font-mono text-[9px]" style={{ color }}>{filled}</span>}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        {/* Find Available sidebar */}
        <aside className="rounded-2xl bg-white/5 border border-white/10 p-5 h-fit sticky top-4">
          <div className="flex items-center gap-2 mb-4">
            <Search size={14} className="text-[#89CFF0]" />
            <p className="font-medium text-[14px]">Find available volunteer</p>
          </div>
          <div className="space-y-3">
            <Field label="Date"><input type="date" className="w-full h-9 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12.5px]" defaultValue="2026-05-20" /></Field>
            <Field label="Time slot">
              <div className="flex gap-1.5">
                {["Morning", "Afternoon", "Evening"].map(s => <button key={s} className="flex-1 h-7 rounded-md bg-white/6 hover:bg-white/12 text-[11px] transition">{s}</button>)}
              </div>
            </Field>
            <Field label="Required skill">
              <select className="w-full h-9 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12.5px]">
                <option>Any</option>
                {allSkills.map(s => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Hitch type">
              <select className="w-full h-9 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12.5px]">
                <option>Any</option>
                <option>Bumper pull</option>
                <option>5th wheel</option>
                <option>Gooseneck</option>
              </select>
            </Field>
            <Field label="Min tow weight (lbs)"><input className="w-full h-9 rounded-md bg-white/6 border border-white/10 px-2.5 text-[12.5px]" defaultValue="8000" /></Field>
            <button className="w-full h-9 rounded-lg bg-[#89CFF0] hover:bg-[#7ab8d6] text-black text-[12.5px] font-medium transition mt-2">Search</button>
          </div>
        </aside>
      </div>

      {drawer && <VolunteerDrawer v={drawer} onClose={() => setDrawerId(null)} />}
    </CrmShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function VolunteerDrawer({ v, onClose }: { v: VolunteerDetail; onClose: () => void }) {
  const [tab, setTab] = useState<"profile" | "availability" | "deployments" | "credentials">("profile");
  const org = orgs.find(o => o.id === v.org);
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="relative ml-auto w-full max-w-md h-full bg-[#0F1E2B] border-l border-white/10 overflow-y-auto">
        <header className="sticky top-0 bg-[#0F1E2B]/90 backdrop-blur border-b border-white/10 px-5 py-3 flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs text-white/45">{v.id}</p>
            <p className="font-medium text-[14px] truncate">{v.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/8 rounded"><X size={14} /></button>
        </header>
        <div className="flex border-b border-white/10 px-2">
          {(["profile", "availability", "deployments", "credentials"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`relative h-10 px-3 text-[12px] font-medium transition capitalize ${tab === t ? "text-white" : "text-white/55"}`}>
              {t}
              {tab === t && <span className="absolute left-2 right-2 bottom-0 h-[2px] rounded-t bg-[#89CFF0]" />}
            </button>
          ))}
        </div>
        <div className="p-5 space-y-4">
          {tab === "profile" && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Hours" value={v.hours} />
                <Stat label="Missions" value={v.completedMissions} />
                <Stat label="Rating" value={v.rating} />
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-1.5">Org</p>
                <p className="text-[13px]" style={{ color: org?.color }}>{org?.name}</p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-1.5">Phone</p>
                <p className="font-mono text-[12.5px] text-white/85">{v.phone}</p>
              </div>
              <div>
                <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-1.5">Skills</p>
                <div className="flex flex-wrap gap-1">{(v.skills ?? []).map((s: string) => <span key={s} className="font-mono text-xs px-1.5 py-0.5 rounded bg-white/6 text-white/85">{s}</span>)}</div>
              </div>
              {v.towCapacity && (
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-1.5">Tow capacity</p>
                  <p className="text-[12.5px] text-white/85"><Truck size={11} className="inline mr-1" /> {v.towCapacity.maxWeight.toLocaleString()} lbs · {v.towCapacity.hitchTypes.join(", ").replace(/_/g, " ")}</p>
                </div>
              )}
            </>
          )}
          {tab === "availability" && (
            <div className="grid grid-cols-[60px_repeat(3,1fr)] gap-1 text-[11px]">
              <div />
              <div className="font-mono text-[9px] uppercase text-white/45 text-center">AM</div>
              <div className="font-mono text-[9px] uppercase text-white/45 text-center">PM</div>
              <div className="font-mono text-[9px] uppercase text-white/45 text-center">EVE</div>
              {DAYS.map(d => {
                const slot = (v.availability ?? []).find((a: { day: string; slots: string[] }) => a.day === d);
                return (
                  <Fragment key={d}>
                    <div className="font-mono text-xs text-white/55 py-1.5">{d}</div>
                    {(["morning", "afternoon", "evening"] as const).map(s => (
                      <div key={s} className={`h-7 rounded ${slot?.slots.includes(s) ? "bg-[#34D399]/25 border border-[#34D399]/50" : "bg-white/4 border border-white/8"}`} />
                    ))}
                  </Fragment>
                );
              })}
            </div>
          )}
          {tab === "deployments" && (
            <div className="space-y-2">
              {(v.deployments ?? []).map((d: { date: string; hours: number; role: string; mission: string }, i: number) => (
                <div key={i} className="rounded-lg bg-white/4 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs text-white/45">{d.date}</span>
                    <span className="font-mono text-xs text-white/55">{d.hours}h · {d.role}</span>
                  </div>
                  <p className="text-[12.5px] text-white/85">{d.mission}</p>
                </div>
              ))}
            </div>
          )}
          {tab === "credentials" && (
            <div className="space-y-2">
              {(v.credentials ?? []).map((c: { name: string; type: string; verified: boolean; expires?: string }, i: number) => {
                const expired = c.expires && new Date(c.expires) < new Date();
                return (
                  <div key={i} className="flex items-center gap-2.5 rounded-lg bg-white/4 p-3">
                    {expired ? <AlertCircle size={14} className="text-[#EF4E4B] shrink-0" /> : <CheckCircle2 size={14} className="text-[#34D399] shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium">{c.name}</p>
                      <p className="font-mono text-xs text-white/45 capitalize">{c.type} {c.expires && `· expires ${c.expires}`}</p>
                    </div>
                    {c.verified && <ShieldCheck size={12} className="text-[#34D399]" />}
                  </div>
                );
              })}
            </div>
          )}
          <Link href="/app/directory/volunteer" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#89CFF0]/15 hover:bg-[#89CFF0]/25 text-[#89CFF0] text-[12px] font-medium transition">
            Open full record
          </Link>
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg bg-white/4 p-2.5 text-center">
      <p className="font-mono text-[18px] tabular-nums">{value}</p>
      <p className="font-mono text-[9px] uppercase tracking-wider text-white/45 mt-0.5">{label}</p>
    </div>
  );
}
