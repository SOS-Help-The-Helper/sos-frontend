import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, Search, Map, Heart, Layers, Smartphone } from "lucide-react";
import { Logomark } from "@/components/Logomark";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/command" });
  },
  head: () => ({
    meta: [
      { title: "SOS Connect — Humanitarian CRM" },
      { name: "description", content: "Map. Match. Manage. The operating system for humanitarian response." },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div className="min-h-dvh bg-[var(--background)] text-white flex items-center justify-center px-5">
      <div className="max-w-xl w-full py-16">
        <div className="flex items-center gap-2.5 mb-5">
          <Logomark size={32} />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">SOS Connect</span>
        </div>
        <h1 className="text-[40px] md:text-[52px] leading-[1.05] font-semibold tracking-tight">
          Map. Match.<br />Manage.
        </h1>
        <p className="text-white/60 mt-5 text-[17px] leading-relaxed">
          One operating system for humanitarian response — for coordinators and the citizens they serve.
        </p>

        <div className="mt-10 space-y-2">
          <Tile to="/prototypes" icon={Search} color="#89CFF0" label="All prototypes" sub="Review hub · every screen" />
          <Tile to="/map" icon={Map} color="#89CFF0" label="Coordinator · Map" sub="Situational awareness" />
          <Tile to="/match" icon={Heart} color="#EF4E4B" label="Coordinator · Match" sub="Request ↔ org pairing" />
          <Tile to="/manage" icon={Layers} color="#34D399" label="Coordinator · Manage" sub="Directory, Cases, Volunteers…" />
          <Tile to="/c" icon={Smartphone} color="#89CFF0" label="Citizen portal" sub="Map · Match · Manage (mobile)" />
        </div>
      </div>
    </div>
  );
}

function Tile({ to, icon: Icon, color, label, sub }: { to: string; icon: typeof Search; color: string; label: string; sub: string }) {
  return (
    <Link to={to} className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--hairline)] transition">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}26`, color }}>
        <Icon size={18} strokeWidth={1.75} />
      </div>
      <div className="flex-1">
        <p className="font-medium">{label}</p>
        <p className="text-sm text-white/50">{sub}</p>
      </div>
      <ArrowRight size={16} className="text-white/30 group-hover:text-white group-hover:translate-x-0.5 transition" />
    </Link>
  );
}
