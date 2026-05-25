"use client";

import Link from "next/link";
import { ChevronLeft, ChevronDown, Inbox, type LucideIcon } from "lucide-react";
import { useState, type ReactNode } from "react";

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
              {t.count != null && (
                <span
                  className={`font-mono text-[9.5px] px-1.5 py-0.5 rounded ${
                    isActive ? "bg-white/12 text-white/85" : "bg-white/6 text-white/55"
                  }`}
                >
                  {t.count}
                </span>
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
      <div className="max-w-[960px] mx-auto px-6 h-12 flex items-center">
        <Link
          href={backTo}
          className="inline-flex items-center gap-1 text-[13px] text-white/60 hover:text-white transition -ml-1.5"
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
  title: string;
  pills?: ReactNode;
  chips?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="flex items-start gap-5">
      {avatar && <div className="shrink-0">{avatar}</div>}
      <div className="min-w-0 flex-1">
        {(eyebrow || pills) && (
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {eyebrow}
            {pills}
          </div>
        )}
        <h1 className="text-[26px] font-semibold tracking-tight leading-tight">{title}</h1>
        {chips && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-[12px] text-white/60">
            {chips}
          </div>
        )}
      </div>
      {actions && <div className="flex items-center gap-1.5 shrink-0">{actions}</div>}
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

export function ContextCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] overflow-hidden">
      <div className="px-4 py-2.5 border-b border-[var(--hairline)]">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/45">{title}</span>
      </div>
      <div className="px-4 py-3 space-y-2">{children}</div>
    </section>
  );
}

export function ContextRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 text-[12px]">
      <span className="text-white/45 shrink-0">{label}</span>
      <span className="text-white/85 text-right">{value}</span>
    </div>
  );
}

export function DetailLayout({ main, rail }: { main: ReactNode; rail: ReactNode }) {
  return (
    <div className="flex gap-5 items-start">
      <div className="min-w-0 flex-1 space-y-4">{main}</div>
      <div className="hidden lg:flex flex-col gap-3 w-64 shrink-0">{rail}</div>
    </div>
  );
}
