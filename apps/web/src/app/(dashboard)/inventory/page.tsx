"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@repo/ui";
import {
  Card,
  CardContent,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DataGrid,
  SearchBox,
  LoadingState,
} from "@repo/ui";
import {
  getInventoryItemsAction,
  getInventoryStatsAction,
} from "@/app/actions/inventory";
import {
  RefreshCw,
  Eye,
  WifiOff,
  Package,
} from "lucide-react";
import { INVENTORY_TYPES } from "@repo/types";
import type { Column } from "@repo/ui";
import type { InventoryListFilters, InventoryItemRow } from "@/app/actions/inventory";
import { InventoryDetailDrawer } from "./_components/inventory-detail-drawer";

/* ── Helper Components ─────────────────────────────────────────── */

function InventoryTypeBadge({ type }: { type: string }) {
  const { t } = useI18n();
  const labels: Record<string, string> = {
    raw_material: t("inventory.typeRawMaterial"),
    semi_finished: t("inventory.typeSemiFinished"),
    finished_product: t("inventory.typeFinishedProduct"),
    traded_goods: t("inventory.typeTradedGoods"),
    consumable: t("inventory.typeConsumable"),
    spare_part: t("inventory.typeSparePart"),
    packaging: t("inventory.typePackaging"),
    service: t("inventory.typeService"),
    scrap: t("inventory.typeScrap"),
    remnant: t("inventory.typeRemnant"),
    by_product: t("inventory.typeByProduct"),
  };
  const colors: Record<string, string> = {
    raw_material: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    semi_finished: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    finished_product: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    traded_goods: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    consumable: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    spare_part: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    packaging: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    service: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    scrap: "bg-red-500/10 text-red-500 border-red-500/20",
    remnant: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    by_product: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  };
  return (
    <Badge variant="outline" className={colors[type] ?? ""}>
      {labels[type] ?? type}
    </Badge>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatQuantity(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function InventoryPage() {
  const { t } = useI18n();

  /* ── State ── */
  const [items, setItems] = useState<InventoryItemRow[]>([]);
  const [stats, setStats] = useState({ totalItems: 0, totalValue: 0, activeLotCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<InventoryListFilters>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);

  /* ── Data Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsResult, statsResult] = await Promise.all([
        getInventoryItemsAction({ ...filters, page, pageSize }),
        getInventoryStatsAction(),
      ]);
      setItems(itemsResult.items as InventoryItemRow[]);
      setTotal(itemsResult.total);
      setStats(statsResult);
    } catch (err: any) {
      setError(err.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  /* ── Columns ── */
  const columns: Column<InventoryItemRow>[] = useMemo(() => [
    {
      key: "inventoryCode",
      header: t("inventory.inventoryCode"),
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-medium text-text-primary">
          {row.inventoryCode}
        </span>
      ),
    },
    {
      key: "name",
      header: t("inventory.inventoryName"),
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-text-primary">{row.name}</p>
          {row.materialName && (
            <p className="text-xs text-text-muted">
              {row.materialCode && (
                <span className="font-mono">{row.materialCode} · </span>
              )}
              {row.materialName}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "inventoryType",
      header: t("inventory.inventoryType"),
      sortable: true,
      render: (row) => <InventoryTypeBadge type={row.inventoryType} />,
    },
    {
      key: "unit",
      header: t("inventory.unit"),
      sortable: true,
      render: (row) => (
        <span className="text-xs text-text-muted">{row.unit}</span>
      ),
    },
    {
      key: "totalQuantity",
      header: t("inventory.totalQuantity"),
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium tabular-nums text-text-primary">
          {formatQuantity(row.totalQuantity)}
        </span>
      ),
    },
    {
      key: "totalValue",
      header: t("inventory.totalValue"),
      sortable: true,
      render: (row) => (
        <span className="text-sm font-medium tabular-nums text-text-primary">
          {formatCurrency(row.totalValue)} ₺
        </span>
      ),
    },
    {
      key: "lotCount",
      header: t("inventory.lotCount"),
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="text-sm tabular-nums text-text-primary">
            {row.activeLotCount}
          </span>
          {row.totalLotCount > row.activeLotCount && (
            <span className="text-xs text-text-muted">
              / {row.totalLotCount}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: t("inventory.actions"),
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDetailItemId(row.id)}
            className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("inventory.details")}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ], [t]);

  /* ── Loading ── */
  if (loading && items.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState title={t("common.loading")} />
      </div>
    );
  }

  /* ── Error ── */
  if (error && items.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10">
            <WifiOff className="h-6 w-6 text-danger" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {t("queue.backendUnavailable")}
            </h2>
            <p className="mt-1 text-sm text-text-muted">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            {t("queue.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">
            {t("inventory.title")}
          </h1>
          <p className="mt-0.5 text-sm text-text-muted">
            {t("inventory.description")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="rounded-lg border border-glass-border bg-glass-surface p-2 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("queue.refresh")}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted">{t("inventory.summaryTotal")}</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">
              {stats.totalItems}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted">{t("inventory.summaryTotalValue")}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-500">
              {formatCurrency(stats.totalValue)} ₺
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted">{t("inventory.summaryActiveLots")}</p>
            <p className="mt-1 text-2xl font-semibold text-blue-500">
              {stats.activeLotCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <SearchBox
            placeholder={t("inventory.searchPlaceholder")}
            value={filters.search ?? ""}
            onChange={(e) =>
              setFilters((p) => ({ ...p, search: e.target.value, page: 1 }))
            }
          />
        </div>
        <Select
          value={filters.inventoryType ?? "all"}
          onValueChange={(v) =>
            setFilters((p) => ({ ...p, inventoryType: v === "all" ? undefined : v, page: 1 }))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t("inventory.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("inventory.allTypes")}</SelectItem>
            {INVENTORY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                <InventoryTypeBadge type={type} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          <DataGrid
            columns={columns}
            data={items}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyTitle={t("inventory.noItems")}
            emptyDescription={t("inventory.noItemsDesc")}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            sortColumn={filters.sortBy}
            sortDirection={filters.sortOrder}
            onSort={(col) =>
              setFilters((p) => ({
                ...p,
                sortBy: col,
                sortOrder:
                  p.sortBy === col && p.sortOrder === "asc" ? "desc" : "asc",
              }))
            }
          />
        </CardContent>
      </Card>

      {/* ── Detail Drawer ── */}
      <InventoryDetailDrawer
        itemId={detailItemId}
        onClose={() => setDetailItemId(null)}
      />
    </div>
  );
}
