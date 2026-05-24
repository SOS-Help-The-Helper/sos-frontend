'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users, LayoutGrid, Map, Package, Calendar, BarChart3, Radio,
  Sparkles, Settings, ChevronsLeft, ChevronsRight, ChevronDown, Truck,
  HeartHandshake, Heart, MoreHorizontal, X,
} from "lucide-react";
import { useEffect, useState, useMemo, type ReactNode, type ComponentType } from "react";
import { CommandPalette } from "@/components/command-palette";
import { usePortalConfig, MODULE_META, type ModuleId } from "@/lib/use-portal-config";

type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const MODULE_ICON: Record<ModuleId, IconType> = {
  directory: Users,
  cases: LayoutGrid,
  match: Heart,
  map: Map,
  transport: Truck,
  inventory: Package,
  volunteers: HeartHandshake,
  calendar: Calendar,
  reports: BarChart3,
  command: Radio,
};

type NavItem = { href: string; icon: IconType; label: string; matchPrefix: string; id: ModuleId };
type NavGroup = { id: string; label: string; items: NavItem[] };

function buildGroups(enabled: ModuleId[], labelOverrides: Partial<Record<ModuleId, string>>): NavGroup[] {
  const groupDefs: { id: string; label: string }[] = [
    { id: "crm", label: "CRM" },
    { id: "ops", label: "Ops" },
    { id: "insights", label: "Insights" },
  ];
  return groupDefs
    .map((g) => {
      const items: NavItem[] = enabled
        .filter((m) => MODULE_META[m]?.group === g.id)
        .map((m) => ({
          id: m,
          href: MODULE_META[m].to,
          matchPrefix: MODULE_META[m].to,
          label: labelOverrides[m] || MODULE_META[m].label,
          icon: MODULE_ICON[m],
        }));
      return { ...g, items };
    })
    .filter((g) => g.items.length > 0);
}

interface CrmShellProps {
  children: ReactNode;
  module?: string;
  user?: { name: string; org: string };
}

export function CrmShell({ children, module = "Directory", user = { name: 'Admin', org: 'SOS' } }: CrmShellProps) {
  const [expanded, setExpanded] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ crm: true, ops: true, insights: true });
  const path = usePathname();
  const sidebarW = expanded ? 220 : 56;
  const { config } = usePortalConfig();
  const groups = useMemo(
    () => buildGroups(config.modules, config.labels),
    [config.modules, config.labels]
  );

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

      <MobileBottomNav
        pins={config.mobile_pins}
        enabled={config.modules}
        labels={config.labels}
        onOpenAgent={() => setPaletteOpen(true)}
      />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} module={module} />
    </div>
  );
}

function MobileBottomNav({
  pins, enabled, labels, onOpenAgent,
}: {
  pins: ModuleId[];
  enabled: ModuleId[];
  labels: Partial<Record<ModuleId, string>>;
  onOpenAgent: () => void;
}) {
  const path = usePathname();
  const showMore = enabled.some((m) => !pins.includes(m));
  const [moreOpen, setMoreOpen] = useState(false);

  // Layout: [pin1] [pin2] [SOS] [pin3] [pin4 or More]
  const left = pins.slice(0, 2);
  const right = pins.slice(2, showMore ? 3 : 4);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 glass flex justify-around pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-40"
        style={{ borderTop: "1px solid var(--hairline)" }}
      >
        {left.map((id) => <PinTab key={id} id={id} path={path} label={labels[id]} />)}
        {Array.from({ length: 2 - left.length }).map((_, i) => <span key={`lp${i}`} className="w-14" />)}

        <button onClick={onOpenAgent} className="flex flex-col items-center gap-1 px-3 py-1 transition text-white">
          <span className="w-10 h-10 -mt-3 rounded-full bg-gradient-to-br from-[#EF4E4B] to-[#89CFF0] flex items-center justify-center shadow-lg shadow-[#EF4E4B]/30">
            <Sparkles size={18} strokeWidth={2} />
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider font-medium">SOS</span>
        </button>

        {right.map((id) => <PinTab key={id} id={id} path={path} label={labels[id]} />)}
        {showMore && (
          <button
            onClick={() => setMoreOpen(true)}
            className={`flex flex-col items-center gap-1 px-3 py-1 transition ${enabled.some((m) => !pins.includes(m) && path.startsWith(MODULE_META[m]?.to)) ? "text-[#89CFF0]" : "text-white/55"}`}
          >
            <MoreHorizontal size={20} strokeWidth={1.75} />
            <span className="font-mono text-[9px] uppercase tracking-wider font-medium">More</span>
          </button>
        )}
        {!showMore && right.length < 2 && Array.from({ length: 2 - right.length }).map((_, i) => <span key={`rp${i}`} className="w-14" />)}
      </nav>

      {/* More sheet */}
      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70 animate-in fade-in" onClick={() => setMoreOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-[var(--background)] border-t border-[var(--hairline)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold">More</h3>
              <button onClick={() => setMoreOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center text-white/55 hover:text-white hover:bg-white/5">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {enabled.filter((m) => !pins.includes(m)).map((id) => {
                const Icon = MODULE_ICON[id];
                return (
                  <Link
                    key={id}
                    href={MODULE_META[id].to}
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 p-3 rounded-xl border border-[var(--hairline)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition"
                  >
                    <Icon size={18} strokeWidth={1.75} className="text-[#89CFF0]" />
                    <span className="text-[13px] font-medium">{labels[id] || MODULE_META[id].label}</span>
                  </Link>
                );
              })}
              <Link
                href="/settings"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 p-3 rounded-xl border border-[var(--hairline)] bg-[var(--surface-1)] hover:bg-[var(--surface-2)] transition"
              >
                <Settings size={18} strokeWidth={1.75} className="text-white/55" />
                <span className="text-[13px] font-medium">Settings</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function PinTab({ id, path, label }: { id: ModuleId; path: string; label?: string }) {
  const meta = MODULE_META[id];
  const Icon = MODULE_ICON[id];
  if (!meta) return null;
  const active = path.startsWith(meta.to);
  return (
    <Link
      href={meta.to}
      className={`flex flex-col items-center gap-1 px-3 py-1 transition ${active ? "text-[#89CFF0]" : "text-white/55"}`}
    >
      <Icon size={20} strokeWidth={1.75} />
      <span className="font-mono text-[9px] uppercase tracking-wider font-medium">{label || meta.label}</span>
    </Link>
  );
}
