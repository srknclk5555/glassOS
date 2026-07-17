"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "../../lib/cn";

interface SearchBoxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onSearch?: (value: string) => void;
}

const SearchBox = React.forwardRef<HTMLInputElement, SearchBoxProps>(
  ({ className, onSearch, onChange, ...props }, ref) => {
    return (
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <input
          ref={ref}
          type="search"
          className={cn(
            "flex h-10 w-full rounded-lg border border-glass-border bg-glass-surface pl-10 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "hover:border-glass-border-hover",
            className,
          )}
          onChange={(e) => {
            onChange?.(e);
            onSearch?.(e.target.value);
          }}
          {...props}
        />
      </div>
    );
  },
);
SearchBox.displayName = "SearchBox";

export { SearchBox };
