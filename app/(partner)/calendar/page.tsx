'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from "react";
import { CrmShell } from "@/components/crm-shell";
import { ManageTabs, PageHeader } from "@/components/crm/manage-tabs";
import { events as protoShifts, orgs } from "@/lib/prototype-data";
import { Plus, Users } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthContext } from "@/lib/auth-context";

type Shift = {
  id: string;
  title: string;
  date: string; // "Mar 18"
  time: string;
  slots: number;
  filled: number;
  org: string;
};

function getWeekBounds(): { weekStart: string; weekEnd: string; days: { label: string; date: string; iso: string }[] } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const label = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i];
    const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const iso = d.toISOString().slice(0, 10);
    return { label, date, iso };
  });
  return { weekStart: days[0].iso, weekEnd: days[6].iso, days };
}

function mapEventsToShifts(data: unknown): Shift[] {
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((e, i) => {
    const startIso = String(e.start_time ?? e.starts_at ?? e.date ?? "");
    let date = "";
    if (startIso) {
      const d = new Date(startIso);
      if (!isNaN(d.getTime())) {
        date = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
    }
    const endIso = String(e.end_time ?? e.ends_at ?? "");
    let timeStr = String(e.time ?? "");
    if (!timeStr && startIso && endIso) {
      const fmt = (s: string) => {
        const d = new Date(s);
        return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).replace(":00", "").toLowerCase().replace(" ", "");
      };
      timeStr = `${fmt(startIso)}–${fmt(endIso)}`;
    }
    return {
      id: String(e.id ?? e.event_id ?? `EV-${i + 1}`),
      title: String(e.title ?? e.name ?? e.event_type ?? "Event"),
      date,
      time: timeStr,
      slots: Number(e.slots ?? e.capacity ?? e.max_volunteers ?? 0),
      filled: Number(e.filled ?? e.registered ?? e.volunteer_count ?? 0),
      org: String(e.org_id ?? e.org ?? ""),
    };
  });
}

const { weekStart, weekEnd, days: WEEK_DAYS } = getWeekBounds();
const WEEK_LABEL = `Week of ${WEEK_DAYS[0].date}, ${new Date(weekStart).getFullYear()}`;

export default function CalendarPage() {
  const { orgId } = useAuthContext();
  const [shifts, setShifts] = useState<Shift[]>(protoShifts);

  useEffect(() => {
    if (!orgId) return;
    api.crmEventsList(orgId, { from: weekStart, to: weekEnd })
      .then((res) => {
        const raw = (res as Record<string, unknown>)?.data ?? res;
        const items = mapEventsToShifts(Array.isArray(raw) ? raw : []);
        if (items.length) setShifts(items);
      })
      .catch(() => {
        // fallback to prototype data already set
      });
  }, [orgId]);

  return (
    <CrmShell module="Calendar">
      <ManageTabs />
      <PageHeader
        title="Calendar"
        subtitle={WEEK_LABEL}
        actions={
          <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition">
            <Plus size={12} /> New shift
          </button>
        }
      />
      <div className="px-6 pt-6 pb-10">
        <div className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] overflow-hidden">
          <div className="grid grid-cols-7 border-b border-white/8">
            {WEEK_DAYS.map((d) => (
              <div key={d.label} className="p-3 text-center border-r border-white/5 last:border-r-0">
                <p className="font-mono text-[10px] uppercase tracking-wider text-white/45">{d.label}</p>
                <p className="text-[15px] font-semibold mt-0.5">{d.date.split(" ")[1]}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 min-h-[340px]">
            {WEEK_DAYS.map((d) => {
              const dayShifts = shifts.filter((s) => s.date === d.date);
              return (
                <div key={d.label} className="p-2 border-r border-white/5 last:border-r-0 space-y-2">
                  {dayShifts.map((s) => {
                    const org = orgs.find((o) => o.id === s.org);
                    const full = s.filled >= s.slots;
                    return (
                      <div key={s.id} className="rounded-lg p-2.5 border-l-2 bg-white/4 hover:bg-white/8 transition cursor-pointer" style={{ borderColor: org?.color }}>
                        <p className="text-[12px] font-medium leading-tight">{s.title}</p>
                        <p className="font-mono text-[10px] text-white/55 mt-1">{s.time}</p>
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
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </CrmShell>
  );
}
