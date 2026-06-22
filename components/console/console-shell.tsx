/**
 * ConsoleShell — the dark navy "mission control" shell that wraps every
 * /app console page. Applies .console-theme, renders ConsoleNav +
 * DisasterContext + bell + avatar + a docked AgentPanel slot.
 *
 * Reuses existing plumbing: useAuthContext, usePortalConfig, NotificationBell,
 * CommandPalette. Composed, not cobbled. Redesign 2026-06.
 */
"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, ChevronDown, MessageSquare, X } from "lucide-react";
import { useAuthContext } from "@/lib/auth-context";
import { CommandPalette } from "@/components/command-palette";
import { Badge } from "./primitives";
import { Pill, Dropdown } from "./data-viz";
import { initials } from "./types";
import { DemoModeProvider, useDemoMode } from "./demo-mode";

/* ------------------------------------------------------------------ */
/* Nav model — flat pill nav matching the redesign                     */
/* ------------------------------------------------------------------ */
interface NavItem {
  id: string;
  label: string;
  to: string;
}
const NAV: NavItem[] = [
  { id: "command", label: "Command", to: "/app/command" },
  { id: "cases", label: "Cases", to: "/app/cases" },
  { id: "match", label: "Match", to: "/app/match" },
  { id: "map", label: "Map", to: "/app/map" },
  { id: "directory", label: "Directory", to: "/app/directory" },
  { id: "reports", label: "Reporting", to: "/app/reports" },
];

/* ------------------------------------------------------------------ */
/* Logo                                                                */
/* ------------------------------------------------------------------ */
function ConsoleLogo() {
  return (
    <Link href="/app/command" aria-label="SOS Connect" style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logomark-red.svg" alt="SOS" width={30} height={30} style={{ display: "block" }} />
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Nav (centered pills)                                                */
/* ------------------------------------------------------------------ */
function ConsoleNav({ counts }: { counts?: Partial<Record<string, number>> }) {
  const path = usePathname() || "";
  return (
    <nav aria-label="Console" style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {NAV.map((n) => (
        <Pill key={n.id} href={n.to} active={path.startsWith(n.to)} count={counts?.[n.id]}>
          {n.label}
        </Pill>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Avatar menu                                                         */
/* ------------------------------------------------------------------ */
function AvatarMenu() {
  const { userName, userEmail, orgName, signOut } = useAuthContext();
  const name = userName || "User";
  return (
    <Dropdown
      align="right"
      trigger={
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "var(--cn-coral)",
            color: "#fff",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          {initials(name)}
        </span>
      }
      items={[
        { id: "who", label: `${name}${orgName ? " · " + orgName : ""}` },
        { id: "email", label: userEmail || "" },
        { id: "settings", label: "Settings", onSelect: () => (window.location.href = "/app/settings") },
        { id: "signout", label: "Sign out", onSelect: () => signOut?.() },
      ].filter((i) => i.label)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* DisasterContext — sub-header selector (drives disaster_id)          */
/* ------------------------------------------------------------------ */
export interface DisasterOption {
  id: string;
  name: string;
  day?: number;
}
function DisasterContext({
  disasters,
  activeId,
  onSelect,
}: {
  disasters: DisasterOption[];
  activeId?: string;
  onSelect?: (id: string) => void;
}) {
  const active = disasters.find((d) => d.id === activeId) || disasters[0];
  return (
    <Dropdown
      trigger={
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 9,
            height: 32,
            padding: "0 12px",
            borderRadius: 999,
            border: "1px solid var(--cn-border)",
            background: "var(--cn-surface-2)",
            fontFamily: "var(--font-sans)",
            fontSize: 13,
            fontWeight: 700,
            color: "var(--cn-text-2)",
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--cn-coral)" }} />
          {active ? active.name : "All disasters"}
          {active?.day != null && <span style={{ color: "var(--cn-text-3)", fontWeight: 600 }}>· Day {active.day}</span>}
          <ChevronDown size={14} />
        </span>
      }
      items={disasters.map((d) => ({
        id: d.id,
        label: d.day != null ? `${d.name} · Day ${d.day}` : d.name,
        onSelect: () => onSelect?.(d.id),
      }))}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */
export interface ConsoleShellProps {
  children: ReactNode;
  /** right-docked agent panel content */
  agent?: ReactNode;
  /** nav counters keyed by nav id (e.g. {command: 7}) */
  navCounts?: Partial<Record<string, number>>;
  /** disaster context selector */
  disasters?: DisasterOption[];
  activeDisasterId?: string;
  onSelectDisaster?: (id: string) => void;
  /** page-level sub-header actions (right of disaster selector) */
  subActions?: ReactNode;
  /** if true the content area manages its own scroll/padding */
  bare?: boolean;
}

function ShellInner({
  children,
  agent,
  navCounts,
  disasters = [],
  activeDisasterId,
  onSelectDisaster,
  subActions,
  bare,
}: ConsoleShellProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [agentOpen, setAgentOpen] = useState(true);
  const demo = useDemoMode();

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

  return (
    <div
      className="console-theme"
      style={{ background: "var(--cn-bg)", color: "var(--cn-text)", minHeight: "100vh", fontFamily: "var(--font-sans)" }}
    >
      {/* Top bar */}
      <header
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "0 16px",
          borderBottom: "1px solid var(--cn-border)",
          background: "var(--cn-surface-1)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>
          <ConsoleLogo />
          {demo && (
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--cn-amber)",
                border: "1px solid color-mix(in srgb, var(--cn-amber) 50%, transparent)",
                borderRadius: 6,
                padding: "2px 6px",
              }}
            >
              Demo
            </span>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "center", flexShrink: 0 }} className="cn-nav-desktop">
          <ConsoleNav counts={navCounts} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, justifyContent: "flex-end", minWidth: 0 }}>
          <button
            aria-label="Notifications"
            style={{
              position: "relative",
              width: 34,
              height: 34,
              borderRadius: 9,
              border: "1px solid var(--cn-border-strong)",
              background: "transparent",
              color: "var(--cn-text-2)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Bell size={16} />
          </button>
          <AvatarMenu />
        </div>
      </header>

      {/* Sub-header: disaster context + page actions */}
      {(disasters.length > 0 || subActions) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "10px 16px",
            borderBottom: "1px solid var(--cn-border)",
            background: "color-mix(in srgb, var(--cn-surface-1) 60%, var(--cn-bg))",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {disasters.length > 0 && (
              <DisasterContext disasters={disasters} activeId={activeDisasterId} onSelect={onSelectDisaster} />
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{subActions}</div>
        </div>
      )}

      {/* Body: content + docked agent panel */}
      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>
        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: bare ? 0 : 16,
            overflow: "auto",
          }}
        >
          {children}
        </main>

        {agent && (
          <>
            <aside
              className="cn-agent-dock"
              style={{
                width: agentOpen ? 360 : 0,
                flexShrink: 0,
                borderLeft: agentOpen ? "1px solid var(--cn-border)" : "none",
                background: "var(--cn-surface-1)",
                overflow: "hidden",
                transition: "width .2s ease",
                position: "sticky",
                top: 56,
                height: "calc(100vh - 56px)",
              }}
            >
              {agentOpen && agent}
            </aside>
            <button
              aria-label={agentOpen ? "Hide agent" : "Show agent"}
              onClick={() => setAgentOpen((o) => !o)}
              style={{
                position: "fixed",
                right: agentOpen ? 372 : 14,
                bottom: 18,
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "var(--cn-coral)",
                color: "#fff",
                border: "none",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
                zIndex: 55,
                transition: "right .2s ease",
              }}
            >
              {agentOpen ? <X size={18} /> : <MessageSquare size={18} />}
            </button>
          </>
        )}
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} module="Command" />

      <style>{`
        @media (max-width: 900px) {
          .cn-nav-desktop { display: none !important; }
          .cn-agent-dock { position: fixed !important; inset: 56px 0 0 auto !important; width: 100% !important; max-width: 420px; z-index: 70; }
        }
      `}</style>
    </div>
  );
}

export function ConsoleShell(props: ConsoleShellProps) {
  return (
    <DemoModeProvider>
      <ShellInner {...props} />
    </DemoModeProvider>
  );
}
