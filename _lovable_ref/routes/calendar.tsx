import { createFileRoute } from "@tanstack/react-router";
import { CrmShell } from "@/components/crm/CrmShell";
import { ManageTabs, PageHeader } from "@/components/crm/ManageTabs";
import { events as seedEvents, orgs } from "@/lib/prototype-data";
import { Plus, Users, X, Calendar as CalIcon, Clock, Building2, Trash2, Pencil, Check } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";
import { SideDrawer } from "@/components/crm/SideDrawer";

export const Route = createFileRoute("/calendar")({
  head: () => ({ meta: [{ title: "Calendar — SOS Connect" }] }),
  component: CalendarPage,
});

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

const days = [
  { label: "Mon", date: "Mar 16" },
  { label: "Tue", date: "Mar 17" },
  { label: "Wed", date: "Mar 18" },
  { label: "Thu", date: "Mar 19" },
  { label: "Fri", date: "Mar 20" },
  { label: "Sat", date: "Mar 21" },
  { label: "Sun", date: "Mar 22" },
];

function CalendarPage() {
  const [items, setItems] = useState<CalEvent[]>(seedEvents as CalEvent[]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string>(days[0].date);
  const isMobile = useIsMobile();

  const selected = useMemo(() => items.find((s) => s.id === selectedId) ?? null, [items, selectedId]);

  function openNew(date?: string) {
    setPrefillDate(date ?? null);
    setNewOpen(true);
  }

  function addEvent(s: Omit<CalEvent, "id" | "filled">) {
    const id = `E-${Math.floor(Math.random() * 9000 + 1000)}`;
    setItems((prev) => [...prev, { ...s, id, filled: 0 }]);
    setNewOpen(false);
    toast.success(`Added ${s.title} · ${s.date}`);
  }

  function removeEvent(id: string) {
    setItems((prev) => prev.filter((s) => s.id !== id));
    setSelectedId(null);
    toast.success("Removed");
  }

  return (
    <CrmShell module="Calendar">
      <ManageTabs />
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
        {isMobile ? (
          <MobileAgenda
            items={items}
            activeDay={activeDay}
            setActiveDay={setActiveDay}
            openEvent={setSelectedId}
            openNew={openNew}
          />
        ) : (
          <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden">
            <div className="grid grid-cols-7 border-b border-white/8">
              {days.map((d) => (
                <div key={d.label} className="p-3 text-center border-r border-white/5 last:border-r-0">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">{d.label}</p>
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
                          onClick={() => setSelectedId(s.id)}
                          className="w-full text-left rounded-lg p-2.5 border-l-2 bg-white/4 hover:bg-white/8 transition"
                          style={{ borderColor: org?.color }}
                        >
                          <p className="text-[12px] font-medium leading-tight">{s.title}</p>
                          <p className="font-mono text-[10px] text-white/55 mt-1">{s.time}</p>
                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-white/5">
                            <span className="font-mono text-[9px] flex items-center gap-1 text-white/55">
                              <Users size={9} /> {s.filled}/{s.slots}
                            </span>
                            {full ? (
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[#34D399]">full</span>
                            ) : (
                              <span className="font-mono text-[9px] uppercase tracking-wider text-[#EF4E4B]">need {s.slots - s.filled}</span>
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
          </div>
        )}
      </div>

      {selected && (
        <EventDrawer
          key={selected.id}
          event={selected}
          onClose={() => setSelectedId(null)}
          onRemove={() => removeEvent(selected.id)}
          onUpdate={(patch) => setItems((prev) => prev.map((s) => (s.id === selected.id ? { ...s, ...patch } : s)))}
        />
      )}
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

function MobileAgenda({
  items, activeDay, setActiveDay, openEvent, openNew,
}: {
  items: CalEvent[];
  activeDay: string;
  setActiveDay: (d: string) => void;
  openEvent: (id: string) => void;
  openNew: (date?: string) => void;
}) {
  const dayEvents = items.filter((s) => s.date === activeDay);
  return (
    <div className="space-y-4">
      {/* Week strip */}
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const active = d.date === activeDay;
          const count = items.filter((s) => s.date === d.date).length;
          return (
            <button
              key={d.label}
              onClick={() => setActiveDay(d.date)}
              className={`flex flex-col items-center justify-center py-2 rounded-xl transition ${
                active
                  ? "bg-[#89CFF0] text-[#0F1E2B]"
                  : "bg-[var(--surface-1)] border border-[var(--hairline)] text-white/65 hover:text-white"
              }`}
            >
              <span className={`font-mono text-[9.5px] uppercase tracking-wider ${active ? "text-[#0F1E2B]/70" : "text-white/45"}`}>
                {d.label[0]}
              </span>
              <span className="text-[15px] font-semibold tabular-nums mt-0.5">{d.date.split(" ")[1]}</span>
              <span className={`mt-1 w-1 h-1 rounded-full ${count > 0 ? (active ? "bg-[#0F1E2B]" : "bg-[#89CFF0]") : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>

      {/* Active day header */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/55">
          {activeDay} · {dayEvents.length} event{dayEvents.length === 1 ? "" : "s"}
        </p>
        <button
          onClick={() => openNew(activeDay)}
          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-white/6 hover:bg-white/12 text-[11.5px] transition"
        >
          <Plus size={11} /> Add
        </button>
      </div>

      {/* Agenda list */}
      {dayEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[var(--surface-1)] py-10 text-center">
          <CalIcon size={18} className="text-white/30 mx-auto mb-2" />
          <p className="text-[12.5px] text-white/55">No events scheduled.</p>
          <button
            onClick={() => openNew(activeDay)}
            className="mt-3 inline-flex items-center gap-1.5 h-8 px-3 rounded-md bg-white/8 hover:bg-white/14 text-[12px] transition"
          >
            <Plus size={11} /> New event
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {dayEvents.map((s) => {
            const org = orgs.find((o) => o.id === s.org);
            const full = s.filled >= s.slots;
            const pct = (s.filled / s.slots) * 100;
            return (
              <button
                key={s.id}
                onClick={() => openEvent(s.id)}
                className="w-full text-left rounded-xl bg-[var(--surface-1)] border border-[var(--hairline)] border-l-2 active:bg-white/4 transition px-3.5 py-3"
                style={{ borderLeftColor: org?.color }}
              >
                <div className="flex items-start justify-between gap-3 mb-1.5">
                  <p className="font-medium text-[14px] text-white leading-tight flex-1">{s.title}</p>
                  <span className="font-mono text-[10.5px] text-white/55 shrink-0">{s.time}</span>
                </div>
                {(org || s.location) && (
                  <p className="text-[11.5px] text-white/55 truncate mb-2">
                    {org?.name}{s.location ? ` · ${s.location}` : ""}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
                    <div className="h-full" style={{ width: `${pct}%`, background: full ? "#34D399" : "#89CFF0" }} />
                  </div>
                  <span className={`font-mono text-[10px] tabular-nums shrink-0 ${full ? "text-[#34D399]" : "text-white/65"}`}>
                    {s.filled}/{s.slots}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
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
    <SideDrawer onClose={onClose}>
        <header className="sticky top-0 glass border-b border-[var(--hairline)] px-5 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="font-mono text-[10px] text-white/45">{event.id}</p>
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
              <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium bg-white/6 text-white/85">
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
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-2">Volunteers</p>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[12.5px] text-white/85">{event.filled} of {event.slots} filled</span>
              <span className="font-mono text-[10.5px] tabular-nums text-white/55">{Math.round(pct)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
              <div className="h-full" style={{ width: `${pct}%`, background: pct >= 100 ? "#34D399" : "#89CFF0" }} />
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
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Location</p>
              <p className="text-[13px] text-white/85">{event.location}</p>
            </div>
          )}
          {event.notes && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">Notes</p>
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
      </SideDrawer>
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
    <SideDrawer onClose={onClose}>
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
      </SideDrawer>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-1.5">{label}</p>
      {children}
    </div>
  );
}
