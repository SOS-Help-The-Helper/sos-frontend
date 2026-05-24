import { Link, useRouterState } from "@tanstack/react-router";
import { Map, Heart, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { TopNav, type TopNavItem } from "@/components/shell/TopNav";

const citizenItems: TopNavItem[] = [
  { to: "/c", label: "Map", matchPrefix: "/c" },
  { to: "/c/match", label: "Match", matchPrefix: "/c/match" },
  { to: "/c/manage", label: "Manage", matchPrefix: "/c/manage" },
];

const bottomTabs = [
  { to: "/c" as const, label: "Map", icon: Map, match: "/c", exact: true },
  { to: "/c/match" as const, label: "Match", icon: Heart, match: "/c/match" },
  { to: "/c/manage" as const, label: "Manage", icon: Inbox, match: "/c/manage" },
];

export function CitizenShell({ children, title }: { children: ReactNode; title?: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--surface-app)",
        color: "var(--foreground)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <TopNav items={citizenItems} />
      {title && (
        <div
          style={{
            padding: "16px 20px 0",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "var(--sos-coral)",
          }}
        >
          {title}
        </div>
      )}
      <main style={{ flex: 1, paddingBottom: 88 }}>{children}</main>

      {/* Mobile bottom tabs (kept for consumer flow) */}
      <nav
        className="md:hidden"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "var(--sos-white)",
          borderTop: "1px solid var(--sos-hairline)",
          display: "flex",
          justifyContent: "space-around",
          paddingTop: 8,
          paddingBottom: "max(8px, env(safe-area-inset-bottom))",
          zIndex: 30,
        }}
      >
        {bottomTabs.map((it) => {
          const active = it.exact ? path === it.match : path.startsWith(it.match);
          return (
            <Link
              key={it.label}
              to={it.to}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "4px 20px",
                color: active ? "var(--sos-coral)" : "var(--sos-muted)",
                textDecoration: "none",
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              <it.icon size={20} strokeWidth={1.75} />
              {it.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
