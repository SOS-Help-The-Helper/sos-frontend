'use client';

import { CrmShell } from "@/components/crm-shell";
import { ManageTabs, PageHeader } from "@/components/crm/manage-tabs";
import { shifts, orgs } from "@/lib/prototype-data";
import { Plus, Users } from "lucide-react";

const days = [
  { label: "Mon", date: "Mar 16" },
  { label: "Tue", date: "Mar 17" },
  { label: "Wed", date: "Mar 18" },
  { label: "Thu", date: "Mar 19" },
  { label: "Fri", date: "Mar 20" },
  { label: "Sat", date: "Mar 21" },
  { label: "Sun", date: "Mar 22" },
];

export default function CalendarPage() {
  return (
    <CrmShell module="Calendar">
      <ManageTabs />
      <PageHeader
        title="Calendar"
        subtitle="Week of Mar 16, 2026"
        actions={
          <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition">
            <Plus size={12} /> New shift
          </button>
        }
      />
      <div className="px-6 pt-6 pb-10">
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
