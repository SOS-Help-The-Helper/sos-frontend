'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users, LayoutGrid, Map, Package, Calendar, BarChart3, Radio,
  Sparkles, Settings, ChevronsLeft, ChevronsRight, ChevronDown, Truck,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";

type NavItem = { href: string; icon: typeof Map; label: string; matchPrefix: string };
type NavGroup = { id: string; label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    id: "crm",
    label: "CRM",
    items: [
      { href: "/directory", icon: Users, label: "Directory", matchPrefix: "/directory" },
      { href: "/cases", icon: LayoutGrid, label: "Cases", matchPrefix: "/cases" },
      { href: "/map", icon: Map, label: "Map", matchPrefix: "/map" },
    ],
  },
  {
    id: "ops",
    label: "Ops",
    items: [
      { href: "/transport", icon: Truck, label: "Transport", matchPrefix: "/transport" },
      { href: "/inventory", icon: Package, label: "Inventory", matchPrefix: "/inventory" },
      { href: "/calendar", icon: Calendar, label: "Calendar", matchPrefix: "/calendar" },
    ],
  },
  {
    id: "insights",
    label: "Insights",
    items: [
      { href: "/reports", icon: BarChart3, label: "Reports", matchPrefix: "/reports" },
      { href: "/command", icon: Radio, label: "Command", matchPrefix: "/command" },
    ],
  },
];

interface CrmShellProps {
  children: ReactNode;
  module?: string;
  user: { name: string; org: string };
}

export function CrmShell({ children, module = "Directory", user }: CrmShellProps) {
  const [expanded, setExpanded] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ crm: true, ops: true, insights: true });
  const path = usePathname();
  const sidebarW = expanded ? 220 : 56;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "/" || ((e.metaKey || e.ctrlKey) && e.key === "k")) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const initials = user.name
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen text-white" style={{ background: "var(--background)" }}>
      {/* Sidebar */}
      <aside
        className="hidden md:flex fixed left-0 top-0 bottom-0 flex-col z-40 transition-[width] duration-200"
        style={{
          width: sidebarW,
          background: "var(--background)",
          borderRight: "1px solid var(--hairline)",
        }}
      >
        <div
          className="h-14 flex items-center px-3 shrink-0"
          style={{ borderBottom: "1px solid var(--hairline)" }}
        >
          <Link href="/" className="flex items-center hover:opacity-90 transition">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logomark.svg" alt="SOS" width={24} height={24} />
          </Link>
        </div>

        {/* Agent launcher — primary, always visible */}
        <div className="p-2" style={{ borderBottom: "1px solid var(--hairline)" }}>
          <button
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center gap-2.5 h-9 rounded-lg px-2.5 bg-gradient-to-r from-[#EF4E4B]/15 to-[#89CFF0]/15 hover:from-[#EF4E4B]/22 hover:to-[#89CFF0]/22 transition group"
            title={!expanded ? "Ask SOS" : undefined}
          >
            <Sparkles size={14} className="text-[#89CFF0] shrink-0" />
            {expanded && (
              <span className="flex-1 text-left text-[12px] font-medium text-white/85 group-hover:text-white">Ask SOS</span>
            )}
          </button>
        </div>

        <nav className="flex-1 px-2 pt-3 pb-2 overflow-y-auto scrollbar-hide">
          {groups.map((g) => {
            const open = openGroups[g.id];
            const anyActive = g.items.some((it) => path.startsWith(it.matchPrefix));
            return (
              <div key={g.id} className="mb-3">
                {expanded ? (
                  <button
                    onClick={() => setOpenGroups((s) => ({ ...s, [g.id]: !s[g.id] }))}
                    className="w-full flex items-center justify-between px-2.5 py-1 text-white/40 hover:text-white/70 transition group"
                  >
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.16em] font-medium">{g.label}</span>
                    <ChevronDown size={11} className={`transition-transform ${open ? "" : "-rotate-90"} ${anyActive ? "text-[#89CFF0]" : ""}`} />
                  </button>
                ) : (
                  <div className="h-px mx-2 mb-1.5" style={{ background: "rgba(255,255,255,0.08)" }} />
                )}
                {(open || !expanded) && (
                  <div className="mt-0.5 space-y-px">
                    {g.items.map((it) => {
                      const active = path.startsWith(it.matchPrefix);
                      return (
                        <Link
                          key={it.label}
                          href={it.href}
                          className={`group relative flex items-center gap-2.5 h-8 rounded-md px-2.5 text-[12.5px] font-medium border transition ${
                            active
                              ? "bg-white/8 text-white border-[#EF4E4B]/35"
                              : "text-white/65 hover:text-white hover:bg-white/[0.04] border-[#EF4E4B]/12 hover:border-[#EF4E4B]/25"
                          }`}
                          title={!expanded ? it.label : undefined}
                        >
                          {active && <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-r-full bg-[#89CFF0]" />}
                          <it.icon size={15} strokeWidth={1.75} className="shrink-0" />
                          {expanded && <span className="flex-1 truncate whitespace-nowrap">{it.label}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-2" style={{ borderTop: "1px solid var(--hairline)" }}>
          <Link
            href="/settings"
            className="flex items-center gap-2.5 h-8 rounded-md px-2.5 text-[12.5px] text-white/65 hover:text-white hover:bg-white/[0.04] transition"
            title={!expanded ? "Settings" : undefined}
          >
            <Settings size={14} strokeWidth={1.75} />
            {expanded && <span>Settings</span>}
          </Link>
          <div className="flex items-center gap-2.5 h-11 px-1.5 mt-1.5 pt-2 border-t border-white/5">
            <div className="w-7 h-7 rounded-full bg-[#EF4E4B] flex items-center justify-center text-[11px] font-semibold shrink-0">
              {initials}
            </div>
            {expanded && (
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-medium truncate">{user.name}</p>
                <p className="text-[10px] text-white/45 truncate">{user.org}</p>
              </div>
            )}
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center justify-center w-full h-6 rounded-md text-white/35 hover:text-white hover:bg-white/[0.04] transition"
            title={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronsLeft size={13} /> : <ChevronsRight size={13} />}
          </button>
        </div>
      </aside>

      <div
        className="pb-20 md:pb-0 transition-[padding] duration-200"
        style={{ ["--sidebar-w" as string]: `${sidebarW}px` }}
      >
        <div className="md:pl-[var(--sidebar-w)] transition-[padding] duration-200">
          <div className="min-h-screen" style={{ background: "var(--surface-app)" }}>{children}</div>
        </div>
      </div>

      <MobileBottomNav onOpenAgent={() => setPaletteOpen(true)} />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} module={module} />
    </div>
  );
}

function MobileBottomNav({ onOpenAgent }: { onOpenAgent: () => void }) {
  const path = usePathname();
  const items = [
    { icon: Users, label: "Directory", href: "/directory" as const, match: "/directory", onClick: null as null | (() => void) },
    { icon: LayoutGrid, label: "Cases", href: "/cases" as const, match: "/cases", onClick: null },
    { icon: Map, label: "Map", href: "/map" as const, match: "/map", onClick: null },
    { icon: Sparkles, label: "SOS", href: null as null | string, match: "__agent", onClick: onOpenAgent },
  ];
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 glass flex justify-around pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-40"
      style={{ borderTop: "1px solid var(--hairline)" }}
    >
      {items.map((it, i) => {
        const active = it.match !== "__agent" && path.startsWith(it.match);
        const cls = `flex flex-col items-center gap-1 px-3 py-1 transition ${active ? "text-[#89CFF0]" : "text-white/55"}`;
        const inner = (
          <>
            <it.icon size={20} strokeWidth={1.75} />
            <span className="font-mono text-[9px] uppercase tracking-wider font-medium">{it.label}</span>
          </>
        );
        if (it.onClick) return <button key={i} onClick={it.onClick} className={cls}>{inner}</button>;
        return <Link key={i} href={it.href!} className={cls}>{inner}</Link>;
      })}
    </nav>
  );
}
