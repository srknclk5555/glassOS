"use client";

import * as React from "react";
import { cn } from "../../lib/cn";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────────────────── */

export interface ComboboxOption {
  value: string;
  label: string;
  subtitle?: string;
}

export interface ComboboxProps {
  /** List of options to display */
  options: ComboboxOption[];
  /** Currently selected value */
  value?: string;
  /** Called when an option is selected */
  onChange: (value: string) => void;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Placeholder text in the search input */
  searchPlaceholder?: string;
  /** Text shown when no results match */
  emptyText?: string;
  /** Loading state */
  loading?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Error state */
  error?: boolean;
  /** Optional className */
  className?: string;
  /** Optional icon prefix */
  icon?: React.ReactNode;
  /** Optional width override */
  width?: string;
  /** Max height for the dropdown */
  maxHeight?: string;
  /** Optional: render custom display for selected value */
  displayValue?: (option: ComboboxOption | undefined) => React.ReactNode;
}

/* ─── Component ─────────────────────────────────────────────────────────────── */

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No results found",
  loading = false,
  disabled = false,
  error = false,
  className,
  icon,
  width,
  maxHeight = "240px",
  displayValue,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);

  // Filter options by search
  const filtered = React.useMemo(() => {
    if (!search) return options;
    const q = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        opt.value.toLowerCase().includes(q) ||
        (opt.subtitle && opt.subtitle.toLowerCase().includes(q))
    );
  }, [options, search]);

  // Selected option
  const selected = React.useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  // Reset active index when filtered list changes
  React.useEffect(() => {
    setActiveIndex(0);
  }, [filtered.length]);

  // Close on click outside
  React.useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Focus search input when opened
  React.useEffect(() => {
    if (open && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open]);

  // Scroll active item into view
  React.useEffect(() => {
    if (!listRef.current || !open) return;
    const items = listRef.current.querySelectorAll("[data-combobox-item]");
    const active = items[activeIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => Math.max(prev - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[activeIndex]) {
          onChange(filtered[activeIndex]!.value);
          setOpen(false);
          setSearch("");
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setSearch("");
        break;
    }
  };

  const handleSelect = (optValue: string) => {
    onChange(optValue);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className={cn("relative", className)} style={width ? { width } : undefined}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
          "placeholder:text-text-muted",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-50",
          error && "border-red-500",
          open ? "border-glass-border-hover" : "border-glass-border",
          "hover:border-glass-border-hover"
        )}
      >
        <div className="flex items-center gap-2 truncate">
          {icon && <span className="shrink-0 text-text-muted">{icon}</span>}
          {displayValue ? (
            displayValue(selected) ?? (
              <span className={cn("truncate", !selected && "text-text-muted")}>
                {selected ? selected.label : placeholder}
              </span>
            )
          ) : (
            <span className={cn("truncate", !selected && "text-text-muted")}>
              {selected ? selected.label : placeholder}
            </span>
          )}
        </div>
        {loading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-muted" />
        ) : (
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-text-muted transition-transform duration-200",
              open && "rotate-180"
            )}
          />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute z-50 mt-1 w-full min-w-[var(--combobox-width,200px)] rounded-md border border-glass-border bg-glass-surface shadow-lg",
            "animate-in fade-in-0 zoom-in-95"
          )}
          onKeyDown={handleKeyDown}
        >
          {/* Search Input */}
          <div className="flex items-center border-b border-glass-border px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-text-muted" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex h-9 w-full bg-transparent py-2 text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="shrink-0 text-text-muted hover:text-text-primary"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div
            ref={listRef}
            className="overflow-y-auto p-1"
            style={{ maxHeight }}
          >
            {loading && filtered.length === 0 ? (
              <div className="flex items-center justify-center py-6 text-sm text-text-muted">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-6 text-center text-sm text-text-muted">
                {emptyText}
              </div>
            ) : (
              filtered.map((opt, idx) => (
                <button
                  key={opt.value}
                  type="button"
                  data-combobox-item
                  onClick={() => handleSelect(opt.value)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left",
                    "transition-colors duration-100",
                    idx === activeIndex && "bg-glass-bg-alt text-text-primary",
                    !(idx === activeIndex) && "text-text-primary"
                  )}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      opt.value === value ? "opacity-100 text-icon-primary" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate">{opt.label}</span>
                    {opt.subtitle && (
                      <span className="truncate text-xs text-text-muted">
                        {opt.subtitle}
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
