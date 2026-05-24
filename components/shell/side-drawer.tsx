'use client';

import { useEffect, type ReactNode } from "react";

/**
 * Right-side overlay drawer shared across Inventory, Calendar, Transport,
 * Volunteers, etc. Handles overlay, click-outside, and Escape to close.
 */
export function SideDrawer({
  onClose,
  children,
  className = "",
}: {
  onClose: () => void;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <aside className={`relative ml-auto w-full max-w-md h-full bg-[var(--surface-1)] border-l border-[var(--hairline)] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))] ${className}`}>
        {children}
      </aside>
    </div>
  );
}
