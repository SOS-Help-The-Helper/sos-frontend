import { createFileRoute } from "@tanstack/react-router";
import { CitizenShell } from "@/components/citizen/CitizenShell";
import { myRequests } from "@/lib/prototype-data";
import { MessageSquare } from "lucide-react";

export const Route = createFileRoute("/c/manage")({
  head: () => ({ meta: [{ title: "SOS · My requests" }] }),
  component: CitizenManage,
});

function statusBadge(s: string) {
  if (s === "accepted") return "bg-[#89CFF0]/15 text-[#89CFF0]";
  if (s === "scheduled") return "bg-[#89CFF0]/15 text-[#89CFF0]";
  if (s === "completed") return "bg-[#34D399]/15 text-[#34D399]";
  return "bg-white/8 text-white/55";
}

function CitizenManage() {
  return (
    <CitizenShell title="My requests">
      <div className="px-4 pt-6 max-w-md mx-auto">
        <p className="font-mono text-[10px] uppercase tracking-wider text-white/45 mb-3">
          {myRequests.length} open requests
        </p>
        <div className="space-y-2">
          {myRequests.map((r) => (
            <div key={r.id} className="rounded-2xl bg-[var(--surface-1)] border border-[var(--hairline)] p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-white/45">{r.id}</span>
                <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full ${statusBadge(r.status)}`}>
                  {r.status}
                </span>
              </div>
              <p className="font-medium">{r.program}</p>
              <p className="text-[12px] text-white/55 mt-0.5">{r.org}</p>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/8">
                <span className="font-mono text-[10px] text-white/40">Updated {r.updated}</span>
                <button className="inline-flex items-center gap-1 text-[12px] text-[#89CFF0] hover:text-[#a8dcf2] transition">
                  <MessageSquare size={11} /> Message
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl bg-white/4 border border-dashed border-white/15 p-5 text-center">
          <p className="text-[13px] text-white/65">Need help with something else?</p>
          <p className="font-mono text-[10px] uppercase tracking-wider text-white/40 mt-1">Open Match to browse programs</p>
        </div>
      </div>
    </CitizenShell>
  );
}
