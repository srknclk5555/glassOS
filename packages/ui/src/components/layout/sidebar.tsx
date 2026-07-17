"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "../../lib/cn";

export interface SidebarItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  href?: string;
  badge?: React.ReactNode;
  active?: boolean;
  children?: SidebarItem[];
}

interface SidebarProps {
  items: SidebarItem[];
  logo?: React.ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onItemClick?: (item: SidebarItem) => void;
  footer?: React.ReactNode;
  className?: string;
}

function Sidebar({
  items,
  logo,
  collapsed = false,
  onToggleCollapse,
  onItemClick,
  footer,
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "flex flex-col border-r border-glass-border bg-glass-background transition-all duration-200",
        collapsed ? "w-16" : "w-60",
        className,
      )}
    >
      {/* Logo area */}
      <div
        className={cn(
          "flex h-16 items-center border-b border-glass-border",
          collapsed ? "justify-center px-2" : "justify-between px-4",
        )}
      >
        {collapsed ? (
          <div className="flex items-center justify-center">{logo}</div>
        ) : (
          <div className="flex items-center gap-2">{logo}</div>
        )}
        <button
          onClick={onToggleCollapse}
          className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-glass-surface-hover hover:text-text-primary"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {items.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onItemClick?.(item)}
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  item.active
                    ? "bg-primary/10 text-primary"
                    : "text-text-secondary hover:bg-glass-surface-hover hover:text-text-primary",
                  collapsed && "justify-center px-2",
                )}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && (
                  <>
                    <span className="ml-3 flex-1 text-left">{item.label}</span>
                    {item.badge && item.badge}
                  </>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Footer */}
      {footer && (
        <div
          className={cn(
            "border-t border-glass-border p-2",
            collapsed && "flex justify-center",
          )}
        >
          {footer}
        </div>
      )}
    </aside>
  );
}

export { Sidebar };
