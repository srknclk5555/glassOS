"use client";

import * as React from "react";
import { cn } from "../../lib/cn";
import { SearchBox } from "../ui/search-box";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../ui/breadcrumb";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopBarProps {
  breadcrumbs?: BreadcrumbItem[];
  onSearch?: (query: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  className?: string;
}

function TopBar({
  breadcrumbs,
  onSearch,
  searchPlaceholder = "Search...",
  children,
  className,
}: TopBarProps) {
  return (
    <header
      className={cn(
        "flex h-16 items-center justify-between border-b border-glass-border bg-glass-background px-4 lg:px-6",
        className,
      )}
    >
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-4">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, i) => {
                const isLast = i === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.label}>
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </React.Fragment>
                );
              })}
            </BreadcrumbList>
          </Breadcrumb>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {onSearch && (
          <SearchBox
            placeholder={searchPlaceholder}
            onSearch={onSearch}
            className="hidden w-56 md:flex"
          />
        )}
        {children}
      </div>
    </header>
  );
}

export { TopBar, type BreadcrumbItem };
