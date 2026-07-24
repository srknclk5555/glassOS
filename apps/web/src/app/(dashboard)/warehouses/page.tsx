"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@repo/ui";
import {
  Card,
  CardContent,
  DataGrid,
  type Column,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SearchBox,
  LoadingState,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui";
import {
  Plus,
  RefreshCw,
  WifiOff,
  Eye,
  Pencil,
  Power,
  PowerOff,
} from "lucide-react";
import { WarehouseDialog } from "./_components/warehouse-dialog";
import { WarehouseDetailDrawer } from "./_components/warehouse-detail-drawer";
import {
  getWarehousesAction,
  getWarehouseStatsAction,
  createWarehouseAction,
  updateWarehouseAction,
  deactivateWarehouseAction,
  activateWarehouseAction,
  type WarehouseListFilters,
} from "@/app/actions/warehouses";

/* ── Types ─────────────────────────────────────────────────────── */

interface Warehouse {
  id: string;
  warehouseCode: string;
  name: string;
  warehouseType: string;
  description: string | null;
  managerId: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface WarehouseStats {
  total: number;
  active: number;
  inactive: number;
}

/* ── Constants ─────────────────────────────────────────────────── */

const WAREHOUSE_TYPE_OPTIONS = [
  "raw_material", "semi_finished", "finished_goods", "consumables",
  "quality", "scrap", "shipping", "spare_parts",
] as const;

/* ── Helpers ───────────────────────────────────────────────────── */

function StatusBadge({ isActive }: { isActive: boolean }) {
  const { t } = useI18n();
  return (
    <Badge
      variant="outline"
      className={
        isActive
          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          : "bg-slate-500/10 text-slate-500 border-slate-500/20"
      }
    >
      {isActive ? t("warehouses.statusActive") : t("warehouses.statusInactive")}
    </Badge>
  );
}

function WarehouseTypeBadge({ type }: { type: string }) {
  const { t } = useI18n();
  const labels: Record<string, string> = {
    raw_material: t("warehouses.typeRawMaterial"),
    semi_finished: t("warehouses.typeSemiFinished"),
    finished_goods: t("warehouses.typeFinishedGoods"),
    consumables: t("warehouses.typeConsumables"),
    quality: t("warehouses.typeQuality"),
    scrap: t("warehouses.typeScrap"),
    shipping: t("warehouses.typeShipping"),
    spare_parts: t("warehouses.typeSpareParts"),
  };
  const colors: Record<string, string> = {
    raw_material: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    semi_finished: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    finished_goods: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    consumables: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    quality: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    scrap: "bg-red-500/10 text-red-500 border-red-500/20",
    shipping: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    spare_parts: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  };
  return (
    <Badge variant="outline" className={colors[type] ?? ""}>
      {labels[type] ?? type}
    </Badge>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function WarehousesPage() {
  const { t } = useI18n();

  /* ── State ── */
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [stats, setStats] = useState<WarehouseStats>({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<WarehouseListFilters>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  /* ── Dialogs ── */
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editWarehouse, setEditWarehouse] = useState<Warehouse | null>(null);
  const [detailWarehouseId, setDetailWarehouseId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "activate" | "deactivate" } | null>(null);

  /* ── Data Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [warehousesResult, statsResult] = await Promise.all([
        getWarehousesAction({ ...filters, page, pageSize }),
        getWarehouseStatsAction(),
      ]);
      setWarehouses(warehousesResult.items as Warehouse[]);
      setTotal(warehousesResult.total);
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

  /* ── Actions ── */
  const handleCreate = useCallback(async (data: any) => {
    await createWarehouseAction(data);
    setAddDialogOpen(false);
    fetchData();
  }, [fetchData]);

  const handleUpdate = useCallback(async (data: any) => {
    if (!editWarehouse) return;
    await updateWarehouseAction({ ...data, id: editWarehouse.id });
    setEditWarehouse(null);
    fetchData();
  }, [editWarehouse, fetchData]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    if (confirmAction.action === "deactivate") {
      await deactivateWarehouseAction(confirmAction.id);
    } else {
      await activateWarehouseAction(confirmAction.id);
    }
    setConfirmAction(null);
    fetchData();
  }, [confirmAction, fetchData]);

  /* ── Columns ── */
  const columns: Column<Warehouse>[] = useMemo(() => [
    {
      key: "warehouseCode",
      header: t("warehouses.warehouseCode"),
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-medium text-text-primary">{row.warehouseCode}</span>
      ),
    },
    {
      key: "name",
      header: t("warehouses.warehouseName"),
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-text-primary">{row.name}</p>
          {row.description && (
            <p className="text-xs text-text-muted truncate max-w-[200px]">{row.description}</p>
          )}
        </div>
      ),
    },
    {
      key: "warehouseType",
      header: t("warehouses.warehouseType"),
      sortable: true,
      render: (row) => <WarehouseTypeBadge type={row.warehouseType} />,
    },
    {
      key: "isActive",
      header: t("warehouses.status"),
      sortable: true,
      render: (row) => <StatusBadge isActive={row.isActive} />,
    },
    {
      key: "actions",
      header: t("warehouses.actions"),
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDetailWarehouseId(row.id)}
            className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("warehouses.details")}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setEditWarehouse(row)}
            className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("warehouses.editWarehouse")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setConfirmAction({ id: row.id, action: row.isActive ? "deactivate" : "activate" })}
            className={`rounded-md p-1.5 transition-colors ${
              row.isActive
                ? "text-text-muted hover:bg-danger/10 hover:text-danger"
                : "text-text-muted hover:bg-emerald-500/10 hover:text-emerald-500"
            }`}
            title={row.isActive ? t("warehouses.deactivateWarehouse") : t("warehouses.activated")}
          >
            {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          </button>
        </div>
      ),
    },
  ], [t]);

  /* ── Loading ── */
  if (loading && warehouses.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState title={t("common.loading")} />
      </div>
    );
  }

  /* ── Error ── */
  if (error && warehouses.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10">
            <WifiOff className="h-6 w-6 text-danger" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{t("queue.backendUnavailable")}</h2>
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
          <h1 className="text-xl font-semibold text-text-primary">{t("warehouses.title")}</h1>
          <p className="mt-0.5 text-sm text-text-muted">{t("warehouses.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="rounded-lg border border-glass-border bg-glass-surface p-2 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("queue.refresh")}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("warehouses.addWarehouse")}
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted">{t("warehouses.summaryTotal")}</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-emerald-500">{t("warehouses.summaryActive")}</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-500">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">{t("warehouses.summaryInactive")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-500">{stats.inactive}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <SearchBox
            placeholder={t("warehouses.searchPlaceholder")}
            value={filters.search ?? ""}
            onSearch={(v) => setFilters((p) => ({ ...p, search: v, page: 1 }))}
          />
        </div>
        <Select
          value={filters.warehouseType ?? "all"}
          onValueChange={(v) => setFilters((p) => ({ ...p, warehouseType: v === "all" ? undefined : v, page: 1 }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("warehouses.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("warehouses.allTypes")}</SelectItem>
            {WAREHOUSE_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>
                <WarehouseTypeBadge type={type} />
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
            data={warehouses}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyTitle={t("warehouses.noWarehouses")}
            emptyDescription={t("warehouses.noWarehousesDesc")}
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
                sortOrder: p.sortBy === col && p.sortOrder === "asc" ? "desc" : "asc",
              }))
            }
          />
        </CardContent>
      </Card>

      {/* ── Dialogs ── */}
      <WarehouseDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleCreate}
        mode="create"
      />

      {editWarehouse && (
        <WarehouseDialog
          open={!!editWarehouse}
          onOpenChange={() => setEditWarehouse(null)}
          onSave={handleUpdate}
          warehouse={editWarehouse}
          mode="edit"
        />
      )}

      <WarehouseDetailDrawer
        warehouseId={detailWarehouseId}
        onClose={() => setDetailWarehouseId(null)}
      />

      {/* ── Confirm Dialog ── */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.action === "deactivate"
                ? t("warehouses.confirmDeactivate")
                : t("warehouses.confirmActivate")}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.action === "deactivate"
                ? t("warehouses.confirmDeactivate")
                : t("warehouses.confirmActivate")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={confirmAction?.action === "deactivate" ? "destructive" : "primary"}
              onClick={handleConfirmAction}
            >
              {confirmAction?.action === "deactivate" ? t("warehouses.deactivateWarehouse") : t("warehouses.activated")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
