// ManageTabs was the horizontal sub-nav for the "Manage" parent.
// The sidebar now exposes Directory / Cases / Volunteers / Inventory / Calendar / Reports
// directly via collapsible groups, so this component is intentionally a no-op.
// Kept as an export so existing route files don't need to be touched yet.
export function ManageTabs() {
  return null;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="px-4 md:px-6 pt-5 md:pt-7 pb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between md:gap-4 border-b border-[var(--hairline)]">
      <div className="min-w-0">
        <h1 className="t-page">{title}</h1>
        {subtitle && <p className="t-meta mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap md:flex-nowrap md:shrink-0">{actions}</div>}
    </header>
  );
}
