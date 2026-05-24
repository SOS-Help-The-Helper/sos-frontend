// ManageTabs was the horizontal sub-nav for the "Manage" parent.
// The top nav now exposes Directory / Cases / Volunteers / Inventory / Calendar / Reports
// directly, so this component is intentionally a no-op.
// Kept as an export so existing route files don't need to be touched.
export function ManageTabs() {
  return null;
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  actions,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header
      style={{
        background: "var(--sos-white)",
        borderBottom: "1px solid var(--sos-hairline)",
        padding: "16px 16px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <div style={{ minWidth: 0 }}>
          {eyebrow && <div className="sos-eyebrow" style={{ marginBottom: 4 }}>{eyebrow}</div>}
          <h1
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: 26,
              lineHeight: 1.1,
              color: "var(--sos-navy)",
              margin: 0,
              fontWeight: 400,
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p
              style={{
                fontSize: 13.5,
                color: "var(--sos-muted)",
                margin: "4px 0 0",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
