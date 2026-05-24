"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CrmShell } from "@/components/crm-shell";
import { PageHeader } from "@/components/crm/manage-tabs";
import { incidents as prototypeIncidents, type Incident, reports as reportsData } from "@/lib/prototype-data";
import { useAllDashboards } from "@/lib/dashboard-store";
import { AlertTriangle, Radio, ChevronRight, FileText } from "lucide-react";
import { api } from "@/lib/api";

export default function CommandPage() {
  const pinnedMap = useAllDashboards();
  const [incidents, setIncidents] = useState<Incident[]>(prototypeIncidents);

  useEffect(() => {
    api.crmCommandIncidents()
      .then((res: unknown) => {
        const data = res as { incidents?: Incident[] };
        if (Array.isArray(data?.incidents) && data.incidents.length > 0) {
          setIncidents(data.incidents);
        }
      })
      .catch(() => {/* fallback to prototype data */});
  }, []);

  return (
    <CrmShell module="Command">
      <PageHeader
        title="Command"
        subtitle="One dashboard per active disaster."
        actions={
          <button className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#EF4E4B] hover:bg-[#d94340] text-[12px] font-medium transition">
            <Radio size={12} /> Declare incident
          </button>
        }
      />
      <div className="px-4 pt-4 pb-4">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {incidents.map((i) => {
            const pinnedIds = pinnedMap[i.id] ?? [];
            const pinned = pinnedIds
              .map((id) => reportsData.find((r) => r.id === id))
              .filter(Boolean)
              .slice(0, 3);
            const isUrgent = i.priority === "urgent";
            return (
              <Link
                key={i.id}
                href={`/app/command/${i.id}`}
                className="group rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] hover:border-white/20 p-5 transition flex flex-col gap-4"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isUrgent
                        ? "bg-[#EF4E4B]/15 text-[#EF4E4B]"
                        : "bg-[#F5EBD6]/15 text-[#F5EBD6]"
                    }`}
                  >
                    <AlertTriangle size={16} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{i.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-white/50 mt-0.5">
                      {i.id} · {i.county} · {i.status}
                    </p>
                  </div>
                  <ChevronRight
                    size={14}
                    className="text-white/30 group-hover:text-white/70 transition"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Stat label="Cases" value={i.cases} />
                  <Stat label="Reports" value={pinnedIds.length} />
                  <Stat label="Lead" value={i.lead.split(" ")[0]} small />
                </div>

                <div className="pt-3 border-t border-white/8 min-h-[60px]">
                  <p className="font-mono text-[9.5px] uppercase tracking-wider text-white/40 mb-2">
                    Pinned reports
                  </p>
                  {pinned.length === 0 ? (
                    <p className="text-[11.5px] text-white/35 italic">
                      None yet — pin from /reports
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {pinned.map(
                        (r) =>
                          r && (
                            <li
                              key={r.id}
                              className="flex items-center gap-2 text-[11.5px] text-white/75"
                            >
                              <FileText size={10} className="text-white/40 shrink-0" />
                              <span className="truncate">
                                {r.taxonomy} · {r.location}
                              </span>
                            </li>
                          )
                      )}
                    </ul>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </CrmShell>
  );
}

function Stat({
  label,
  value,
  small,
}: {
  label: string;
  value: string | number;
  small?: boolean;
}) {
  return (
    <div className="rounded-lg bg-white/4 px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-wider text-white/45">{label}</p>
      <p
        className={`${
          small ? "text-[13px]" : "text-[18px]"
        } font-semibold tabular-nums mt-0.5 truncate`}
      >
        {value}
      </p>
    </div>
  );
}
