import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Users, ShieldCheck, Upload, Settings } from "lucide-react";

const desktopItems = [
  { to: "/directory", icon: Search, label: "Search" },
  { to: "/directory", icon: Users, label: "People" },
  { to: "/directory", icon: ShieldCheck, label: "Credentials" },
  { to: "/directory/import", icon: Upload, label: "Import" },
  { to: "/directory", icon: Settings, label: "Settings" },
];

const mobileItems = [
  { to: "/directory", icon: Search, label: "Search" },
  { to: "/directory", icon: Users, label: "People" },
  { to: "/directory/import", icon: Upload, label: "Import" },
  { to: "/directory", icon: Settings, label: "More" },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-[64px] flex-col items-center gap-1 border-r border-[var(--hairline)] bg-[var(--background)]/80 backdrop-blur-xl py-5 z-40">
      <Link href="/" className="w-9 h-9 rounded-xl bg-[#EF4E4B] flex items-center justify-center text-[11px] font-semibold tracking-tight mb-3 hover:scale-[1.03] transition">
        SOS
      </Link>
      {desktopItems.map((Item, i) => {
        const active =
          (i === 0 && path === "/directory") ||
          (i === 3 && path.startsWith("/directory/import"));
        return (
          <Link
            key={i}
            href={Item.to}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${
              active ? "bg-white/10 text-white" : "text-white/45 hover:text-white hover:bg-white/5"
            }`}
            title={Item.label}
          >
            <Item.icon size={19} strokeWidth={1.75} />
          </Link>
        );
      })}
    </aside>
  );
}

export function MobileBottomNav() {
  const path = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-[var(--hairline)] flex justify-around pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-40">
      {mobileItems.map((Item, i) => {
        const active = (i === 2 && path.startsWith("/directory/import")) || (i !== 2 && path.startsWith("/directory") && !path.startsWith("/directory/import") && i === 0);
        return (
          <Link key={i} href={Item.to} className={`flex flex-col items-center gap-1 px-3 py-1 transition ${active ? "text-[#89CFF0]" : "text-white/55"}`}>
            <Item.icon size={22} strokeWidth={1.75} />
            <span className="text-[10px] font-medium tracking-tight">{Item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
