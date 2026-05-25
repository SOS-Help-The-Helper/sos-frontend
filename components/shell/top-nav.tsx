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
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enabledSet = new Set(enabledModules);
  const isEnabled = (m: ModuleId) => enabledSet.has(m);
  const getLabel = (m: ModuleId) => labels[m] || m.charAt(0).toUpperCase() + m.slice(1);

  function openWithDelay(key: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenCat(key);
  }
  function closeWithDelay() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenCat(null), 150);
  }

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

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
            const catActive = mods.some((m) => path.startsWith(`/app/${m}`));
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
            {/* Mobile: bare avatar circle */}
            <span
              className="md:hidden inline-flex"
              style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--sos-coral)", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}
            >
              {initials}
            </span>
            {/* Desktop: full avatar pill */}
            <div
              style={{ marginLeft: 6, alignItems: "center", gap: 6, padding: "4px 8px 4px 4px", borderRadius: 999, background: "rgba(255,255,255,0.06)" }}
              className="hidden md:inline-flex"
            >
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--sos-coral)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                {initials}
              </span>
              <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.6)" }} />
            </div>
            {/* Hamburger — mobile only */}
            <button className="md:hidden inline-flex" style={iconBtn} aria-label="Menu" onClick={() => setMobileOpen(true)}>
              <Menu size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav — full-screen overlay with slide-in animation */}
      {/* Always rendered (not conditional) so the CSS transition can play */}
      <div
        className="md:hidden"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 60,
          pointerEvents: mobileOpen ? "auto" : "none",
        }}
      >
        {/* Backdrop */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(15,30,43,0.6)",
            opacity: mobileOpen ? 1 : 0,
            transition: "opacity 250ms ease",
          }}
          onClick={() => setMobileOpen(false)}
        />

        {/* Slide-in panel */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            background: "var(--sos-navy)",
            display: "flex",
            flexDirection: "column",
            color: "#fff",
            overflowY: "auto",
            transform: mobileOpen ? "translateX(0)" : "translateX(100%)",
            transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* Header row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 16px", height: 56, flexShrink: 0, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logomark.svg" alt="SOS" width={22} height={22} />
              <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "#fff" }}>SOS</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--sos-coral)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                {initials}
              </span>
              <button onClick={() => setMobileOpen(false)} style={{ ...iconBtn, display: "inline-flex" }} aria-label="Close menu">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Nav content — all categories expanded */}
          <div style={{ flex: 1, padding: "16px 12px", display: "flex", flexDirection: "column", gap: 24 }}>
            {NAV_CATEGORIES.map((cat) => {
              const mods = cat.modules.filter(isEnabled);
              if (mods.length === 0) return null;
              return (
                <div key={cat.key}>
                  {/* Category label */}
                  <div style={{ padding: "0 8px 8px", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {cat.label}
                  </div>
                  {/* Module links */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {mods.map((m) => {
                      const vis = MODULE_VISUAL[m];
                      const Icon = vis.icon;
                      const itemActive = path.startsWith(`/app/${m}`);
                      const label = getLabel(m);
                      return (
                        <Link
                          key={m}
                          href={`/app/${m}`}
                          onClick={() => setMobileOpen(false)}
                          style={{
                            display: "flex", alignItems: "center", gap: 12,
                            padding: "10px 8px", borderRadius: 8, textDecoration: "none",
                            color: itemActive ? "#fff" : "rgba(255,255,255,0.75)",
                            background: itemActive ? "rgba(255,255,255,0.08)" : "transparent",
                            borderLeft: itemActive ? "3px solid var(--sos-coral)" : "3px solid transparent",
                            transition: "background 120ms",
                          }}
                        >
                          <span style={{ flexShrink: 0, width: 34, height: 34, borderRadius: 6, background: vis.tint, color: itemActive ? "inherit" : vis.ink, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                            <Icon size={16} strokeWidth={2} />
                          </span>
                          <span style={{ fontSize: 15, fontWeight: 600 }}>{label}</span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: "12px 12px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <Link
              href={settingsTo}
              onClick={() => setMobileOpen(false)}
              style={{
                display: "block", padding: "10px 8px", borderRadius: 8, textDecoration: "none",
                fontSize: 14, fontWeight: 600,
                color: path.startsWith("/app/settings") ? "#fff" : "rgba(255,255,255,0.6)",
                background: path.startsWith("/app/settings") ? "rgba(255,255,255,0.08)" : "transparent",
              }}
            >
              Settings
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}

const iconBtn: React.CSSProperties = {
  minWidth: 40, minHeight: 40, width: 40, height: 40, borderRadius: 8,
  background: "transparent", border: "none", alignItems: "center", justifyContent: "center",
  color: "rgba(255,255,255,0.8)", cursor: "pointer",
};
