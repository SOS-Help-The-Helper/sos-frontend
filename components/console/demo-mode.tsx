/**
 * Demo-mode context. Jonathan's requirement: demo mode shows DEMO DATA ONLY,
 * never live data. Read actions receive `demo:true` and filter is_demo (Phase 0b).
 * Live console = demo:false (live only). Redesign 2026-06.
 */
"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";

interface DemoModeValue {
  demo: boolean;
}
const DemoModeContext = createContext<DemoModeValue>({ demo: false });

/**
 * Demo mode is on when the route is under /app/demo OR ?demo=1 is present.
 * Kept deterministic + route-driven so there is zero chance of live/demo bleed.
 */
export function DemoModeProvider({ children, force }: { children: ReactNode; force?: boolean }) {
  const pathname = usePathname() || "";
  const demo = useMemo(() => {
    if (typeof force === "boolean") return force;
    return pathname.startsWith("/app/demo");
  }, [pathname, force]);
  return <DemoModeContext.Provider value={{ demo }}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): boolean {
  return useContext(DemoModeContext).demo;
}
