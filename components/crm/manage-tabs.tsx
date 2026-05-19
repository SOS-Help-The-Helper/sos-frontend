"use client";

import type { ReactNode } from "react";

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
  actions?: ReactNode;
}) {
  return (
    <header className="px-6 pt-7 pb-4 flex items-end justify-between gap-4 border-b border-[var(--hairline)]">
      <div className="min-w-0">
        <h1 className="t-page truncate">{title}</h1>
        {subtitle && <p className="t-meta mt-1.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
