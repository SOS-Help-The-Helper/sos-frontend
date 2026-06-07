'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePortalConfig, type ModuleId } from "@/lib/use-portal-config";
import { MODULE_VISUAL } from "@/components/shell/top-nav";

/**
 * Mobile bottom tab bar — quick navigation for the staff portal on phones.
 * - Fixed to the bottom, hidden on md+ (desktop uses the TopNav categories).
 * - Tabs come from `config.mobile_pins`, filtered to enabled modules, max 4.
 * - Icons reuse the shared MODULE_VISUAL map; active tab gets the coral accent.
 * - Safe-area padding keeps tabs clear of the iPhone home indicator.
 */
export function MobileBottomNav() {
  const path = usePathname();
  const { config } = usePortalConfig();

  const enabled = new Set(config.modules);
  const pins = config.mobile_pins.filter((m) => enabled.has(m)).slice(0, 4);
  if (pins.length === 0) return null;

  const getLabel = (m: ModuleId) => config.labels[m] || m.charAt(0).toUpperCase() + m.slice(1);

  return (
    <nav
      className="flex md:hidden on-dark"
      aria-label="Primary"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        background: "var(--sos-navy)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {pins.map((m) => {
        const vis = MODULE_VISUAL[m];
        const Icon = vis.icon;
        const active = path.startsWith(`/app/${m}`);
        return (
          <Link
            key={m}
            href={`/app/${m}`}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              minWidth: 0,
              height: 58,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              textDecoration: "none",
              color: active ? "var(--sos-coral)" : "rgba(255,255,255,0.6)",
              transition: "color 120ms",
            }}
          >
            <Icon size={20} strokeWidth={active ? 2.4 : 2} />
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.01em",
                maxWidth: "100%",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {getLabel(m)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
