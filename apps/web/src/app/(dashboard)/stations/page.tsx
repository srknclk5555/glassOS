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
  MapPin,
} from "lucide-react";
import { StationDialog } from "./_components/station-dialog";
import { StationDetailDrawer } from "./_components/station-detail-drawer";
import {
  getStationsAction,
  getStationStatsAction,
  createStationAction,
  updateStationAction,
  deactivateStationAction,
  activateStationAction,
  type StationListFilters,
} from "@/app/actions/stations";

/* ── Types ─────────────────────────────────────────────────────── */

interface Station {
  id: string;
  stationCode: string;
  name: string;
  description: string | null;
  stationType: string;
  sortOrder: number;
  maxConcurrentJobs: number;
  maxMachines: number | null;
  maxOperators: number | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface StationStats {
  total: number;
  active: number;
  inactive: number;
}

/* ── Constants ─────────────────────────────────────────────────── */

const STATION_TYPE_OPTIONS = [
  "cutting", "grinding", "tempering", "insulating_glass",
  "cnc", "drilling", "lamination", "washing",
  "painting", "sandblasting", "quality", "dispatch",
] as const;

/* ── Helpers ───────────────────────────────────────────────────── */

function StationTypeLabel({ type }: { type: string }) {
  const { t } = useI18n();
  const labels: Record<string, string> = {
    cutting: t("stations.typeCutting"),
    grinding: t("stations.typeGrinding"),
    tempering: t("stations.typeTempering"),
    insulating_glass: t("stations.typeInsulatingGlass"),
    cnc: t("stations.typeCnc"),
    drilling: t("stations.typeDrilling"),
    lamination: t("stations.typeLamination"),
    washing: t("stations.typeWashing"),
    painting: t("stations.typePainting"),
    sandblasting: t("stations.typeSandblasting"),
    quality: t("stations.typeQuality"),
    dispatch: t("stations.typeDispatch"),
  };
  return <span>{labels[type] ?? type}</span>;
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function StationsPage() {
  const { t } = useI18n();

  /* ── State ── */
  const [stations, setStations] = useState<Station[]>([]);
  const [stats, setStats] = useState<StationStats>({ total: 0, active: 0, inactive: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<StationListFilters>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  /* ── Dialogs ── */
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editStation, setEditStation] = useState<Station | null>(null);
  const [detailStationId, setDetailStationId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "activate" | "deactivate" } | null>(null);

  /* ── Data Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [stationsResult, statsResult] = await Promise.all([
        getStationsAction({ ...filters, page, pageSize }),
        getStationStatsAction(),
      ]);
      setStations(stationsResult.items as Station[]);
      setTotal(stationsResult.total);
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
    await createStationAction({
      stationCode: data.stationCode,
      name: data.name,
      description: data.description || null,
      stationType: data.stationType,
      sortOrder: parseInt(data.sortOrder) || 0,
      maxConcurrentJobs: parseInt(data.maxConcurrentJobs) || 1,
      maxMachines: data.maxMachines ? parseInt(data.maxMachines) : null,
      maxOperators: data.maxOperators ? parseInt(data.maxOperators) : null,
      isActive: true,
      notes: data.notes || null,
    });
    setAddDialogOpen(false);
    fetchData();
  }, [fetchData]);

  const handleUpdate = useCallback(async (data: any) => {
    if (!editStation) return;
    await updateStationAction({
      id: editStation.id,
      stationCode: data.stationCode,
      name: data.name,
      description: data.description || null,
      stationType: data.stationType,
      sortOrder: parseInt(data.sortOrder) || 0,
      maxConcurrentJobs: parseInt(data.maxConcurrentJobs) || 1,
      maxMachines: data.maxMachines ? parseInt(data.maxMachines) : null,
      maxOperators: data.maxOperators ? parseInt(data.maxOperators) : null,
      notes: data.notes || null,
    });
    setEditStation(null);
    fetchData();
  }, [editStation, fetchData]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    if (confirmAction.action === "deactivate") {
      await deactivateStationAction(confirmAction.id);
    } else {
      await activateStationAction(confirmAction.id);
    }
    setConfirmAction(null);
    fetchData();
  }, [confirmAction, fetchData]);

  /* ── Columns ── */
  const columns: Column<Station>[] = useMemo(() => [
    {
      key: "stationCode",
      header: t("stations.stationCode"),
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-medium text-text-primary">{row.stationCode}</span>
      ),
    },
    {
      key: "name",
      header: t("stations.stationName"),
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
      key: "stationType",
      header: t("stations.stationType"),
      sortable: true,
      render: (row) => <StationTypeLabel type={row.stationType} />,
    },
    {
      key: "sortOrder",
      header: t("stations.sortOrder"),
      sortable: true,
      render: (row) => (
        <span className="text-sm text-text-muted">{row.sortOrder}</span>
      ),
    },
    {
      key: "isActive",
      header: t("stations.status"),
      sortable: true,
      render: (row) => (
        <Badge
          variant="outline"
          className={
            row.isActive
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
              : "bg-slate-500/10 text-slate-500 border-slate-500/20"
          }
        >
          {row.isActive ? t("stations.statusActive") : t("stations.statusInactive")}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: t("stations.actions"),
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDetailStationId(row.id)}
            className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("stations.details")}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setEditStation(row)}
            className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("stations.editStation")}
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
            title={row.isActive ? t("stations.confirmDeactivate") : t("stations.confirmActivate")}
          >
            {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          </button>
        </div>
      ),
    },
  ], [t]);

  /* ── Loading ── */
  if (loading && stations.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState title={t("common.loading")} />
      </div>
    );
  }

  /* ── Error ── */
  if (error && stations.length === 0) {
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
          <h1 className="text-xl font-semibold text-text-primary">{t("stations.title")}</h1>
          <p className="mt-0.5 text-sm text-text-muted">{t("stations.description")}</p>
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
            {t("stations.addStation")}
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted">{t("stations.summaryTotal")}</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-emerald-500">{t("stations.summaryActive")}</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-500">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">{t("stations.summaryInactive")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-500">{stats.inactive}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <SearchBox
            placeholder={t("stations.searchPlaceholder")}
            value={filters.search ?? ""}
            onSearch={(v) => setFilters((p) => ({ ...p, search: v, page: 1 }))}
          />
        </div>
        <Select
          value={filters.stationType ?? "all"}
          onValueChange={(v) => setFilters((p) => ({ ...p, stationType: v === "all" ? undefined : v, page: 1 }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("stations.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("stations.allTypes")}</SelectItem>
            {STATION_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>
                <StationTypeLabel type={type} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.isActive ?? "all"}
          onValueChange={(v) => setFilters((p) => ({ ...p, isActive: v === "all" ? undefined : v, page: 1 }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("stations.allStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("stations.allStatus")}</SelectItem>
            <SelectItem value="true">{t("stations.statusActive")}</SelectItem>
            <SelectItem value="false">{t("stations.statusInactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          <DataGrid
            columns={columns}
            data={stations}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyTitle={t("stations.noStations")}
            emptyDescription={t("stations.noStationsDesc")}
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
      <StationDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleCreate}
        mode="create"
      />

      {editStation && (
        <StationDialog
          open={!!editStation}
          onOpenChange={() => setEditStation(null)}
          onSave={handleUpdate}
          station={editStation}
          mode="edit"
        />
      )}

      <StationDetailDrawer
        stationId={detailStationId}
        onClose={() => setDetailStationId(null)}
      />

      {/* ── Confirm Dialog ── */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.action === "deactivate"
                ? t("stations.confirmDeactivate")
                : t("stations.confirmActivate")}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.action === "deactivate"
                ? t("stations.confirmDeactivate")
                : t("stations.confirmActivate")}
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
              {confirmAction?.action === "deactivate" ? t("stations.confirmDeactivate") : t("stations.confirmActivate")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
