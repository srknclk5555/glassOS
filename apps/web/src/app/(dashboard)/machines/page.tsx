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
import { MachineDialog } from "./_components/machine-dialog";
import { MachineDetailDrawer } from "./_components/machine-detail-drawer";
import {
  getMachinesAction,
  getMachineStatsAction,
  createMachineAction,
  updateMachineAction,
  deactivateMachineAction,
  activateMachineAction,
  type MachineListFilters,
} from "@/app/actions/machines";

/* ── Types ─────────────────────────────────────────────────────── */

interface Machine {
  id: string;
  machineCode: string;
  name: string;
  machineType: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  manufactureYear: number | null;
  purchasedAt: string | null;
  commissionedAt: string | null;
  warrantyStartsAt: string | null;
  warrantyEndsAt: string | null;
  status: string;
  isActive: boolean;
  hourlyCapacity: string | null;
  dailyCapacity: string | null;
  maxGlassWidthMm: string | null;
  maxGlassHeightMm: string | null;
  maxThicknessMm: string | null;
  minThicknessMm: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MachineStats {
  total: number;
  active: number;
  inMaintenance: number;
  idle: number;
}

/* ── Helpers ───────────────────────────────────────────────────── */

const MACHINE_TYPE_OPTIONS = [
  "cutting", "grinding", "tempering", "insulating_glass",
  "cnc", "drilling", "lamination", "washing",
  "painting", "sandblasting", "quality", "dispatch",
] as const;

const MACHINE_STATUS_OPTIONS = ["active", "maintenance", "idle", "decommissioned"] as const;

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: t("machines.statusActive"),
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    maintenance: {
      label: t("machines.statusMaintenance"),
      className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
    idle: {
      label: t("machines.statusIdle"),
      className: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    },
    decommissioned: {
      label: t("machines.statusDecommissioned"),
      className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    },
  };
  const c = (config[status] ?? config.idle)!;
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  );
}

function MachineTypeLabel({ type }: { type: string }) {
  const { t } = useI18n();
  const labels: Record<string, string> = {
    cutting: t("machines.typeCutting"),
    grinding: t("machines.typeGrinding"),
    tempering: t("machines.typeTempering"),
    insulating_glass: t("machines.typeInsulatingGlass"),
    cnc: t("machines.typeCnc"),
    drilling: t("machines.typeDrilling"),
    lamination: t("machines.typeLamination"),
    washing: t("machines.typeWashing"),
    painting: t("machines.typePainting"),
    sandblasting: t("machines.typeSandblasting"),
    quality: t("machines.typeQuality"),
    dispatch: t("machines.typeDispatch"),
  };
  return <span>{labels[type] ?? type}</span>;
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function MachinesPage() {
  const { t } = useI18n();

  /* ── State ── */
  const [machines, setMachines] = useState<Machine[]>([]);
  const [stats, setStats] = useState<MachineStats>({ total: 0, active: 0, inMaintenance: 0, idle: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MachineListFilters>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  /* ── Dialogs ── */
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [detailMachineId, setDetailMachineId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "activate" | "deactivate" } | null>(null);

  /* ── Data Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [machinesResult, statsResult] = await Promise.all([
        getMachinesAction({ ...filters, page, pageSize }),
        getMachineStatsAction(),
      ]);
      setMachines(machinesResult.items as Machine[]);
      setTotal(machinesResult.total);
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
    await createMachineAction(data);
    setAddDialogOpen(false);
    fetchData();
  }, [fetchData]);

  const handleUpdate = useCallback(async (data: any) => {
    if (!editMachine) return;
    await updateMachineAction({ ...data, id: editMachine.id });
    setEditMachine(null);
    fetchData();
  }, [editMachine, fetchData]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    if (confirmAction.action === "deactivate") {
      await deactivateMachineAction(confirmAction.id);
    } else {
      await activateMachineAction(confirmAction.id);
    }
    setConfirmAction(null);
    fetchData();
  }, [confirmAction, fetchData]);

  /* ── Columns ── */
  const columns: Column<Machine>[] = useMemo(() => [
    {
      key: "machineCode",
      header: t("machines.machineCode"),
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-medium text-text-primary">{row.machineCode}</span>
      ),
    },
    {
      key: "name",
      header: t("machines.machineName"),
      sortable: true,
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-text-primary">{row.name}</p>
          {row.brand && (
            <p className="text-xs text-text-muted">{row.brand}{row.model ? ` - ${row.model}` : ""}</p>
          )}
        </div>
      ),
    },
    {
      key: "machineType",
      header: t("machines.machineType"),
      sortable: true,
      render: (row) => <MachineTypeLabel type={row.machineType} />,
    },
    {
      key: "status",
      header: t("machines.status"),
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "hourlyCapacity",
      header: t("machines.capacity"),
      render: (row) => (
        <span className="text-xs text-text-muted">
          {row.hourlyCapacity ? `${row.hourlyCapacity}/h` : row.dailyCapacity ? `${row.dailyCapacity}/d` : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: t("machines.actions"),
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDetailMachineId(row.id)}
            className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("machines.details")}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setEditMachine(row)}
            className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("machines.editMachine")}
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
            title={row.isActive ? t("machines.deleteMachine") : t("machines.activated")}
          >
            {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          </button>
        </div>
      ),
    },
  ], [t]);

  /* ── Loading ── */
  if (loading && machines.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState title={t("common.loading")} />
      </div>
    );
  }

  /* ── Error ── */
  if (error && machines.length === 0) {
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
          <h1 className="text-xl font-semibold text-text-primary">{t("machines.title")}</h1>
          <p className="mt-0.5 text-sm text-text-muted">{t("machines.description")}</p>
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
            {t("machines.addMachine")}
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted">{t("machines.summaryTotal")}</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-emerald-500">{t("machines.summaryActive")}</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-500">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-amber-500">{t("machines.summaryMaintenance")}</p>
            <p className="mt-1 text-2xl font-semibold text-amber-500">{stats.inMaintenance}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-sky-500">{t("machines.summaryIdle")}</p>
            <p className="mt-1 text-2xl font-semibold text-sky-500">{stats.idle}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <SearchBox
            placeholder={t("machines.searchPlaceholder")}
            value={filters.search ?? ""}
            onSearch={(v) => setFilters((p) => ({ ...p, search: v, page: 1 }))}
          />
        </div>
        <Select
          value={filters.machineType ?? "all"}
          onValueChange={(v) => setFilters((p) => ({ ...p, machineType: v === "all" ? undefined : v, page: 1 }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("machines.allTypes")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("machines.allTypes")}</SelectItem>
            {MACHINE_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type} value={type}>
                <MachineTypeLabel type={type} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => setFilters((p) => ({ ...p, status: v === "all" ? undefined : v, page: 1 }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("machines.allStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("machines.allStatus")}</SelectItem>
            {MACHINE_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                <StatusBadge status={s} />
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
            data={machines}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyTitle={t("machines.noMachines")}
            emptyDescription={t("machines.noMachinesDesc")}
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
      <MachineDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleCreate}
        mode="create"
      />

      {editMachine && (
        <MachineDialog
          open={!!editMachine}
          onOpenChange={() => setEditMachine(null)}
          onSave={handleUpdate}
          machine={editMachine}
          mode="edit"
        />
      )}

      <MachineDetailDrawer
        machineId={detailMachineId}
        onClose={() => setDetailMachineId(null)}
      />

      {/* ── Confirm Dialog ── */}
      <Dialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.action === "deactivate"
                ? t("machines.confirmDeactivate")
                : t("machines.confirmActivate")}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.action === "deactivate"
                ? t("machines.confirmDeactivate")
                : t("machines.confirmActivate")}
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
              {confirmAction?.action === "deactivate" ? t("machines.deleteMachine") : t("machines.activated")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
