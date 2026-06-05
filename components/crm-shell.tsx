'use client';

import { useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
import { TopNav } from "@/components/shell/top-nav";
import { MobileBottomNav } from "@/components/shell/mobile-bottom-nav";
import { usePortalConfig } from "@/lib/use-portal-config";

/**
 * Staff shell — HubSpot-style navy top nav + light SOS-brand body.
 * - Top nav driven by portal config (DB-backed modules + labels)
 * - ⌘K / `/` opens the CommandPalette
 * - Body uses --surface-app (light gray) so pages render on the SOS palette
 */
export function CrmShell({
  children,
  module = "Directory",
  footer,
  bare = false,
}: {
  children: ReactNode;
  module?: string;
  user?: { name: string; org: string };
  /** Optional footer content pinned below the content area */
  footer?: ReactNode;
  /** If true, skip the bordered content wrapper (for pages that manage their own layout like Command) */
  bare?: boolean;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { config } = usePortalConfig();

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
    <div style={{ background: "var(--surface-app)", color: "var(--foreground)" }}>
      <TopNav
        enabledModules={config.modules}
        labels={config.labels}
        onOpenAgent={() => setPaletteOpen(true)}
        settingsTo="/app/settings"
      />
      {bare ? (
        <main className="pb-16 md:pb-0">{children}</main>
      ) : (
        <main className="h-[calc(100vh-56px)] flex flex-col px-3 pt-3 pb-20 md:p-4 gap-3">
          <div className="flex-1 min-h-0 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] overflow-auto">
            {children}
          </div>
          {footer && (
            <div className="flex-shrink-0">
              {footer}
            </div>
          )}
        </main>
      )}
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} module={module} />
      <MobileBottomNav />
    </div>
  );
}
