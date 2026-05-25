import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, ChevronDown, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Logomark } from "@/components/Logomark";
import { MODULE_META, NAV_CATEGORIES, type ModuleId } from "@/lib/prefs-store";


export type TopNavItem = {
  to: string;
  label: string;
  matchPrefix: string;
};

/**
 * HubSpot-style brand top nav (navy bar) used by both staff and citizen shells.
 * - Logo + wordmark flush-left, icon cluster flush-right (no centered max-width)
 * - Command is a direct link; remaining modules grouped under hover categories
 * - ⌘K search, Ask SOS, Apps, Help, Settings, Notifications, Avatar
 *
 * The `items` prop carries the user's enabled-module list; we filter category
 * children to whatever is enabled. Categories with zero enabled children hide.
 */
export function TopNav({
  items,
  onOpenAgent,
  settingsTo = "/settings",
}: {
  items: TopNavItem[];
  /** @deprecated kept for API compat; categories are sourced from prefs */
  maxVisible?: number;
  onOpenAgent?: () => void;
  settingsTo?: string;
}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [openCat, setOpenCat] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const enabledSet = new Set(items.map((it) => it.to));
  const isEnabled = (m: ModuleId) => enabledSet.has(MODULE_META[m].to);


  function openWithDelay(key: string) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpenCat(key);
  }
  function closeWithDelay() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpenCat(null), 150);
  }

  useEffect(() => () => { if (closeTimer.current) clearTimeout(closeTimer.current); }, []);

  return (
    <header
      className="on-dark sticky top-0 z-40"
      style={{
        background: "var(--sos-navy)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        color: "#fff",
      }}
    >
      <div
        style={{
          height: 56,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        {/* Logo → Command */}
        <Link
          to="/command"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            color: "#fff",
            textDecoration: "none",
            flexShrink: 0,
            flex: "1 1 0",
            minWidth: 0,
          }}
        >
          <Logomark size={22} />
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 18,
              color: "#fff",
              letterSpacing: "0.01em",
            }}
            className="hidden sm:inline"
          >
            SOS
          </span>
        </Link>

        {/* Primary nav — desktop, centered */}
        <nav
          className="hidden md:flex"
          style={{ alignItems: "center", gap: 2, justifyContent: "center", flexShrink: 0 }}
        >


          {NAV_CATEGORIES.map((cat) => {
            const mods = cat.modules.filter(isEnabled);
            if (mods.length === 0) return null;
            const active = mods.some((m) => path.startsWith(MODULE_META[m].to));
            const open = openCat === cat.key;
            return (
              <div
                key={cat.key}
                style={{ position: "relative" }}
                onMouseEnter={() => openWithDelay(cat.key)}
                onMouseLeave={closeWithDelay}
              >
                <button
                  onClick={() => setOpenCat(open ? null : cat.key)}
                  style={{
                    ...navItemStyle(active),
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                  }}
                  aria-expanded={open}
                  aria-haspopup="true"
                >
                  {cat.label}
                  <ChevronDown
                    size={12}
                    style={{
                      marginLeft: 2,
                      transform: open ? "rotate(180deg)" : "none",
                      transition: "transform 150ms",
                    }}
                  />
                  {active && <span style={activeUnderline} />}
                </button>
                {open && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 4,
                      marginTop: 0,
                      background: "var(--sos-navy)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 4,
                      boxShadow: "0 20px 50px rgba(15,30,43,0.35)",
                      minWidth: 200,
                      zIndex: 50,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ padding: 6, display: "flex", flexDirection: "column" }}>
                      {mods.map((m) => {
                        const meta = MODULE_META[m];
                        const itemActive = path.startsWith(meta.to);
                        return (
                          <Link
                            key={m}
                            to={meta.to}
                            onClick={() => setOpenCat(null)}
                            style={{
                              display: "block",
                              padding: "8px 12px",
                              borderRadius: 2,
                              textDecoration: "none",
                              fontSize: 13,
                              fontWeight: 600,
                              color: itemActive ? "#fff" : "rgba(255,255,255,0.7)",
                              background: "transparent",
                              whiteSpace: "nowrap",
                              transition: "color 120ms, background 120ms",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = "#fff";
                              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = itemActive ? "#fff" : "rgba(255,255,255,0.7)";
                              e.currentTarget.style.background = "transparent";
                            }}
                          >
                            {meta.label}
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

        {/* Right cluster (flex:1 so nav stays centered) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end", flex: "1 1 0", minWidth: 0 }}>



          {/* Icon cluster — alerts + avatar only */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, flexShrink: 0 }}>
            <button style={iconBtn} aria-label="Notifications" className="inline-flex">
              <Bell size={16} />
            </button>
            <div
              style={{
                marginLeft: 6,
                alignItems: "center",
                gap: 6,
                padding: "4px 8px 4px 4px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.06)",
              }}
              className="hidden sm:inline-flex"
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: "var(--sos-coral)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                M
              </span>
              <ChevronDown size={12} style={{ color: "rgba(255,255,255,0.6)" }} />
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden inline-flex"
              style={iconBtn}
              aria-label="Menu"
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </div>



      {/* Mobile nav sheet */}
      {mobileOpen && (
        <div
          className="md:hidden"
          style={{ position: "fixed", inset: 0, zIndex: 60 }}
        >
          <div
            style={{ position: "absolute", inset: 0, background: "rgba(15,30,43,0.55)" }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(320px, 86vw)",
              background: "var(--sos-navy)",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              color: "#fff",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontSize: 18,
                }}
              >
                SOS
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                style={iconBtn}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            </div>




            {NAV_CATEGORIES.map((cat) => {
              const mods = cat.modules.filter(isEnabled);
              if (mods.length === 0) return null;
              const expanded = mobileExpanded === cat.key;
              const active = mods.some((m) => path.startsWith(MODULE_META[m].to));
              return (
                <div key={cat.key}>
                  <button
                    onClick={() => setMobileExpanded(expanded ? null : cat.key)}
                    style={{
                      ...mobileLinkStyle(active && !expanded),
                      width: "100%",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    {cat.label}
                    <ChevronDown
                      size={14}
                      style={{
                        transform: expanded ? "rotate(180deg)" : "none",
                        transition: "transform 150ms",
                      }}
                    />
                  </button>
                  {expanded && (
                    <div style={{ paddingLeft: 12, marginTop: 2, marginBottom: 4 }}>
                      {mods.map((m) => {
                        const meta = MODULE_META[m];
                        const itemActive = path.startsWith(meta.to);
                        return (
                          <Link
                            key={m}
                            to={meta.to}
                            onClick={() => setMobileOpen(false)}
                            style={{
                              ...mobileLinkStyle(itemActive),
                              padding: "10px 14px",
                              fontSize: 13.5,
                            }}
                          >
                            {meta.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}



          </div>
        </div>
      )}
    </header>
  );
}

const navItemStyle = (active: boolean): React.CSSProperties => ({
  position: "relative",
  padding: "18px 12px",
  fontSize: 13,
  fontWeight: 600,
  color: active ? "#fff" : "rgba(255,255,255,0.7)",
  textDecoration: "none",
  whiteSpace: "nowrap",
  transition: "color 120ms",
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
});

const activeUnderline: React.CSSProperties = {
  position: "absolute",
  left: 8,
  right: 8,
  bottom: 0,
  height: 3,
  background: "var(--sos-coral)",
  borderRadius: "3px 3px 0 0",
};

const iconBtn: React.CSSProperties = {
  minWidth: 40,
  minHeight: 40,
  width: 40,
  height: 40,
  borderRadius: 8,
  background: "transparent",
  border: "none",
  alignItems: "center",
  justifyContent: "center",
  color: "rgba(255,255,255,0.8)",
  cursor: "pointer",
};
const iconBtnAnchor: React.CSSProperties = { ...iconBtn, textDecoration: "none" };

const mobileLinkStyle = (active: boolean): React.CSSProperties => ({
  display: "block",
  padding: "12px 14px",
  fontSize: 14,
  fontWeight: 600,
  color: active ? "#fff" : "rgba(255,255,255,0.7)",
  background: active ? "rgba(255,255,255,0.08)" : "transparent",
  borderRadius: 8,
  textDecoration: "none",
  borderLeft: active
    ? "3px solid var(--sos-coral)"
    : "3px solid transparent",
});
