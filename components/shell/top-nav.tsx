'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, Menu, X, Building2, Check } from "lucide-react";
import { useEffect, useRef, useState, type ComponentType } from "react";
import { toast } from "sonner";
import {
  Briefcase, GitBranch, Map as MapIcon, Truck, Package, Users, Calendar,
  BarChart3, Radio, Network as NetworkIcon,
} from "lucide-react";
import type { ModuleId } from "@/lib/use-portal-config";
import { useAuthContext } from "@/lib/auth-context";

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

export function TopNav({ enabledModules, labels, onOpenAgent, settingsTo = "/app/settings", userName }: TopNavProps) {
  const path = usePathname();
  const { signOut, userEmail, userPhone, userName: ctxUserName } = useAuthContext();
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const avatarRef = useRef<HTMLDivElement>(null);

  // Display identity: prefer person name, fall back to email/phone.
  const displayName = userName || ctxUserName || "User";
  const contactLine = userEmail || userPhone || "";

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

  useEffect(() => {
    if (!avatarOpen) return;
    function handleMouseDown(e: MouseEvent) {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) {
        setAvatarOpen(false);
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [avatarOpen]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // ⌘K shortcut — dispatch custom event for CommandPalette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("sos-command-palette"));
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const initials = displayName.split(" ").map(s => s[0]).join("").slice(0, 2).toUpperCase() || "U";

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
          <span className="sos-pulse-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logomark.svg" alt="SOS" width={22} height={22} style={{ position: "relative", zIndex: 1 }} />
            <span className="sos-pulse-ring" />
            <span className="sos-pulse-ring sos-pulse-ring-2" />
          </span>
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
                    style={{
                      position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", marginTop: 4,
                      background: "var(--sos-navy)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8,
                      boxShadow: "0 20px 50px rgba(0,0,0,0.4)", minWidth: 180, zIndex: 50, overflow: "hidden",
                    }}
                  >
                    <div style={{ padding: 6, display: "flex", flexDirection: "column", gap: 2 }}>
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
                              display: "flex", alignItems: "center", gap: 10, padding: "8px 14px", borderRadius: 6,
                              textDecoration: "none", background: itemActive ? "rgba(255,255,255,0.08)" : "transparent", transition: "background 120ms",
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = itemActive ? "rgba(255,255,255,0.08)" : "transparent"; }}
                          >
                            <span style={{ fontSize: 13, fontWeight: 500, color: itemActive ? "#fff" : "rgba(255,255,255,0.7)" }}>
                              {label}
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
          {/* Org switcher — admin only */}
          <OrgSwitcher />
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <button style={iconBtn} aria-label="Notifications" className="inline-flex" onClick={() => toast("No new notifications")}>
              <Bell size={16} />
            </button>
            {/* Mobile: bare avatar circle */}
            <span
              className="md:hidden inline-flex"
              style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--sos-coral)", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700, flexShrink: 0 }}
            >
              {initials}
            </span>
            {/* Desktop: full avatar pill with dropdown */}
            <div ref={avatarRef} style={{ position: "relative" }} className="hidden md:block">
              <button
                onClick={() => setAvatarOpen(o => !o)}
                style={{ marginLeft: 6, alignItems: "center", gap: 6, padding: "4px 8px 4px 4px", borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", display: "inline-flex" }}
              >
                <span style={{ width: 26, height: 26, borderRadius: "50%", background: "var(--sos-coral)", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                  {initials}
                </span>
                <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.6)", transform: avatarOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
              </button>
              {avatarOpen && (
                <div style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
                  background: "#1B3A57", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", minWidth: 200, overflow: "hidden",
                }}>
                  {/* Signed-in user */}
                  <div style={{ padding: "10px 14px", borderBottom: "1px solid rgba(255,255,255,0.10)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {displayName}
                    </div>
                    {contactLine && (
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                        {contactLine}
                      </div>
                    )}
                  </div>
                  <Link
                    href={settingsTo}
                    onClick={() => setAvatarOpen(false)}
                    style={{ display: "block", padding: "10px 14px", fontSize: 13, color: "#fff", textDecoration: "none", transition: "background 120ms" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    Settings
                  </Link>
                  <div style={{ height: 1, background: "rgba(255,255,255,0.10)", margin: "4px 0" }} />
                  <button
                    onClick={() => { setAvatarOpen(false); void signOut(); }}
                    style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 13, color: "rgba(255,255,255,0.6)", background: "transparent", border: "none", cursor: "pointer", transition: "background 120ms" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                  >
                    Sign out
                  </button>
                </div>
              )}
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
            {contactLine && (
              <div style={{ padding: "4px 8px 8px" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{displayName}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>{contactLine}</div>
              </div>
            )}
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
            <button
              onClick={() => { setMobileOpen(false); void signOut(); }}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "10px 8px", borderRadius: 8,
                fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.6)",
                background: "transparent", border: "none", cursor: "pointer",
              }}
            >
              Sign out
            </button>
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

/**
 * Admin-only org switcher. Lists every org from the auth context and re-routes
 * all API calls to the selected org's database via switchOrg(). Hidden entirely
 * for non-admins. "SOS (All Partners)" is the default coordination view.
 */
function OrgSwitcher() {
  const { isAdmin, orgId, orgName, allOrgs, switchOrg } = useAuthContext();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!isAdmin) return null;

  const label = orgName || "Select org";

  return (
    <div ref={ref} style={{ position: "relative" }} className="hidden md:block">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Switch organization"
        style={{
          display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 10px",
          borderRadius: 999, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)",
          color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", maxWidth: 200,
        }}
      >
        <Building2 size={14} style={{ flexShrink: 0, opacity: 0.8 }} />
        <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
        <ChevronDown size={12} style={{ flexShrink: 0, color: "rgba(255,255,255,0.6)", transform: open ? "rotate(180deg)" : "none", transition: "transform 150ms" }} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 50,
            background: "#1B3A57", border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", minWidth: 220,
            maxHeight: 360, overflowY: "auto", padding: 4,
          }}
        >
          {allOrgs.length === 0 && (
            <div style={{ padding: "10px 12px", fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              No organizations
            </div>
          )}
          {allOrgs.map((o) => {
            const active = o.org_id === orgId;
            return (
              <button
                key={o.org_id}
                onClick={() => { switchOrg(o.org_id); setOpen(false); }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%",
                  padding: "9px 12px", borderRadius: 6, fontSize: 13, textAlign: "left",
                  color: active ? "#fff" : "rgba(255,255,255,0.8)", fontWeight: active ? 600 : 500,
                  background: active ? "rgba(255,255,255,0.08)" : "transparent", border: "none", cursor: "pointer",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.10)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = active ? "rgba(255,255,255,0.08)" : "transparent"; }}
              >
                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.org_name}</span>
                {active && <Check size={14} style={{ flexShrink: 0, color: "var(--sos-coral)" }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AvatarMenuItem({
  icon: Icon,
  label,
  href,
  onClick,
  danger,
}: {
  icon: ComponentType<{ size?: number; style?: React.CSSProperties }>;
  label: string;
  href?: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  const baseStyle: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10, width: "100%",
    padding: "9px 10px", borderRadius: 6, fontSize: 13, fontWeight: 500,
    color: danger ? "var(--sos-coral)" : "rgba(255,255,255,0.85)",
    background: "transparent", border: "none", cursor: "pointer",
    textDecoration: "none", textAlign: "left",
  };
  const inner = (
    <>
      <Icon size={14} style={{ opacity: 0.75 }} />
      <span>{label}</span>
    </>
  );
  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        style={baseStyle}
        onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      onClick={onClick}
      style={baseStyle}
      onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = "transparent")}
    >
      {inner}
    </button>
  );
}
