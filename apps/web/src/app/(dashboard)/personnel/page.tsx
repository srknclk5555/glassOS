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
  User,
} from "lucide-react";
import { PersonnelDialog } from "./_components/personnel-dialog";
import { PersonnelDetailDrawer } from "./_components/personnel-detail-drawer";
import { PersonnelTitleDialog } from "./_components/personnel-title-dialog";
import {
  getPersonnelAction,
  getPersonnelStatsAction,
  getPersonnelTitlesAction,
  createPersonnelAction,
  updatePersonnelAction,
  deactivatePersonnelAction,
  activatePersonnelAction,
  type PersonnelListFilters,
} from "@/app/actions/personnel";

/* ── Types ─────────────────────────────────────────────────────── */

interface Personnel {
  id: string;
  personnelCode: string;
  firstName: string;
  lastName: string;
  titleId: string | null;
  role: string;
  phone: string | null;
  email: string | null;
  isActive: boolean;
  hiredAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PersonnelTitle {
  id: string;
  titleName: string;
}

interface PersonnelStats {
  total: number;
  active: number;
  inactive: number;
  onShift: number;
  onLeave: number;
}

/* ── Constants ─────────────────────────────────────────────────── */

const ROLE_OPTIONS = ["operator", "senior_operator", "supervisor", "manager"] as const;

const ROLE_LABELS: Record<string, string> = {
  operator: "Operatör",
  senior_operator: "Kıdemli Operatör",
  supervisor: "Süpervizör",
  manager: "Yönetici",
};

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
      {isActive ? t("personnel.statusActive") : t("personnel.statusInactive")}
    </Badge>
  );
}

function RoleLabel({ role }: { role: string }) {
  return <span>{ROLE_LABELS[role] ?? role}</span>;
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function PersonnelPage() {
  const { t } = useI18n();

  /* ── State ── */
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [titles, setTitles] = useState<PersonnelTitle[]>([]);
  const [stats, setStats] = useState<PersonnelStats>({ total: 0, active: 0, inactive: 0, onShift: 0, onLeave: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PersonnelListFilters>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  /* ── Dialogs ── */
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editPersonnel, setEditPersonnel] = useState<Personnel | null>(null);
  const [detailPersonnelId, setDetailPersonnelId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string; action: "activate" | "deactivate" } | null>(null);
  const [titleDialogOpen, setTitleDialogOpen] = useState(false);

  /* ── Data Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [personnelResult, statsResult, titlesResult] = await Promise.all([
        getPersonnelAction({ ...filters, page, pageSize }),
        getPersonnelStatsAction(),
        getPersonnelTitlesAction(),
      ]);
      setPersonnel(personnelResult.items as Personnel[]);
      setTotal(personnelResult.total);
      setStats(statsResult);
      setTitles(titlesResult as PersonnelTitle[]);
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

  const handleTitlesChanged = useCallback(() => {
    fetchData();
  }, [fetchData]);

  /* ── Actions ── */
  const handleCreate = useCallback(async (data: any) => {
    await createPersonnelAction(data);
    setAddDialogOpen(false);
    fetchData();
  }, [fetchData]);

  const handleUpdate = useCallback(async (data: any) => {
    if (!editPersonnel) return;
    await updatePersonnelAction({ ...data, id: editPersonnel.id });
    setEditPersonnel(null);
    fetchData();
  }, [editPersonnel, fetchData]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    if (confirmAction.action === "deactivate") {
      await deactivatePersonnelAction(confirmAction.id);
    } else {
      await activatePersonnelAction(confirmAction.id);
    }
    setConfirmAction(null);
    fetchData();
  }, [confirmAction, fetchData]);

  /* ── Columns ── */
  const columns: Column<Personnel>[] = useMemo(() => [
    {
      key: "personnelCode",
      header: t("personnel.personnelCode"),
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-medium text-text-primary">{row.personnelCode}</span>
      ),
    },
    {
      key: "fullName",
      header: t("personnel.fullName"),
      sortable: true,
      render: (row) => {
        const titleName = titles.find((t) => t.id === row.titleId)?.titleName;
        return (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-glass-surface">
              <User className="h-4 w-4 text-text-muted" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">{row.firstName} {row.lastName}</p>
              <p className="text-xs text-text-muted">{titleName ?? ROLE_LABELS[row.role] ?? row.role}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: "phone",
      header: t("personnel.phone"),
      render: (row) => (
        <span className="text-xs text-text-muted">{row.phone ?? "—"}</span>
      ),
    },
    {
      key: "email",
      header: t("personnel.email"),
      render: (row) => (
        <span className="text-xs text-text-muted">{row.email ?? "—"}</span>
      ),
    },
    {
      key: "isActive",
      header: t("personnel.status"),
      sortable: true,
      render: (row) => <StatusBadge isActive={row.isActive} />,
    },
    {
      key: "actions",
      header: t("personnel.actions"),
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setDetailPersonnelId(row.id)}
            className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("personnel.details")}
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setEditPersonnel(row)}
            className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("personnel.editPersonnel")}
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
            title={row.isActive ? t("personnel.confirmDeactivate") : t("personnel.confirmActivate")}
          >
            {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          </button>
        </div>
      ),
    },
  ], [t, titles]);

  /* ── Loading ── */
  if (loading && personnel.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState title={t("common.loading")} />
      </div>
    );
  }

  /* ── Error ── */
  if (error && personnel.length === 0) {
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
          <h1 className="text-xl font-semibold text-text-primary">{t("personnel.title")}</h1>
          <p className="mt-0.5 text-sm text-text-muted">{t("personnel.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="rounded-lg border border-glass-border bg-glass-surface p-2 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("queue.refresh")}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Button variant="outline" onClick={() => setTitleDialogOpen(true)}>
            <User className="mr-1.5 h-4 w-4" />
            {t("personnel.manageTitles")}
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("personnel.addPersonnel")}
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-text-muted">{t("personnel.summaryTotal")}</p>
            <p className="mt-1 text-2xl font-semibold text-text-primary">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-emerald-500">{t("personnel.summaryActive")}</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-500">{stats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-slate-500">{t("personnel.summaryInactive")}</p>
            <p className="mt-1 text-2xl font-semibold text-slate-500">{stats.inactive}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-sky-500">{t("personnel.summaryOnShift")}</p>
            <p className="mt-1 text-2xl font-semibold text-sky-500">{stats.onShift}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <SearchBox
            placeholder={t("personnel.searchPlaceholder")}
            value={filters.search ?? ""}
            onSearch={(v) => setFilters((p) => ({ ...p, search: v, page: 1 }))}
          />
        </div>
        <Select
          value={filters.role ?? "all"}
          onValueChange={(v) => setFilters((p) => ({ ...p, role: v === "all" ? undefined : v, page: 1 }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("personnel.role")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("personnel.role")}</SelectItem>
            {ROLE_OPTIONS.map((role) => (
              <SelectItem key={role} value={role}>
                <RoleLabel role={role} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v) => setFilters((p) => ({ ...p, status: v === "all" ? undefined : v, page: 1 }))}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder={t("personnel.allStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("personnel.allStatus")}</SelectItem>
            <SelectItem value="active">{t("personnel.statusActive")}</SelectItem>
            <SelectItem value="inactive">{t("personnel.statusInactive")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── DataGrid ── */}
      <DataGrid
        columns={columns}
        data={personnel}
        keyExtractor={(row: any) => row.id}
        loading={loading}
        total={total}
        page={page}
        pageSize={pageSize}
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
        emptyTitle={t("personnel.noPersonnel")}
        emptyDescription={t("personnel.noPersonnelDesc")}
      />

      {/* ── Dialogs ── */}
      <PersonnelDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleCreate}
        titles={titles}
        mode="create"
        onAddTitle={() => setTitleDialogOpen(true)}
      />

      <PersonnelDialog
        open={!!editPersonnel}
        onOpenChange={(open) => { if (!open) setEditPersonnel(null); }}
        onSave={handleUpdate}
        personnel={editPersonnel}
        titles={titles}
        mode="edit"
        onAddTitle={() => setTitleDialogOpen(true)}
      />

      <PersonnelDetailDrawer
        personnelId={detailPersonnelId}
        onClose={() => setDetailPersonnelId(null)}
      />

      <PersonnelTitleDialog
        open={titleDialogOpen}
        onOpenChange={setTitleDialogOpen}
        onTitlesChanged={handleTitlesChanged}
      />

      {/* ── Confirm Dialog ── */}
      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.action === "deactivate"
                ? t("personnel.confirmDeactivate")
                : t("personnel.confirmActivate")}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.action === "deactivate"
                ? t("personnel.confirmDeactivate")
                : t("personnel.confirmActivate")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              className={confirmAction?.action === "deactivate" ? "bg-danger text-white hover:bg-danger/90" : "glass-button"}
              onClick={handleConfirmAction}
            >
              {confirmAction?.action === "deactivate" ? t("personnel.deactivated") : t("personnel.activated")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
