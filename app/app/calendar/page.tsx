'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from "react";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
// orgs not needed — calendar uses orgId from auth context
const orgs: Array<{ id: string; color?: string }> = [];
import { Plus, Users, X, Calendar as CalIcon, Clock, Building2, Trash2, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";

type CalEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  slots: number;
  filled: number;
  org: string;
  notes?: string;
  location?: string;
};

const today = new Date();
const days = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(today);
  d.setDate(today.getDate() - today.getDay() + 1 + i); // Mon–Sun
  return {
    label: d.toLocaleDateString('en', { weekday: 'short' }),
    date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }),
  };
});

export default function CalendarPage() {
  const { orgId } = useAuthContext();
  const [items, setItems] = useState<CalEvent[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(() => {
    const d = new Date().getDay();
    return d === 0 ? 6 : d - 1; // Mon=0 … Sun=6
  });

  const editingEvent = useMemo(() => items.find((s) => s.id === editingId) ?? null, [items, editingId]);

  useEffect(() => {
    // admin: proceed without org filter
    api.crmEventsList(orgId || '').then((res) => {
      const data = (res as { events?: unknown[] }).events;
      if (Array.isArray(data) && data.length > 0) {
        setItems(data as CalEvent[]);
      }
    }).catch(() => toast.error("Failed to load events"));
  }, [orgId]);

  function openNew(date?: string) {
    setPrefillDate(date ?? null);
    setNewOpen(true);
  }

  async function addEvent(s: Omit<CalEvent, "id" | "filled">) {
    const optimisticId = `E-${Math.floor(Math.random() * 9000 + 1000)}`;
    const optimistic: CalEvent = { ...s, id: optimisticId, filled: 0 };
    setItems((prev) => [...prev, optimistic]);
    setNewOpen(false);
    toast.success(`Added ${s.title} · ${s.date}`);
    if (orgId) {
      try {
        const res = await api.crmEventsCreate(orgId, {
          title: s.title,
          date: s.date,
          time: s.time,
          slots: s.slots,
          location: s.location,
          notes: s.notes,
        });
        const created = (res as { event?: CalEvent }).event;
        if (created?.id) {
          setItems((prev) => prev.map((e) => e.id === optimisticId ? { ...e, id: created.id } : e));
        }
      } catch {
        setItems(prev => prev.filter(e => e.id !== optimisticId));
        toast.error("Failed to create event");
      }
    }
  }

  async function removeEvent(id: string) {
    setItems((prev) => prev.filter((s) => s.id !== id));
    toast.success("Removed");
    try {
      await api.crmEventsDelete(id);
    } catch {
      toast.error("Failed to delete event on server");
    }
  }

  async function updateEvent(id: string, patch: Partial<CalEvent>) {
    setItems((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    try {
      await api.crmEventsUpdate(id, patch as Record<string, unknown>);
    } catch {
      toast.error("Failed to save changes on server");
    }
  }

  return (
    <CrmShell module="Calendar">
      <PageHeader
        title="Calendar"
        subtitle="Shifts, call-ups, and events."
        actions={
          <button
            onClick={() => openNew()}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition"
          >
            <Plus size={12} /> New event
          </button>
        }
      />
      <div className="px-4 pt-4 pb-4">
        {/* Mobile: day-picker + single-day column */}
        <div className="md:hidden space-y-3">
          <div className="flex gap-1 overflow-x-auto pb-2">
            {days.map((d, i) => (
              <button
                key={i}
                onClick={() => setActiveDay(i)}
                className={`shrink-0 flex flex-col items-center px-3 py-1.5 rounded-lg text-xs transition
                  ${activeDay === i ? 'bg-white text-[#0F1E2B]' : 'bg-white/5 text-white/60'}`}
              >
                <span>{d.label}</span>
                <span className="font-medium">{d.date.split(' ')[1]}</span>
              </button>
            ))}
          </div>
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden">
            {(() => {
              const d = days[activeDay];
              const dayEvents = items.filter((s) => s.date === d.date);
              return (
                <>
                  <div className="p-3 text-center border-b border-white/8">
                    <p className="font-mono text-xs uppercase tracking-wider text-white/45">{d.label}</p>
                    <p className="text-[15px] font-semibold mt-0.5">{d.date}</p>
                  </div>
                  <div className="group/day p-2 space-y-2 relative min-h-[340px]">
                    {dayEvents.map((s) => {
                      const org = orgs.find((o) => o.id === s.org);
                      const full = s.filled >= s.slots;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                          className="w-full text-left rounded-lg p-2.5 border-l-2 bg-white/4 hover:bg-white/8 transition"
                          style={{ borderColor: org?.color }}
                        >
                          <p className="text-[12px] font-medium leading-tight">{s.title}</p>
                          <p className="font-mono text-xs text-white/55 mt-1">{s.time}</p>
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                            <span className="font-mono text-[9px] flex items-center gap-1 text-white/55">
                              <Users size={9} /> {s.filled}/{s.slots}
                            </span>
                            {full ? (
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[#34D399]">full</span>
                            ) : (
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[#F5EBD6]">need {s.slots - s.filled}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                    <button
                      onClick={() => openNew(d.date)}
                      className="w-full h-7 rounded-md border border-dashed border-white/10 hover:border-white/25 hover:bg-white/4 text-white/35 hover:text-white/70 transition flex items-center justify-center gap-1 text-[11px]"
                    >
                      <Plus size={11} /> Add
                    </button>
                  </div>
                </>
              );
            })()}
            {editingId && editingEvent && (
              <div className="border-t border-white/8 px-4 py-4">
                <InlineEventEdit
                  key={editingId}
                  event={editingEvent}
                  onClose={() => setEditingId(null)}
                  onSave={async (patch) => {
                    await updateEvent(editingId, patch);
                    toast.success("Event updated");
                    setEditingId(null);
                  }}
                  onDelete={async () => {
                    await removeEvent(editingId);
                    setEditingId(null);
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Desktop: full 7-column week grid */}
        <div className="hidden md:block rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden">
          <div className="grid grid-cols-7 border-b border-white/8">
            {days.map((d) => (
              <div key={d.label} className="p-3 text-center border-r border-white/5 last:border-r-0">
                <p className="font-mono text-xs uppercase tracking-wider text-white/45">{d.label}</p>
                <p className="text-[15px] font-semibold mt-0.5">{d.date.split(" ")[1]}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[340px]">
            {days.map((d) => {
              const dayEvents = items.filter((s) => s.date === d.date);
              return (
                <div
                  key={d.label}
                  className="group/day p-2 border-r border-white/5 last:border-r-0 space-y-2 relative"
                >
                  {dayEvents.map((s) => {
                    const org = orgs.find((o) => o.id === s.org);
                    const full = s.filled >= s.slots;
                    return (
                      <button
                        key={s.id}
                        onClick={() => setEditingId(editingId === s.id ? null : s.id)}
                        className="w-full text-left rounded-lg p-2.5 border-l-2 bg-white/4 hover:bg-white/8 transition"
                        style={{ borderColor: org?.color }}
                      >
                        <p className="text-[12px] font-medium leading-tight">{s.title}</p>
                        <p className="font-mono text-xs text-white/55 mt-1">{s.time}</p>
                        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                          <span className="font-mono text-[9px] flex items-center gap-1 text-white/55">
                            <Users size={9} /> {s.filled}/{s.slots}
                          </span>
                          {full ? (
                            <span className="font-mono text-[9px] uppercase tracking-wider text-[#34D399]">full</span>
                          ) : (
                            <span className="font-mono text-[9px] uppercase tracking-wider text-[#F5EBD6]">need {s.slots - s.filled}</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  <button
                    onClick={() => openNew(d.date)}
                    className="w-full h-7 rounded-md border border-dashed border-white/10 hover:border-white/25 hover:bg-white/4 text-white/35 hover:text-white/70 transition flex items-center justify-center gap-1 text-[11px] opacity-0 group-hover/day:opacity-100"
                  >
                    <Plus size={11} /> Add
                  </button>
                </div>
              );
            })}
          </div>
          {editingId && editingEvent && (
            <div className="border-t border-white/8 px-4 py-4">
              <InlineEventEdit
                key={editingId}
                event={editingEvent}
                onClose={() => setEditingId(null)}
                onSave={async (patch) => {
                  await updateEvent(editingId, patch);
                  toast.success("Event updated");
                  setEditingId(null);
                }}
                onDelete={async () => {
                  await removeEvent(editingId);
                  setEditingId(null);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {newOpen && (
        <EventFormDrawer
          mode="new"
          defaultDate={prefillDate ?? days[0].date}
          onClose={() => setNewOpen(false)}
          onSave={addEvent}
        />
      )}
    </CrmShell>
  );
}

function EventDrawer({ event, onClose, onRemove, onUpdate }: { event: CalEvent; onClose: () => void; onRemove: () => void; onUpdate: (p: Partial<CalEvent>) => void }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <EventFormDrawer
        mode="edit"
        defaultDate={event.date}
        initial={event}
        onClose={() => setEditing(false)}
        onSave={(patch) => {
          onUpdate(patch);
          setEditing(false);
          toast.success("Updated");
        }}
      />
    );
  }

  const org = orgs.find((o) => o.id === event.org);
  const pct = (event.filled / event.slots) * 100;
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="relative ml-auto w-full max-w-md h-full bg-[var(--surface-1)] border-l border-[var(--hairline)] overflow-y-auto">
        <header className="sticky top-0 glass border-b border-[var(--hairline)] px-5 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-xs text-white/45">{event.id}</p>
            <p className="font-medium text-[14px] truncate">{event.title}</p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-md bg-white/6 hover:bg-white/12 text-[11px] transition"
            >
              <Pencil size={11} /> Edit
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-white/8 rounded"><X size={14} /></button>
          </div>
        </header>
        <div className="p-5 space-y-5">
          <div className="flex items-center gap-2 flex-wrap">
            {org && (
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium" style={{ background: `${org.color}1A`, color: org.color }}>
                <Building2 size={11} /> {org.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/6 text-[11px] text-white/75">
              <CalIcon size={11} /> {event.date}
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-white/6 text-[11px] text-white/75">
              <Clock size={11} /> {event.time}
            </span>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-2">Volunteers</p>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12.5px] text-white/85">{event.filled} of {event.slots} filled</span>
              <span className="font-mono text-[10.5px] tabular-nums text-white/55">{Math.round(pct)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
              <div className="h-full" style={{ width: `${pct}%`, background: pct >= 100 ? "#34D399" : "#F5EBD6" }} />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onUpdate({ filled: Math.max(0, event.filled - 1) })}
                className="h-7 w-7 rounded-md bg-white/6 hover:bg-white/12 text-[13px] transition"
              >−</button>
              <button
                onClick={() => onUpdate({ filled: Math.min(event.slots, event.filled + 1) })}
                className="h-7 w-7 rounded-md bg-white/6 hover:bg-white/12 text-[13px] transition"
              >+</button>
              <button
                onClick={() => onUpdate({ slots: event.slots + 1 })}
                className="h-7 px-2.5 rounded-md bg-white/6 hover:bg-white/12 text-[11px] transition"
              >+ slot</button>
            </div>
          </div>

          {event.location && (
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-1.5">Location</p>
              <p className="text-[13px] text-white/85">{event.location}</p>
            </div>
          )}
          {event.notes && (
            <div>
              <p className="font-mono text-xs uppercase tracking-wider text-white/45 mb-1.5">Notes</p>
              <p className="text-[13px] text-white/85 whitespace-pre-line">{event.notes}</p>
            </div>
          )}

          <button
            onClick={onRemove}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B]/15 hover:bg-[#EF4E4B]/25 text-[#EF4E4B] text-[12px] font-medium transition"
          >
            <Trash2 size={12} /> Remove event
          </button>
        </div>
      </aside>
    </div>
  );
}

function EventFormDrawer({
  mode,
  defaultDate,
  initial,
  onClose,
  onSave,
}: {
  mode: "new" | "edit";
  defaultDate: string;
  initial?: CalEvent;
  onClose: () => void;
  onSave: (s: Omit<CalEvent, "id" | "filled">) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [date, setDate] = useState(initial?.date ?? defaultDate);
  const [time, setTime] = useState(initial?.time ?? "9a–1p");
  const [slots, setSlots] = useState(initial?.slots ?? 3);
  const [org, setOrg] = useState(initial?.org ?? orgs[0].id);
  const [location, setLocation] = useState(initial?.location ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  useEffect(() => {
    if (initial) return;
    setDate(defaultDate);
  }, [defaultDate, initial]);

  function submit() {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    onSave({ title: title.trim(), date, time, slots, org, location: location.trim() || undefined, notes: notes.trim() || undefined });
  }

  const isEdit = mode === "edit";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <aside className="relative ml-auto w-full max-w-md h-full bg-[var(--surface-1)] border-l border-[var(--hairline)] overflow-y-auto">
        <header className="sticky top-0 glass border-b border-[var(--hairline)] px-5 py-3 flex items-center justify-between">
          <p className="font-medium text-[14px]">{isEdit ? "Edit event" : "New event"}</p>
          <button onClick={onClose} className="p-1.5 hover:bg-white/8 rounded"><X size={14} /></button>
        </header>
        <div className="p-5 space-y-4">
          <Field label="Title">
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Hot meals service"
              className="w-full h-9 rounded-md bg-white/6 border border-white/8 focus:border-[#89CFF0] focus:outline-none px-3 text-[13px]"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <select
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-9 rounded-md bg-white/6 border border-white/8 px-2 text-[13px] focus:outline-none focus:border-[#89CFF0]"
              >
                {days.map((d) => <option key={d.date} value={d.date}>{d.label} · {d.date}</option>)}
              </select>
            </Field>
            <Field label="Time">
              <input
                value={time}
                onChange={(e) => setTime(e.target.value)}
                placeholder="9a–1p"
                className="w-full h-9 rounded-md bg-white/6 border border-white/8 focus:border-[#89CFF0] focus:outline-none px-3 text-[13px]"
              />
            </Field>
          </div>

          <Field label="Organization">
            <div className="space-y-1.5">
              {orgs.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setOrg(o.id)}
                  className={`w-full flex items-center gap-2 px-3 h-9 rounded-md border text-left text-[12.5px] transition ${org === o.id ? "border-[#89CFF0] bg-white/6" : "border-white/8 bg-white/3 hover:bg-white/6"}`}
                >
                  <span className="w-2 h-2 rounded-full" style={{ background: o.color }} />
                  <span className="flex-1 truncate">{o.name}</span>
                  {org === o.id && <span className="font-mono text-[9.5px] uppercase tracking-wider text-[#89CFF0]">selected</span>}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Slots">
            <div className="flex items-center gap-2">
              <button onClick={() => setSlots(Math.max(1, slots - 1))} className="h-9 w-9 rounded-md bg-white/6 hover:bg-white/12">−</button>
              <span className="font-mono text-[15px] tabular-nums w-8 text-center">{slots}</span>
              <button onClick={() => setSlots(slots + 1)} className="h-9 w-9 rounded-md bg-white/6 hover:bg-white/12">+</button>
            </div>
          </Field>

          <Field label="Location (optional)">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Hickory hub"
              className="w-full h-9 rounded-md bg-white/6 border border-white/8 focus:border-[#89CFF0] focus:outline-none px-3 text-[13px]"
            />
          </Field>

          <Field label="Notes (optional)">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-md bg-white/6 border border-white/8 focus:border-[#89CFF0] focus:outline-none px-3 py-2 text-[13px] resize-none"
            />
          </Field>

          <div className="flex gap-2 pt-2">
            <button
              onClick={submit}
              className="flex-1 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12.5px] font-medium transition"
            >
              {isEdit ? <><Check size={12} /> Save changes</> : <><Plus size={12} /> Create event</>}
            </button>
            <button onClick={onClose} className="h-9 px-3 rounded-lg bg-white/6 hover:bg-white/12 text-[12.5px] transition">Cancel</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function InlineEventEdit({
  event,
  onClose,
  onSave,
  onDelete,
}: {
  event: CalEvent;
  onClose: () => void;
  onSave: (patch: { title: string; date: string; time: string }) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [title, setTitle] = useState(event.title);
  const [date, setDate] = useState(event.date);
  const [time, setTime] = useState(event.time);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    await onSave({ title: title.trim(), date, time });
    setSaving(false);
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    await onDelete();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-wider text-white/45">Edit event</p>
        <button onClick={onClose} className="p-1 hover:bg-white/8 rounded"><X size={12} /></button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          className="w-full h-8 rounded-md bg-white/6 border border-white/8 focus:border-[#89CFF0] focus:outline-none px-3 text-[12.5px]"
        />
        <div className="grid grid-cols-2 gap-2">
          <select
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-8 rounded-md bg-white/6 border border-white/8 px-2 text-[12.5px] focus:outline-none focus:border-[#89CFF0]"
          >
            {days.map((d) => <option key={d.date} value={d.date}>{d.label} · {d.date}</option>)}
          </select>
          <input
            value={time}
            onChange={(e) => setTime(e.target.value)}
            placeholder="9a–1p"
            className="w-full h-8 rounded-md bg-white/6 border border-white/8 focus:border-[#89CFF0] focus:outline-none px-3 text-[12.5px]"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 inline-flex items-center justify-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] disabled:opacity-50 text-[12px] font-medium transition"
        >
          <Check size={11} /> {saving ? "Saving…" : "Save"}
        </button>
        <button
          onClick={handleDelete}
          className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B]/15 hover:bg-[#EF4E4B]/25 text-[#EF4E4B] text-[12px] font-medium transition"
        >
          <Trash2 size={11} /> Delete
        </button>
        <button onClick={onClose} className="h-8 px-3 rounded-lg bg-white/6 hover:bg-white/12 text-[12px] transition">Cancel</button>
      </div>
    </div>
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
