/**
 * SafeLink — drop-in replacement for next/link that guards against undefined href.
 * Falls back to "#" and logs a warning instead of crashing the page.
 * Created after TanStack→Next.js migration crash on 2026-05-25.
 */
'use client';

import Link, { type LinkProps } from "next/link";
import { type AnchorHTMLAttributes, type ReactNode } from "react";

type SafeLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> &
  LinkProps & { children?: ReactNode };

export function SafeLink({ href, children, ...props }: SafeLinkProps) {
  if (!href) {
    if (typeof window !== "undefined") {
      console.warn("[SafeLink] rendered with undefined href. Props:", Object.keys(props));
    }
    return <a href="#" {...props}>{children}</a>;
  }
  return <Link href={href} {...props}>{children}</Link>;
}
