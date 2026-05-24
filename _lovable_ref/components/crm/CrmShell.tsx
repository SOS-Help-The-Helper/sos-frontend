import { useEffect, useState, type ReactNode } from "react";
import { CommandPalette } from "@/components/CommandPalette";
import { TopNav, type TopNavItem } from "@/components/shell/TopNav";
import { MODULE_META, usePrefs } from "@/lib/prefs-store";

/**
 * Staff shell — HubSpot-style navy top nav + light SOS-brand body.
 * - Top nav driven by `prefs.enabled`
 * - ⌘K / `/` opens the CommandPalette
 * - Body uses --surface-app (light gray) so pages render on the SOS palette
 */
export function CrmShell({
  children,
  module = "Directory",
}: {
  children: ReactNode;
  module?: string;
}) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const prefs = usePrefs();

  const items: TopNavItem[] = prefs.enabled.map((m) => ({
    to: MODULE_META[m].to,
    label: MODULE_META[m].label,
    matchPrefix: MODULE_META[m].to,
  }));

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
        items={items}
        onOpenAgent={() => setPaletteOpen(true)}
        settingsTo="/settings"
      />
      <main>{children}</main>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} module={module} />
    </div>
  );
}
