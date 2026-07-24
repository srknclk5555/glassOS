"use client";

import type { ReactNode } from "react";

interface CustomerPageShellProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * CustomerPageShell — Reusable page wrapper for all customer pages.
 *
 * Provides consistent padding, title area with optional description and
 * action buttons. Every customer page (list, detail, tabs) uses this.
 */
export function CustomerPageShell({
  title,
  description,
  actions,
  children,
}: CustomerPageShellProps) {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-text-muted">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2">{actions}</div>
        )}
      </div>

      {/* ── Content ── */}
      <div className="flex-1">{children}</div>
    </div>
  );
}
