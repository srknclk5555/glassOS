"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@repo/ui";
import { MATERIAL_TYPES } from "@repo/types";
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
  Input,
} from "@repo/ui";
import {
  Plus,
  RefreshCw,
  WifiOff,
  Pencil,
  Trash2,
  Power,
  PowerOff,
  FolderTree,
} from "lucide-react";
import {
  getMaterialCategoriesAction,
  createMaterialCategoryAction,
  updateMaterialCategoryAction,
  toggleMaterialCategoryAction,
  deleteMaterialCategoryAction,
  type MaterialCategoryListFilters,
} from "@/app/actions/material-categories";

/* ── Types ─────────────────────────────────────────────────────── */

interface MaterialGroup {
  id: string;
  name: string;
  materialType: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const MATERIAL_TYPE_OPTIONS = [...MATERIAL_TYPES] as const;

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
      {isActive ? t("common.active") : t("common.passive")}
    </Badge>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function MaterialGroupsPage() {
  const { t } = useI18n();

  /* ── State ── */
  const [groups, setGroups] = useState<MaterialGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MaterialCategoryListFilters>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  /* ── Dialogs ── */
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<MaterialGroup | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MaterialGroup | null>(null);

  /* ── Data Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getMaterialCategoriesAction({ ...filters, page, pageSize });
      setGroups(result.items as MaterialGroup[]);
      setTotal(result.total);
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
  const columns: Column<MaterialGroup>[] = useMemo(() => [
    {
      key: "name",
      header: t("materials.groupName"),
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-glass-surface">
            <FolderTree className="h-4 w-4 text-text-muted" />
          </div>
          <span className="text-sm font-medium text-text-primary">{row.name}</span>
        </div>
      ),
    },
    {
      key: "materialType",
      header: t("materials.groupType"),
      sortable: true,
      render: (row) => (
        <span className="text-xs text-text-muted">
          {row.materialType ? t(`materials.types.${row.materialType}`) : t("materials.allTypesHint")}
        </span>
      ),
    },
    {
      key: "isActive",
      header: t("materials.status"),
      sortable: true,
      render: (row) => <StatusBadge isActive={row.isActive} />,
    },
    {
      key: "actions",
      header: t("materials.actions"),
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditGroup(row)}
            className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("materials.editGroup")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              if (row.isActive) {
                toggleMaterialCategoryAction(row.id, false).then(fetchData);
              } else {
                toggleMaterialCategoryAction(row.id, true).then(fetchData);
              }
            }}
            className={`rounded-md p-1.5 transition-colors ${
              row.isActive
                ? "text-text-muted hover:bg-danger/10 hover:text-danger"
                : "text-text-muted hover:bg-emerald-500/10 hover:text-emerald-500"
            }`}
            title={row.isActive ? t("materials.confirmDeactivate") : t("materials.confirmActivate")}
          >
            {row.isActive ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => setDeleteConfirm(row)}
            className="rounded-md p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
            title={t("materials.confirmDeleteGroup")}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ], [t, fetchData]);

  /* ── Loading ── */
  if (loading && groups.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LoadingState title={t("common.loading")} />
      </div>
    );
  }

  /* ── Error ── */
  if (error && groups.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10">
            <WifiOff className="h-6 w-6 text-danger" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{t("common.error")}</h2>
            <p className="mt-1 text-sm text-text-muted">{error}</p>
          </div>
          <button
            onClick={handleRefresh}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            {t("common.retry")}
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
          <h1 className="text-xl font-semibold text-text-primary">{t("materials.materialGroups")}</h1>
          <p className="mt-0.5 text-sm text-text-muted">{t("materials.noGroupsDesc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="rounded-lg border border-glass-border bg-glass-surface p-2 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("common.refresh")}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("materials.addGroup")}
          </Button>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <SearchBox
            placeholder={t("materials.searchGroups")}
            value={filters.search ?? ""}
            onSearch={(v) => setFilters((p) => ({ ...p, search: v || undefined, page: 1 }))}
          />
        </div>
      </div>

      {/* ── DataGrid ── */}
      <DataGrid
        columns={columns}
        data={groups}
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
        emptyTitle={t("materials.noGroups")}
        emptyDescription={t("materials.noGroupsDesc")}
      />

      {/* ── Add/Edit Dialog ── */}
      <MaterialGroupDialog
        open={addDialogOpen || !!editGroup}
        group={editGroup}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false);
            setEditGroup(null);
          }
        }}
        onSaved={fetchData}
      />

      {/* ── Delete Confirm Dialog ── */}
      <Dialog
        open={!!deleteConfirm}
        onOpenChange={(open) => { if (!open) setDeleteConfirm(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("materials.confirmDeleteGroup")}</DialogTitle>
            <DialogDescription>
              {t("materials.confirmDeleteGroup")} &quot;{deleteConfirm?.name}&quot;?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              className="bg-danger text-white hover:bg-danger/90"
              onClick={async () => {
                if (deleteConfirm) {
                  await deleteMaterialCategoryAction(deleteConfirm.id);
                  setDeleteConfirm(null);
                  fetchData();
                }
              }}
            >
              {t("common.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Inline Dialog Component ──────────────────────────────────── */

interface MaterialGroupDialogProps {
  open: boolean;
  group: MaterialGroup | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function MaterialGroupDialog({ open, group, onOpenChange, onSaved }: MaterialGroupDialogProps) {
  const { t } = useI18n();
  const isEdit = !!group;

  const [name, setName] = useState("");
  const [materialType, setMaterialType] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (group) {
        setName(group.name);
        setMaterialType(group.materialType ?? "");
      } else {
        setName("");
        setMaterialType("");
      }
    }
  }, [open, group]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (isEdit && group) {
        await updateMaterialCategoryAction({
          id: group.id,
          name: name.trim(),
          materialType: materialType || undefined,
        });
      } else {
        await createMaterialCategoryAction({
          name: name.trim(),
          materialType: materialType || undefined,
        });
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }, [name, materialType, isEdit, group, onOpenChange, onSaved]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("materials.editGroup") : t("materials.addGroup")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("materials.editGroup") : t("materials.addGroup")}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("materials.groupName")}</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("materials.groupName")}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("materials.groupType")}</label>
            <Select value={materialType} onValueChange={setMaterialType}>
              <SelectTrigger>
                <SelectValue placeholder={t("materials.allTypesHint")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t("materials.allTypesHint")}</SelectItem>
                {MATERIAL_TYPE_OPTIONS.map((type) => (
                  <SelectItem key={type} value={type}>
                    {t(`materials.types.${type}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
