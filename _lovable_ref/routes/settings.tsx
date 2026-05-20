import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { CrmShell } from "@/components/crm/CrmShell";
import { PageHeader } from "@/components/crm/ManageTabs";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings — SOS Connect" }] }),
  component: SettingsLayout,
});

const TABS: { to: string; label: string; exact?: boolean }[] = [
  { to: "/settings", label: "General", exact: true },
  { to: "/settings/org", label: "Organization" },
  { to: "/settings/people", label: "People" },
  { to: "/settings/profile", label: "My profile" },
];

function SettingsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <CrmShell module="Settings">
      <PageHeader title="Settings" subtitle="Manage your organization, the people on it, and how you show up across SOS Connect." />
      <div className="px-4 md:px-6 border-b border-[var(--hairline)]">
        <nav className="flex gap-1 overflow-x-auto -mb-px">
          {TABS.map((t) => {
            const active = t.exact ? path === t.to : path.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`relative px-3 py-2.5 text-[13px] font-medium whitespace-nowrap transition ${
                  active ? "text-white" : "text-white/55 hover:text-white/80"
                }`}
              >
                {t.label}
                {active && <span className="absolute left-2 right-2 bottom-0 h-[2px] rounded-full bg-[#89CFF0]" />}
              </Link>
            );
          })}
        </nav>
      </div>
      <div className="px-4 md:px-6 pt-6 pb-10 max-w-3xl">
        <Outlet />
      </div>
    </CrmShell>
  );
}
