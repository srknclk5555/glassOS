"use client";

import * as React from "react";
import { cn } from "../../lib/cn";
import { Skeleton } from "../ui/skeleton";
import { EmptyState } from "../ui/empty-state";
import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */

export interface Column<T> {
  key: string;
  header: string;
  sortable?: boolean;
  filterable?: boolean;
  render: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
}

export interface DataGridProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (column: string) => void;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  pageSize?: number;
  page?: number;
  onPageChange?: (page: number) => void;
  total?: number;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  className?: string;
}

/* ── Sort Icon ──────────────────────────────────────────────────── */

function SortIcon({
  column,
  sortColumn,
  sortDirection,
}: {
  column: string;
  sortColumn?: string;
  sortDirection?: "asc" | "desc";
}) {
  if (sortColumn !== column) {
    return <ChevronsUpDown className="ml-1 h-3.5 w-3.5 text-text-muted" />;
  }
  return sortDirection === "asc" ? (
    <ChevronUp className="ml-1 h-3.5 w-3.5" />
  ) : (
    <ChevronDown className="ml-1 h-3.5 w-3.5" />
  );
}

/* ── Pagination ─────────────────────────────────────────────────── */

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between border-t border-glass-border px-4 py-3">
      <p className="text-sm text-text-muted">
        {total} result{total !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-md px-2 py-1 text-sm text-text-muted transition-colors hover:bg-glass-surface-hover hover:text-text-primary disabled:opacity-50 disabled:pointer-events-none"
        >
          Previous
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          const startPage = Math.max(1, page - 2);
          const pageNum = startPage + i;
          if (pageNum > totalPages) return null;
          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={cn(
                "rounded-md px-3 py-1 text-sm transition-colors",
                pageNum === page
                  ? "bg-primary text-primary-foreground"
                  : "text-text-muted hover:bg-glass-surface-hover hover:text-text-primary",
              )}
            >
              {pageNum}
            </button>
          );
        })}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-md px-2 py-1 text-sm text-text-muted transition-colors hover:bg-glass-surface-hover hover:text-text-primary disabled:opacity-50 disabled:pointer-events-none"
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ── DataGrid ───────────────────────────────────────────────────── */

function DataGrid<T>({
  columns,
  data,
  keyExtractor,
  sortColumn,
  sortDirection,
  onSort,
  loading = false,
  emptyTitle = "No data",
  emptyDescription,
  pageSize = 20,
  page = 1,
  onPageChange,
  total,
  onRowClick,
  rowActions,
  className,
}: DataGridProps<T>) {
  if (loading) {
    return (
      <div className={cn("rounded-xl border border-glass-border bg-glass-surface", className)}>
        <div className="border-b border-glass-border px-4 py-3">
          <div className="flex gap-4">
            {columns.map((col) => (
              <Skeleton key={col.key} className="h-4 flex-1" />
            ))}
          </div>
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border-b border-glass-border px-4 py-3 last:border-0">
            <div className="flex gap-4">
              {columns.map((col) => (
                <Skeleton key={col.key} className="h-4 flex-1" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn("rounded-xl border border-glass-border bg-glass-surface", className)}>
        <EmptyState title={emptyTitle} description={emptyDescription} />
      </div>
    );
  }

  const displayedTotal = total ?? data.length;

  return (
    <div className={cn("rounded-xl border border-glass-border bg-glass-surface", className)}>
      {/* Scrollable table container */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead>
            <tr className="border-b border-glass-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "sticky top-0 bg-glass-surface px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted",
                    col.sortable && "cursor-pointer select-none hover:text-text-primary",
                    col.headerClassName,
                  )}
                  onClick={() => col.sortable && onSort?.(col.key)}
                >
                  <div className="flex items-center">
                    {col.header}
                    {col.sortable && (
                      <SortIcon
                        column={col.key}
                        sortColumn={sortColumn}
                        sortDirection={sortDirection}
                      />
                    )}
                  </div>
                </th>
              ))}
              {rowActions && (
                <th className="sticky top-0 bg-glass-surface px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                  Actions
                </th>
              )}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-glass-border">
            {data.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={cn(
                  "transition-colors hover:bg-glass-surface-hover",
                  onRowClick && "cursor-pointer",
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-sm text-text-primary",
                      col.className,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {onPageChange && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={displayedTotal}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}

export { DataGrid };
