'use client';

import { useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "@/components/command-palette";
import { TopNav } from "@/components/shell/top-nav";
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
}: {
  children: ReactNode;
  module?: string;
  user?: { name: string; org: string };
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
      <main>{children}</main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} module={module} />
    </div>
  );
}
