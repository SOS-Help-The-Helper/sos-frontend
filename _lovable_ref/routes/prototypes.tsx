import { createFileRoute, Link } from "@tanstack/react-router";
import { CrmShell } from "@/components/crm/CrmShell";
import { Map, Heart, Layers, Users, LayoutGrid, Package, Calendar, BarChart3, Settings, Sparkles, Smartphone, ArrowRight, Check, Circle, ExternalLink, Truck, HeartHandshake } from "lucide-react";

export const Route = createFileRoute("/prototypes")({
  head: () => ({ meta: [{ title: "Prototypes — SOS Connect" }] }),
  component: PrototypesHub,
});

type Status = "done" | "stub";
type Audience = "coord" | "citizen" | "shell" | "driver";

const protos: { id: string; title: string; path: string; audience: Audience; status: Status; blurb: string; icon: typeof Map }[] = [
  { id: "C0", title: "Onboarding", path: "/onboarding", audience: "coord", status: "done", blurb: "Org-type → modules → invite team", icon: Sparkles },
  { id: "C1", title: "Map", path: "/map", audience: "coord", status: "done", blurb: "NC counties, pins by taxonomy", icon: Map },
  { id: "C2", title: "Match", path: "/match", audience: "coord", status: "done", blurb: "Open requests ↔ candidate orgs", icon: Heart },
  { id: "C3", title: "Manage shell", path: "/manage", audience: "coord", status: "done", blurb: "Tabs spine over CRM back-office", icon: Layers },
  { id: "C3a", title: "— Directory", path: "/directory", audience: "coord", status: "done", blurb: "People, orgs, credentials", icon: Users },
  { id: "C3b", title: "— Cases (Kanban)", path: "/cases", audience: "coord", status: "done", blurb: "Triage → Open → In Progress → Closed", icon: LayoutGrid },
  { id: "C3c", title: "— SOS Umbrella viewer", path: "/cases/U-204", audience: "coord", status: "done", blurb: "3-pane: timeline · children · citizen", icon: Layers },
  { id: "C3d", title: "— Volunteers", path: "/volunteers", audience: "coord", status: "done", blurb: "Cards, filters, find-available, week grid", icon: HeartHandshake },
  { id: "C3d2", title: "— Transport", path: "/transport", audience: "coord", status: "done", blurb: "KPIs, active table, convoys, map view", icon: Truck },
  { id: "C3e", title: "— Inventory v2", path: "/inventory", audience: "coord", status: "done", blurb: "Facility-aware with asset event drawer", icon: Package },
  { id: "C3f", title: "— Calendar", path: "/calendar", audience: "coord", status: "done", blurb: "Week view + event cards", icon: Calendar },
  { id: "C3g", title: "— Reports", path: "/reports", audience: "coord", status: "done", blurb: "KPI tiles + simple charts", icon: BarChart3 },
  { id: "C4", title: "Command (large org)", path: "/command", audience: "coord", status: "done", blurb: "Multi-incident dashboard", icon: BarChart3 },
  { id: "C5", title: "Settings", path: "/settings", audience: "coord", status: "done", blurb: "Modules, profile, density", icon: Settings },
  { id: "C6", title: "Agent palette", path: "/map", audience: "shell", status: "done", blurb: "Press / anywhere — search + ask", icon: Sparkles },
  { id: "D1", title: "Driver page", path: "/drive/TA-002", audience: "driver", status: "done", blurb: "Mobile-first transport flow w/ status rail, photos, issues", icon: Truck },
  { id: "P1", title: "Citizen · Map", path: "/c", audience: "citizen", status: "done", blurb: "Find help near me", icon: Map },
  { id: "P2", title: "Citizen · Match", path: "/c/match", audience: "citizen", status: "done", blurb: "Swipe through programs", icon: Heart },
  { id: "P3", title: "Citizen · Manage", path: "/c/manage", audience: "citizen", status: "done", blurb: "My open requests + messages", icon: Smartphone },
];

function PrototypesHub() {
  const groups: { label: string; items: typeof protos }[] = [
    { label: "Coordinator (CRM)", items: protos.filter((p) => p.audience === "coord" || p.audience === "shell") },
    { label: "Driver", items: protos.filter((p) => p.audience === "driver") },
    { label: "Citizen portal", items: protos.filter((p) => p.audience === "citizen") },
  ];
  return (
    <CrmShell module="Prototypes">
      <div className="px-6 pt-10 pb-16 max-w-5xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45 mb-2">Review hub</p>
        <h1 className="text-[32px] font-semibold tracking-tight">Prototypes</h1>
        <p className="text-white/55 mt-2 max-w-xl">Every screen in the SOS Connect design system. Three verbs, two audiences, one cohesive shell.</p>

        {groups.map((g) => (
          <section key={g.label} className="mt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/40 mb-3">{g.label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {g.items.map((p) => (
                <Link
                  key={p.id}
                  to={p.path}
                  className="group rounded-2xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--hairline)] p-4 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#89CFF0]/12 text-[#89CFF0] flex items-center justify-center shrink-0">
                      <p.icon size={16} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[9px] uppercase tracking-wider text-white/40">{p.id}</span>
                        {p.status === "done" ? (
                          <Check size={10} className="text-[#34D399]" />
                        ) : (
                          <Circle size={10} className="text-white/30" />
                        )}
                      </div>
                      <p className="font-medium text-[14px] mt-0.5 truncate">{p.title}</p>
                      <p className="text-[12px] text-white/50 mt-0.5 line-clamp-2">{p.blurb}</p>
                      <p className="font-mono text-[10px] text-white/35 mt-2 flex items-center gap-1">
                        {p.path}
                        <ExternalLink size={9} className="opacity-0 group-hover:opacity-100 transition" />
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-white/25 group-hover:text-white/70 group-hover:translate-x-0.5 transition" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </CrmShell>
  );
}
