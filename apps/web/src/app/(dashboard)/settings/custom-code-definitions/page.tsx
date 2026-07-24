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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
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
  Hash,
} from "lucide-react";
import {
  getCustomCodeDefinitionsAction,
  createCustomCodeDefinitionAction,
  updateCustomCodeDefinitionAction,
  deleteCustomCodeDefinitionAction,
  type CustomCodeDefinitionListFilters,
} from "@/app/actions/custom-code-definitions";

/* ── Types ─────────────────────────────────────────────────────── */

interface CustomCodeDef {
  id: string;
  fieldNumber: number;
  value: string;
  label: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const FIELD_OPTIONS = [1, 2, 3, 4, 5] as const;

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
      {isActive ? t("customCodeDefs.isActive") : t("common.close")}
    </Badge>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function CustomCodeDefinitionsPage() {
  const { t } = useI18n();

  /* ── State ── */
  const [items, setItems] = useState<CustomCodeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedField, setSelectedField] = useState(1);
  const [filters, setFilters] = useState<CustomCodeDefinitionListFilters>({ fieldNumber: 1 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);

  /* ── Dialogs ── */
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<CustomCodeDef | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<CustomCodeDef | null>(null);

  /* ── Data Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCustomCodeDefinitionsAction({
        ...filters,
        fieldNumber: selectedField,
        page,
        pageSize,
      });
      setItems(result.items as CustomCodeDef[]);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [filters, selectedField, page, pageSize, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  /* ── Field change ── */
  const handleFieldChange = useCallback((field: string) => {
    const fn = parseInt(field, 10);
    setSelectedField(fn);
    setFilters((p) => ({ ...p, fieldNumber: fn }));
    setPage(1);
  }, []);

  /* ── Columns ── */
  const columns: Column<CustomCodeDef>[] = useMemo(() => [
    {
      key: "value",
      header: t("customCodeDefs.value"),
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-glass-surface">
            <Hash className="h-4 w-4 text-text-muted" />
          </div>
          <span className="text-sm font-medium text-text-primary">{row.value}</span>
        </div>
      ),
    },
    {
      key: "label",
      header: t("customCodeDefs.label"),
      sortable: true,
      render: (row) => (
        <span className="text-sm text-text-primary">{row.label}</span>
      ),
    },
    {
      key: "sortOrder",
      header: t("customCodeDefs.sortOrder"),
      render: (row) => (
        <span className="text-xs text-text-muted">{row.sortOrder}</span>
      ),
    },
    {
      key: "isActive",
      header: t("customCodeDefs.status"),
      sortable: true,
      render: (row) => <StatusBadge isActive={row.isActive} />,
    },
    {
      key: "actions",
      header: t("common.edit"),
      render: (row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => setEditItem(row)}
            className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("customCodeDefs.editValue")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setDeleteConfirm(row)}
            className="rounded-md p-1.5 text-text-muted hover:bg-danger/10 hover:text-danger transition-colors"
            title={t("customCodeDefs.deleteValue")}
          >
            <Trash2 className="h-3.5 w-3.5" />
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
          <h1 className="text-xl font-semibold text-text-primary">{t("customCodeDefs.title")}</h1>
          <p className="mt-0.5 text-sm text-text-muted">{t("customCodeDefs.description")}</p>
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
            {t("customCodeDefs.addValue")}
          </Button>
        </div>
      </div>

      {/* ── Field Tabs ── */}
      <Tabs value={String(selectedField)} onValueChange={handleFieldChange}>
        <TabsList>
          {FIELD_OPTIONS.map((fn) => (
            <TabsTrigger key={fn} value={String(fn)}>
              {t("customCodeDefs.customCodeField").replace("{n}", String(fn))}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* ── DataGrid ── */}
      <DataGrid
        columns={columns}
        data={items}
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
        emptyTitle={t("customCodeDefs.noValues")}
        emptyDescription={t("customCodeDefs.noValuesDesc")}
      />

      {/* ── Add/Edit Dialog ── */}
      <CustomCodeDefDialog
        open={addDialogOpen || !!editItem}
        item={editItem}
        fieldNumber={selectedField}
        onOpenChange={(open) => {
          if (!open) {
            setAddDialogOpen(false);
            setEditItem(null);
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
            <DialogTitle>{t("customCodeDefs.deleteValue")}</DialogTitle>
            <DialogDescription>
              {t("customCodeDefs.confirmDelete")} &quot;{deleteConfirm?.label || deleteConfirm?.value}&quot;?
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
                  await deleteCustomCodeDefinitionAction(deleteConfirm.id);
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

interface CustomCodeDefDialogProps {
  open: boolean;
  item: CustomCodeDef | null;
  fieldNumber: number;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

function CustomCodeDefDialog({ open, item, fieldNumber, onOpenChange, onSaved }: CustomCodeDefDialogProps) {
  const { t } = useI18n();
  const isEdit = !!item;

  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (item) {
        setValue(item.value);
        setLabel(item.label);
        setSortOrder(String(item.sortOrder));
      } else {
        setValue("");
        setLabel("");
        setSortOrder("0");
      }
    }
  }, [open, item]);

  const handleSave = useCallback(async () => {
    if (!value.trim() || !label.trim()) return;
    setSaving(true);
    try {
      if (isEdit && item) {
        await updateCustomCodeDefinitionAction({
          id: item.id,
          fieldNumber: item.fieldNumber,
          value: value.trim(),
          label: label.trim(),
          sortOrder: parseInt(sortOrder, 10) || 0,
        });
      } else {
        await createCustomCodeDefinitionAction({
          fieldNumber,
          value: value.trim(),
          label: label.trim(),
          sortOrder: parseInt(sortOrder, 10) || 0,
        });
      }
      onOpenChange(false);
      onSaved();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }, [value, label, sortOrder, isEdit, item, fieldNumber, onOpenChange, onSaved]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? t("customCodeDefs.editValue") : t("customCodeDefs.addValue")}</DialogTitle>
          <DialogDescription>
            {t("customCodeDefs.customCodeField").replace("{n}", String(fieldNumber))}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("customCodeDefs.value")}</label>
            <Input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t("customCodeDefs.value")}
              maxLength={100}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("customCodeDefs.label")}</label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("customCodeDefs.label")}
              maxLength={255}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-muted">{t("customCodeDefs.sortOrder")}</label>
            <Input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving || !value.trim() || !label.trim()}>
            {saving ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
