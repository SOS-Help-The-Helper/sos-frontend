import { Link, useRouterState } from "@tanstack/react-router";
import { Map, Heart, Inbox, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Logomark } from "@/components/Logomark";

const items = [
  { to: "/c" as const, label: "Map", icon: Map, match: "/c", exact: true },
  { to: "/c/match" as const, label: "Match", icon: Heart, match: "/c/match" },
  { to: "/c/manage" as const, label: "Manage", icon: Inbox, match: "/c/manage" },
];

export function CitizenShell({ children, title }: { children: ReactNode; title?: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-[var(--background)] text-white flex flex-col">
      <header className="h-14 px-4 flex items-center justify-between border-b border-[var(--hairline)] bg-[var(--background)]/85 backdrop-blur-xl sticky top-0 z-30">
        <Link to="/c" className="flex items-center gap-2 hover:opacity-90">
          <Logomark size={24} />
          <span className="text-[14px] font-semibold tracking-tight">SOS</span>
        </Link>
        {title && <p className="font-mono text-[10px] uppercase tracking-wider text-white/55">{title}</p>}
        <button className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EF4E4B] to-[#89CFF0] flex items-center justify-center">
          <Sparkles size={13} className="text-white" />
        </button>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 glass border-t border-[var(--hairline)] flex justify-around pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-40">
        {items.map((it) => {
          const active = it.exact ? path === it.match : path.startsWith(it.match);
          return (
            <Link
              key={it.label}
              to={it.to}
              className={`flex flex-col items-center gap-1 px-5 py-1 transition ${active ? "text-[#89CFF0]" : "text-white/55"}`}
            >
              <it.icon size={22} strokeWidth={1.75} />
              <span className="font-mono text-[9px] uppercase tracking-wider font-medium">{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
