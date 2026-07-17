"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { cn } from "../../lib/cn";
import { Sidebar, type SidebarItem } from "./sidebar";
import { TopBar, type BreadcrumbItem } from "./topbar";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "../ui/sheet";

interface ShellProps {
  sidebarItems: SidebarItem[];
  sidebarLogo?: React.ReactNode;
  sidebarFooter?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  onSearch?: (query: string) => void;
  topBarChildren?: React.ReactNode;
  sidebarCollapsed?: boolean;
  onToggleSidebar?: () => void;
  onSidebarItemClick?: (item: SidebarItem) => void;
  children: React.ReactNode;
  className?: string;
}

function Shell({
  sidebarItems,
  sidebarLogo,
  sidebarFooter,
  breadcrumbs,
  onSearch,
  topBarChildren,
  sidebarCollapsed = false,
  onToggleSidebar,
  onSidebarItemClick,
  children,
  className,
}: ShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-glass-background">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar
          items={sidebarItems}
          logo={sidebarLogo}
          collapsed={sidebarCollapsed}
          onToggleCollapse={onToggleSidebar}
          onItemClick={onSidebarItemClick}
          footer={sidebarFooter}
        />
      </div>

      {/* Mobile sidebar (sheet/drawer) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <button
            className="fixed left-4 top-3 z-40 rounded-md p-2 text-text-muted md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0">
          <Sidebar
            items={sidebarItems}
            logo={sidebarLogo}
            collapsed={false}
            onItemClick={(item) => {
              onSidebarItemClick?.(item);
              setMobileOpen(false);
            }}
            footer={sidebarFooter}
          />
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
          breadcrumbs={breadcrumbs}
          onSearch={onSearch}
        >
          {topBarChildren}
        </TopBar>

        {/* Scrollable content */}
        <main
          className={cn(
            "flex-1 overflow-y-auto p-4 lg:p-6",
            className,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

export { Shell };
