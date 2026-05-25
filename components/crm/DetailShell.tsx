import Link from "next/link";
import { ChevronLeft, ChevronDown, Inbox, MoreHorizontal, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type DetailTab = {
  key: string;
  label: string;
  count?: number;
  content: ReactNode;
};

export function DetailTabs({ tabs, defaultKey }: { tabs: DetailTab[]; defaultKey?: string }) {
  const [active, setActive] = useState(defaultKey ?? tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] overflow-hidden">
      <div
        className="flex items-center gap-1 px-2 border-b border-[var(--hairline)] overflow-x-auto"
        role="tablist"
      >
        {tabs.map((t) => {
          const isActive = t.key === current?.key;
          // Only show count on the active tab, and only when > 0
          const showCount = isActive && t.count != null && t.count > 0;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(t.key)}
              className={`relative inline-flex items-center gap-1.5 h-10 px-3 text-[12.5px] font-medium transition whitespace-nowrap ${
                isActive ? "text-white" : "text-white/55 hover:text-white/85"
              }`}
            >
              {t.label}
              {showCount && (
                <span className="font-mono text-[10px] text-white/45 tabular-nums">{t.count}</span>
              )}
              {isActive && (
                <span className="absolute left-2 right-2 bottom-0 h-[2px] rounded-t bg-[#89CFF0]" />
              )}
            </button>
          );
        })}
      </div>
      <div className="p-4">{current?.content}</div>
    </section>
  );
}

export function EmptyTab({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Inbox size={20} className="text-white/25 mb-2" />
      <p className="text-[12.5px] text-white/55">{label}</p>
    </div>
  );
}

export function DetailTopBar({ backTo, backLabel }: { backTo: string; backLabel: string }) {
  return (
    <header className="sticky top-0 z-30 glass border-b border-[var(--hairline)]">
      <div className="max-w-[960px] mx-auto px-4 md:px-6 h-12 flex items-center">
        <Link
          href={backTo}
          className="inline-flex items-center gap-1 text-[13px] text-white/60 hover:text-white transition"
        >
          <ChevronLeft size={16} /> {backLabel}
        </Link>
      </div>
    </header>
  );
}

export function IdentityBand({
  avatar,
  eyebrow,
  title,
  pills,
  chips,
  actions,
}: {
  avatar?: ReactNode;
  eyebrow?: ReactNode;
  title: ReactNode;
  pills?: ReactNode;
  chips?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 md:flex-row md:items-start md:gap-5">
      <div className="flex items-start gap-4 md:gap-5 min-w-0">
        {avatar && <div className="shrink-0">{avatar}</div>}
        <div className="min-w-0 flex-1">
          {(eyebrow || pills) && (
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              {eyebrow}
              {pills}
            </div>
          )}
          <h1 className="text-[22px] md:text-[26px] font-semibold tracking-tight leading-tight">{title}</h1>
          {chips && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[12px] text-white/60">
              {chips}
            </div>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-1.5 flex-wrap md:shrink-0 md:flex-nowrap [&_button]:min-h-[40px] md:[&_button]:min-h-0 [&_a]:min-h-[40px] md:[&_a]:min-h-0">{actions}</div>
      )}
    </section>
  );
}

export function DetailSection({
  title,
  count,
  defaultOpen = false,
  icon: Icon,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03] transition"
      >
        {Icon && <Icon size={14} className="text-white/45 shrink-0" />}
        <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-white/70 font-medium">
          {title}
        </span>
        {count != null && (
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/8 text-white/55">
            {count}
          </span>
        )}
        <span className="flex-1" />
        <ChevronDown
          size={14}
          className={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <div className="border-t border-[var(--hairline)] p-4">{children}</div>}
    </section>
  );
}

export function HeroPanel({ children, padded = true }: { children: ReactNode; padded?: boolean }) {
  return (
    <section className={`rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] ${padded ? "p-4" : ""}`}>
      {children}
    </section>
  );
}

export function MetaChip({ icon: Icon, children }: { icon?: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-white/65">
      {Icon && <Icon size={12} className="text-white/40" />}
      {children}
    </span>
  );
}

/**
 * Single combined status pill. Replaces stacked urgency + state pills.
 * Color is derived from a tint hex; label is shown verbatim (e.g. "Critical · In progress").
 */
export function StatusPill({ tint, children }: { tint: string; children: ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ color: tint, background: `${tint}1a` }}
    >
      <span className="w-1 h-1 rounded-full" style={{ background: tint }} />
      {children}
    </span>
  );
}

/**
 * "Details" toggle for the IdentityBand. Pass collapsed chips as children; they render
 * below the band when expanded, in a muted row aligned with the title.
 */
export function MetaPopover({
  label = "Details",
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-white/55 hover:text-white/85 transition"
      >
        {open ? `Hide ${label.toLowerCase()}` : label}
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="basis-full flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-white/55 mt-1">
          {children}
        </div>
      )}
    </>
  );
}

export type OverflowAction = {
  label: string;
  onClick?: () => void;
  danger?: boolean;
  icon?: LucideIcon;
};

/**
 * The `⋯` button used in IdentityBand actions. Standardizes how Close / Flag /
 * Reassign / Share appear across every detail page.
 */
export function OverflowMenu({ actions }: { actions: OverflowAction[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-md hover:bg-white/8 text-white/55 hover:text-white flex items-center justify-center transition"
        aria-label="More actions"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div
          className="absolute top-full right-0 mt-1 z-40 w-52 rounded-lg p-1.5"
          style={{
            background: "var(--sos-white)",
            border: "1px solid var(--sos-hairline)",
            boxShadow: "0 12px 32px rgba(15,30,43,0.18)",
          }}
        >
          {actions.map((a, i) => {
            const Icon = a.icon;
            return (
              <button
                key={i}
                onClick={() => {
                  setOpen(false);
                  a.onClick?.();
                }}
                className={`w-full flex items-center gap-2 px-2 h-8 rounded-md text-left text-[12.5px] transition ${
                  a.danger
                    ? "text-[#EF4E4B] hover:bg-[#EF4E4B]/10"
                    : "text-[var(--sos-navy)] hover:bg-[var(--sos-card-gray)]"
                }`}
              >
                {Icon && <Icon size={13} className={a.danger ? "" : "text-[var(--sos-muted)]"} />}
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Single-line hero metric. Replaces 4-up KPI grids.
 *  - `primary` is the bold reading (e.g. "3 of 4 requests fulfilled")
 *  - `meta` is the muted suffix (e.g. "2 orgs · day 3")
 *  - `progress` (0-100) renders a thin bar tinted with `accent`
 */
export function HeroLine({
  primary,
  meta,
  progress,
  accent = "#89CFF0",
}: {
  primary: ReactNode;
  meta?: ReactNode;
  progress?: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--surface-1)] px-4 py-3">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-[13px] text-white/85 min-w-0 truncate">{primary}</p>
        {meta && <p className="font-mono text-[10.5px] text-white/45 tabular-nums shrink-0">{meta}</p>}
      </div>
      {progress != null && (
        <div className="h-1 rounded-full bg-white/6 overflow-hidden">
          <div
            className="h-full rounded-full transition-[width]"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%`, background: accent }}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Standard primary/secondary button used in IdentityBand action rows.
 * Keeps action styling consistent across every detail page.
 */
export function ActionBtn({
  icon: Icon,
  label,
  primary,
  onClick,
}: {
  icon?: LucideIcon;
  label: string;
  primary?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[12px] font-medium transition ${
        primary
          ? "bg-[#EF4E4B] hover:bg-[#d94340] text-white"
          : "bg-[var(--sos-white)] hover:bg-[var(--sos-card-gray)] text-[var(--sos-navy)] border border-[var(--sos-hairline)]"
      }`}
    >
      {Icon && <Icon size={12} strokeWidth={2} />}
      {label}
    </button>
  );
}
