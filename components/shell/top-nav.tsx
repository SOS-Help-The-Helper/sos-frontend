'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  Briefcase, GitBranch, Map as MapIcon, Truck, Package, Users, Calendar,
  BarChart3, Radio, Network as NetworkIcon,
} from "lucide-react";
import type { ModuleId } from "@/lib/use-portal-config";

// Module visual metadata (icons, tints, descriptions)
type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

const MODULE_VISUAL: Record<ModuleId, { icon: IconType; desc: string; tint: string; ink: string }> = {
  directory:  { icon: NetworkIcon, desc: "People, orgs, requests & resources", tint: "rgba(137,207,240,0.20)", ink: "#0F1E2B" },
  cases:      { icon: Briefcase,   desc: "Open requests & their workflow",     tint: "rgba(137,207,240,0.20)", ink: "#0F1E2B" },
  match:      { icon: GitBranch,   desc: "Route requests to the best org",     tint: "rgba(239,78,75,0.10)",   ink: "#EF4E4B" },
  map:        { icon: MapIcon,     desc: "Geographic operating picture",       tint: "#0F1E2B",                ink: "#FFFFFF" },
  transport:  { icon: Truck,       desc: "Driver assignments & convoys",       tint: "rgba(239,78,75,0.10)",   ink: "#EF4E4B" },
  inventory:  { icon: Package,     desc: "Stock & tracked assets",             tint: "rgba(137,207,240,0.20)", ink: "#0F1E2B" },
  volunteers: { icon: Users,       desc: "Roster & availability",              tint: "#0F1E2B",                ink: "#FFFFFF" },
  calendar:   { icon: Calendar,    desc: "Shifts, call-ups & events",          tint: "rgba(137,207,240,0.20)", ink: "#0F1E2B" },
  reports:    { icon: BarChart3,   desc: "Field reports & analytics",          tint: "rgba(239,78,75,0.10)",   ink: "#EF4E4B" },
  command:    { icon: Radio,       desc: "Active disaster dashboards",         tint: "#0F1E2B",                ink: "#FFFFFF" },
};

type NavCategory = { key: string; label: string; modules: ModuleId[] };

const NAV_CATEGORIES: NavCategory[] = [
  { key: "respond",    label: "Respond",    modules: ["cases", "match", "map"] },
  { key: "coordinate", label: "Coordinate", modules: ["calendar", "volunteers", "transport", "inventory"] },
  { key: "network",    label: "Network",    modules: ["directory", "reports"] },
];

export interface TopNavProps {
  enabledModules: ModuleId[];
  labels: Partial<Record<ModuleId, string>>;
  onOpenAgent?: () => void;
  settingsTo?: string;
  userName?: string;
}

export function TopNav({ enabledModules, labels, onOpenAgent, settingsTo = "/app/settings", userName = "U" }: TopNavProps) {
  const path = usePathname();
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enabledSet = new Set(enabledModules);
  const isEnabled = (m: ModuleId) => enabledSet.has(m);
  const getLabel = (m: ModuleId) => labels[m] || MODULE_VISUAL[m]?.desc?.split(",")[0] || m;

  function openWithDelay(key: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenCat(key);
  }
  function closeWithDelay() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenCat(null), 150);
  }

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  const initials = userName.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase() || "U";

  return (
    <header
      className="on-dark sticky top-0 z-40"
      style={{
        background: "var(--sos-navy)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        color: "#fff",
      }}
    >
      <div style={{ height: 56, padding: "0 16px", display: "flex", alignItems: "center", gap: 16 }}>
        {/* Logo → Command */}
        <Link
          href="/app/command"
          style={{ display: "flex", alignItems: "center", gap: 8, color: "#fff", textDecoration: "none", flexShrink: 0, flex: "1 1 0", minWidth: 0 }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logomark.svg" alt="SOS" width={22} height={22} />
          <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "#fff", letterSpacing: "0.01em" }} className="hidden sm:inline">
            SOS
          </span>
        </Link>

        {/* Desktop nav — centered categories */}
        <nav className="hidden md:flex" style={{ alignItems: "center", gap: 2, justifyContent: "center", flexShrink: 0 }}>
          {NAV_CATEGORIES.map((cat) => {
            const mods = cat.modules.filter(isEnabled);
            if (mods.length === 0) return null;
            const active = mods.some((m) => path.startsWith(`/app/${m}`));
            const catActive = mods.some((m) => {
              return path.startsWith(`/app/${m}`);
            });
            const open = openCat === cat.key;
            return (
              <div key={cat.key} style={{ position: "relative" }} onMouseEnter={() => openWithDelay(cat.key)} onMouseLeave={closeWithDelay}>
                <button
                  onClick={() => setOpenCat(open ? null : cat.key)}
                  style={{
                    position: "relative", padding: "18px 12px", fontSize: 13, fontWeight: 600,
                    color: catActive ? "#fff" : "rgba(255,255,255,0.7)", textDecoration: "none",
                    whiteSpace: "nowrap" as const, background: "transparent", border: "none", cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 4, transition: "color 120ms",
                  }}
                >
                  {cat.label}
                  <ChevronDown size={12} style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
                  {catActive && (
                    <span style={{ position: "absolute", left: 8, right: 8, bottom: 0, height: 3, background: "var(--sos-coral)", borderRadius: "3px 3px 0 0" }} />
                  )}
                </button>
                {open && (
                  <div
                    className="on-light"
                    style={{
                      position: "absolute", top: "100%", left: 4, marginTop: 0,
                      background: "#fff", border: "1px solid var(--sos-hairline)", borderRadius: 4,
                      boxShadow: "0 20px 50px rgba(15,30,43,0.18)", width: 320, zIndex: 50, overflow: "hidden",
                    }}
                  >
                    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 2 }}>
                      {mods.map((m) => {
                        const vis = MODULE_VISUAL[m];
                        const Icon = vis.icon;
                        const itemActive = path.startsWith(`/app/${m}`);
                        const label = labels[m] || m.charAt(0).toUpperCase() + m.slice(1);
                        return (
                          <Link
                            key={m}
                            href={`/app/${m}`}
                            onClick={() => setOpenCat(null)}
                            style={{
                              display: "flex", alignItems: "flex-start", gap: 14, padding: 12, borderRadius: 2,
                              textDecoration: "none", background: itemActive ? "var(--sos-card-gray)" : "transparent", transition: "background 120ms",
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--sos-card-gray)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = itemActive ? "var(--sos-card-gray)" : "transparent"; }}
                          >
                            <span style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 4, background: vis.tint, color: vis.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                              <Icon size={20} strokeWidth={2} />
                            </span>
                            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                              <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700, color: "var(--sos-navy)", lineHeight: 1.1 }}>
                                {label}
                              </span>
                              <span style={{ fontFamily: "var(--font-mono, ui-monospace)", fontSize: 11, color: "var(--sos-muted)", marginTop: 3, lineHeight: 1.2 }}>
                                {vis.desc}
                              </span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Right cluster */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", flex: "1 1 0", minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <button style={iconBtn} aria-label="Notifications" className="inline-flex">
              <Bell size={16} />
            </button>
            <div style={{ marginLeft: 6, alignItems: "center", gap: 6, padding: "4px 8px 4px 4px", borderRadius: 999, background: "rgba(255,255,255,0.06)" }} className="hidden sm:inline-flex">
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--sos-coral)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                {initials}
              </span>
              <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.6)" }} />
            </div>
            <button className="md:hidden inline-flex" style={iconBtn} aria-label="Menu" onClick={() => setMobileOpen(true)}>
              <Menu size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav sheet */}
      {mobileOpen && (
        <div className="md:hidden" style={{ position: "fixed", inset: 0, zIndex: 60 }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(15,30,43,0.55)" }} onClick={() => setMobileOpen(false)} />
          <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(320px, 86vw)", background: "var(--sos-navy)", padding: 16, display: "flex", flexDirection: "column", gap: 4, color: "#fff", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 18 }}>SOS</span>
              <button onClick={() => setMobileOpen(false)} style={iconBtn} aria-label="Close menu"><X size={18} /></button>
            </div>
            {NAV_CATEGORIES.map((cat) => {
              const mods = cat.modules.filter(isEnabled);
              if (mods.length === 0) return null;
              const expanded = mobileExpanded === cat.key;
              const catActive = mods.some((m) => path.startsWith(`/app/${m}`));
              return (
                <div key={cat.key}>
                  <button
                    onClick={() => setMobileExpanded(expanded ? null : cat.key)}
                    style={{ ...mobileLinkStyle(catActive && !expanded), width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "transparent", border: "none", cursor: "pointer" }}
                  >
                    {cat.label}
                    <ChevronDown size={14} style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
                  </button>
                  {expanded && (
                    <div style={{ paddingLeft: 12, marginTop: 2, marginBottom: 4 }}>
                      {mods.map((m) => {
                        const itemActive = path.startsWith(`/app/${m}`);
                        const label = labels[m] || m.charAt(0).toUpperCase() + m.slice(1);
                        return (
                          <Link key={m} href={`/app/${m}`} onClick={() => setMobileOpen(false)} style={{ ...mobileLinkStyle(itemActive), padding: "10px 14px", fontSize: 13.5 }}>
                            {label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
            <Link href={settingsTo} onClick={() => setMobileOpen(false)} style={mobileLinkStyle(path.startsWith("/app/settings"))}>
              Settings
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

const iconBtn: React.CSSProperties = {
  minWidth: 40, minHeight: 40, width: 40, height: 40, borderRadius: 8,
  background: "transparent", border: "none", alignItems: "center", justifyContent: "center",
  color: "rgba(255,255,255,0.8)", cursor: "pointer",
};

const mobileLinkStyle = (active: boolean): React.CSSProperties => ({
  display: "block", padding: "12px 14px", fontSize: 14, fontWeight: 600,
  color: active ? "#fff" : "rgba(255,255,255,0.7)",
  background: active ? "rgba(255,255,255,0.08)" : "transparent",
  borderRadius: 8, textDecoration: "none",
  borderLeft: active ? "3px solid var(--sos-coral)" : "3px solid transparent",
});
