"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@repo/ui";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DataGrid,
  SearchBox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  LoadingState,
} from "@repo/ui";
import {
  getMaterialsAction,
  getMaterialStatsAction,
  createMaterialAction,
  updateMaterialAction,
  deactivateMaterialAction,
  activateMaterialAction,
  blockMaterialAction,
} from "@/app/actions/materials";
import { MaterialDialog } from "./_components/material-dialog";
import { MaterialDetailDrawer } from "./_components/material-detail-drawer";
import {
  Plus,
  RefreshCw,
  Eye,
  Pencil,
  PowerOff,
  Power,
  Ban,
  WifiOff,
} from "lucide-react";
import { MATERIAL_TYPES } from "@repo/types";
import type { Column } from "@repo/ui";
import type { MaterialListFilters } from "@/app/actions/materials";

/* ── Types ─────────────────────────────────────────────────────── */

interface Material {
  id: string;
  materialCode: string;
  name: string;
  shortName: string | null;
  materialType: string;
  materialGroupId: string | null;
  defaultWarehouseId: string | null;
  baseUnit: string;
  status: string;
  isActive: boolean;
  barcode: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MaterialStats {
  total: number;
  active: number;
  blocked: number;
  inactive: number;
}

/* ── Helper Components ─────────────────────────────────────────── */

function MaterialTypeBadge({ type }: { type: string }) {
  const { t } = useI18n();
  const labels: Record<string, string> = {
    raw_material: t("materials.typeRawMaterial"),
    semi_finished: t("materials.typeSemiFinished"),
    finished_good: t("materials.typeFinishedGood"),
    consumable: t("materials.typeConsumable"),
    spare_part: t("materials.typeSparePart"),
    packaging: t("materials.typePackaging"),
    chemical: t("materials.typeChemical"),
    service: t("materials.typeService"),
    other: t("materials.typeOther"),
  };
  const colors: Record<string, string> = {
    raw_material: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    semi_finished: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    finished_good: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    consumable: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    spare_part: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    packaging: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    chemical: "bg-red-500/10 text-red-500 border-red-500/20",
    service: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    other: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  };
  return (
    <Badge variant="outline" className={colors[type] ?? ""}>
      {labels[type] ?? type}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: t("materials.statusActive"),
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    passive: {
      label: t("materials.statusPassive"),
      className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    },
    blocked: {
      label: t("materials.statusBlocked"),
      className: "bg-red-500/10 text-red-500 border-red-500/20",
    },
  };
  const c = (config[status] ?? config.passive)!;
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function MaterialsPage() {
  const { t } = useI18n();

  /* ── State ── */
  const [materials, setMaterials] = useState<Material[]>([]);
  const [stats, setStats] = useState<MaterialStats>({ total: 0, active: 0, blocked: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MaterialListFilters>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  /* ── Dialogs ── */
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editMaterial, setEditMaterial] = useState<Material | null>(null);
  const [detailMaterialId, setDetailMaterialId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "activate" | "deactivate" | "block" } | null>(null);

  /* ── Data Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [materialsResult, statsResult] = await Promise.all([
        getMaterialsAction({ ...filters, page, pageSize }),
        getMaterialStatsAction(),
      ]);
      setMaterials(materialsResult.items as Material[]);
      setTotal(materialsResult.total);
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
    await createMaterialAction(data);
    setAddDialogOpen(false);
    fetchData();
  }, [fetchData]);

  const handleUpdate = useCallback(async (data: any) => {
    if (!editMaterial) return;
    await updateMaterialAction({ ...data, id: editMaterial.id });
    setEditMaterial(null);
    fetchData();
  }, [editMaterial, fetchData]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    if (confirmAction.action === "deactivate") {
      await deactivateMaterialAction(confirmAction.id);
    } else if (confirmAction.action === "activate") {
      await activateMaterialAction(confirmAction.id);
    } else {
      await blockMaterialAction(confirmAction.id);
    }
    setConfirmAction(null);
    fetchData();
  }, [confirmAction, fetchData]);

  /* ── Columns ── */
  const columns: Column<Material>[] = useMemo(() => [
    {
      key: "materialCode",
      header: t("materials.materialCode"),
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-medium text-text-primary">{row.materialCode}</span>
      ),
    },
    {
      key: "name",
      header: t("materials.materialName"),
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-text-primary">{row.name}</p>
          {row.shortName && (
            <p className="text-xs text-text-muted">{row.shortName}</p>
          )}
        </div>
      ),
    },
    {
      key: "materialType",
      header: t("materials.materialType"),
      sortable: true,
      render: (row) => <MaterialTypeBadge type={row.materialType} />,
    },
    {
      key: "baseUnit",
      header: t("materials.baseUnit"),
      sortable: true,
      render: (row) => (
        <span className="text-xs text-text-muted">{row.baseUnit}</span>
      ),
    },
    {
      key: "status",
      header: t("materials.status"),
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: t("materials.actions"),
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDetailMaterialId(row.id)}
            className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("materials.details")}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setEditMaterial(row)}
            className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("materials.editMaterial")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (row.status === "blocked") {
                setConfirmAction({ id: row.id, action: "activate" });
              } else if (!row.isActive) {
                setConfirmAction({ id: row.id, action: "activate" });
              } else {
                setConfirmAction({ id: row.id, action: "deactivate" });
              }
            }}
            className={`rounded-md p-1.5 transition-colors ${
              !row.isActive || row.status === "blocked"
                ? "text-text-muted hover:bg-emerald-500/10 hover:text-emerald-500"
                : "text-text-muted hover:bg-danger/10 hover:text-danger"
            }`}
            title={
              !row.isActive || row.status === "blocked"
                ? t("materials.confirmActivate")
                : t("materials.deactivateMaterial")
            }
          >
            {!row.isActive || row.status === "blocked" ? (
              <Power className="h-3.5 w-3.5" />
            ) : (
              <PowerOff className="h-3.5 w-3.5" />
            )}
          </button>
          {row.isActive && row.status !== "blocked" && (
            <button
              onClick={() => setConfirmAction({ id: row.id, action: "block" })}
              className="rounded-md p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors"
              title={t("materials.confirmBlock")}
            >
              <Ban className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ], [t]);

  /* ── Loading ── */
  if (loading && materials.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState title={t("common.loading")} />
      </div>
    );
  }

  /* ── Error ── */
  if (error && materials.length === 0) {
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
          <h1 className="text-xl font-semibold text-text-primary">{t("materials.title")}</h1>
          <p className="mt-0.5 text-sm text-text-muted">{t("materials.description")}</p>
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
            {t("materials.addMaterial")}
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted">{t("materials.summaryTotal")}</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-emerald-500">{t("materials.summaryActive")}</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-500">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-red-500">{t("materials.summaryBlocked")}</p>
            <p className="mt-1 text-2xl font-semibold text-red-500">{stats.blocked}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <SearchBox
            placeholder={t("materials.searchPlaceholder")}
            value={filters.search ?? ""}
            onSearch={(v) => setFilters((p) => ({ ...p, search: v, page: 1 }))}
          />
        </div>
        <Select
          value={filters.materialType ?? "all"}
          onValueChange={(v) => setFilters((p) => ({ ...p, materialType: v === "all" ? undefined : v, page: 1 }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("materials.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("materials.allTypes")}</SelectItem>
            {MATERIAL_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                <MaterialTypeBadge type={type} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => setFilters((p) => ({ ...p, status: v === "all" ? undefined : v, page: 1 }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("materials.allStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("materials.allStatus")}</SelectItem>
            <SelectItem value="active">
              <StatusBadge status="active" />
            </SelectItem>
            <SelectItem value="passive">
              <StatusBadge status="passive" />
            </SelectItem>
            <SelectItem value="blocked">
              <StatusBadge status="blocked" />
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          <DataGrid
            columns={columns}
            data={materials}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyTitle={t("materials.noMaterials")}
            emptyDescription={t("materials.noMaterialsDesc")}
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
      <MaterialDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleCreate}
        mode="create"
      />

      {editMaterial && (
        <MaterialDialog
          open={!!editMaterial}
          onOpenChange={() => setEditMaterial(null)}
          onSave={handleUpdate}
          material={editMaterial as any}
          mode="edit"
        />
      )}

      <MaterialDetailDrawer
        materialId={detailMaterialId}
        onClose={() => setDetailMaterialId(null)}
      />

      {/* ── Confirm Dialog ── */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.action === "deactivate"
                ? t("materials.confirmDeactivate")
                : confirmAction?.action === "block"
                ? t("materials.confirmBlock")
                : t("materials.confirmActivate")}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.action === "deactivate"
                ? t("materials.confirmDeactivate")
                : confirmAction?.action === "block"
                ? t("materials.confirmBlock")
                : t("materials.confirmActivate")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleConfirmAction}>
              {confirmAction?.action === "deactivate"
                ? t("materials.deactivateMaterial")
                : confirmAction?.action === "block"
                ? t("materials.confirmBlock")
                : t("materials.confirmActivate")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
