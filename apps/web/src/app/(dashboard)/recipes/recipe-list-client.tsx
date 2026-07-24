"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@repo/ui";
import {
  Card,
  CardContent,
  DataGrid,
  SearchBox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
  Skeleton,
} from "@repo/ui";
import type { Column } from "@repo/ui";
import {
  Plus,
  RefreshCw,
  Eye,
  Pencil,
  Copy,
  FilePlus,
  Archive,
  RotateCcw,
  BookOpen,
  Layers,
} from "lucide-react";
import {
  listRecipes,
  archiveRecipe,
  restoreRecipe,
} from "@/app/actions/recipes";

/* ── Types ────────────────────────────────────────────────────────────── */

interface RecipeRow {
  id: string;
  recipeCode: string;
  name: string;
  productType: string;
  version: number;
  isActive: boolean;
  isArchived: boolean;
  updatedAt: string;
}

interface RecipeKpiData {
  totalRecipes: number;
  activeRecipes: number;
  archivedRecipes: number;
  latestVersion: number;
}

interface ConfirmAction {
  type: "archive" | "restore";
  recipeId: string;
  recipeName: string;
}

/* ── Supported Product Types ──────────────────────────────────────────── */
/* Maps product type codes to display labels.                              */

const PRODUCT_TYPES = [
  { value: "flat_tempered", labelKey: "recipes.productType.flatTempered" },
  { value: "bent_tempered", labelKey: "recipes.productType.bentTempered" },
  { value: "laminated", labelKey: "recipes.productType.laminated" },
  { value: "coated", labelKey: "recipes.productType.coated" },
  { value: "insulated", labelKey: "recipes.productType.insulated" },
  { value: "mirror", labelKey: "recipes.productType.mirror" },
] as const;

/* ── Badge Helpers ────────────────────────────────────────────────────── */

function RecipeStatusBadge({ isArchived }: { isArchived: boolean }) {
  const { t } = useI18n();
  if (isArchived) {
    return <Badge variant="secondary">{t("recipes.status.archived")}</Badge>;
  }
  return <Badge variant="success">{t("recipes.status.active")}</Badge>;
}

function formatDate(d: string): string {
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ── KPI Card ─────────────────────────────────────────────────────────── */

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  borderColor: string;
  loading?: boolean;
}

function KpiCard({ icon, label, value, borderColor, loading }: KpiCardProps) {
  if (loading) {
    return (
      <Card className={`border-l-4 ${borderColor}`}>
        <CardContent className="p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-glass-surface">
              {icon}
            </div>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-12" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-glass-surface text-text-primary">
            {icon}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-muted">
              {label}
            </p>
            <p className="text-2xl font-semibold text-text-primary">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Recipe Workspace Page
   ═══════════════════════════════════════════════════════════════════════════ */

export function RecipeListClient() {
  const { t } = useI18n();
  const router = useRouter();

  /* ── State ── */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [kpi, setKpi] = useState<RecipeKpiData>({
    totalRecipes: 0,
    activeRecipes: 0,
    archivedRecipes: 0,
    latestVersion: 0,
  });
  const [kpiLoading, setKpiLoading] = useState(true);

  const [filters, setFilters] = useState<{
    search?: string;
    productType?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }>({});

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
    null,
  );

  /* ── Fetch KPI Data ── */
  const fetchKpiData = useCallback(async () => {
    setKpiLoading(true);
    try {
      const [totalRes, activeRes] = await Promise.all([
        listRecipes({ page: 1, limit: 1 }),
        listRecipes({ page: 1, limit: 1, activeOnly: true }),
      ]);
      const totalRecipes = totalRes.total ?? 0;
      const activeRecipes = activeRes.total ?? 0;
      setKpi({
        totalRecipes,
        activeRecipes,
        archivedRecipes: Math.max(0, totalRecipes - activeRecipes),
        latestVersion: 0, // Will be updated from main data
      });
    } catch {
      // KPIs will show 0 — non-critical
    } finally {
      setKpiLoading(false);
    }
  }, []);

  /* ── Fetch Main List ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listRecipes({
        page,
        limit: pageSize,
        search: filters.search,
        productType: filters.productType,
        activeOnly: filters.status === "active" ? true : undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
      });
      setRecipes((result.items ?? []) as RecipeRow[]);
      setTotal(result.total ?? 0);

      // Update latest version from loaded data
      const items = (result.items ?? []) as RecipeRow[];
      if (items.length > 0) {
        const maxVersion = Math.max(...items.map((r) => r.version ?? 0));
        setKpi((prev) => ({
          ...prev,
          latestVersion: Math.max(prev.latestVersion, maxVersion),
        }));
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : t("recipes.error.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [page, filters, t]);

  /* ── Initial Load ── */
  useEffect(() => {
    fetchKpiData();
    fetchData();
  }, [fetchKpiData, fetchData]);

  /* ── Handlers ── */
  const handleRefresh = useCallback(() => {
    setPage(1);
    setFilters({});
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    const { type, recipeId } = confirmAction;
    try {
      if (type === "archive") {
        await archiveRecipe(recipeId);
      } else {
        await restoreRecipe(recipeId);
      }
      setConfirmAction(null);
      fetchData();
      fetchKpiData();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : t("recipes.error.actionFailed"),
      );
      setConfirmAction(null);
    }
  }, [confirmAction, fetchData, fetchKpiData, t]);

  const confirmTitle = useMemo(() => {
    if (!confirmAction) return "";
    return confirmAction.type === "archive"
      ? t("recipes.confirmArchive")
      : t("recipes.confirmRestore");
  }, [confirmAction, t]);

  /* ── Columns ── */
  const columns: Column<RecipeRow>[] = useMemo(
    () => [
      {
        key: "recipeCode",
        header: t("recipes.columnCode"),
        sortable: true,
        render: (row) => (
          <span className="font-mono text-xs font-medium text-text-primary">
            {row.recipeCode}
          </span>
        ),
      },
      {
        key: "name",
        header: t("recipes.columnName"),
        sortable: true,
        render: (row) => (
          <span className="font-medium text-text-primary">{row.name}</span>
        ),
      },
      {
        key: "productType",
        header: t("recipes.columnProductType"),
        sortable: true,
        render: (row) => (
          <span className="text-sm text-text-muted">
            {t(`recipes.productType.${row.productType}`) || row.productType}
          </span>
        ),
      },
      {
        key: "version",
        header: t("recipes.columnVersion"),
        sortable: true,
        render: (row) => (
          <span className="text-sm text-text-muted">v{row.version}</span>
        ),
      },
      {
        key: "status",
        header: t("recipes.columnStatus"),
        sortable: false,
        render: (row) => <RecipeStatusBadge isArchived={row.isArchived} />,
      },
      {
        key: "updatedAt",
        header: t("recipes.columnUpdatedAt"),
        sortable: true,
        render: (row) => (
          <span className="text-sm text-text-muted">
            {formatDate(row.updatedAt)}
          </span>
        ),
      },
    ],
    [t],
  );

  /* ── Render: Full Error ── */
  if (error && recipes.length === 0) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            {t("recipes.title")}
          </h1>
          <p className="text-sm text-text-muted">{t("recipes.description")}</p>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12">
            <p className="text-sm text-red-500">{error}</p>
            <Button onClick={fetchData}>
              {t("common.retry") || "Retry"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
            {t("recipes.title")}
          </h1>
          <p className="text-sm text-text-muted">{t("recipes.description")}</p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          icon={<Layers className="h-5 w-5" />}
          label={t("recipes.kpi.totalRecipes")}
          value={kpi.totalRecipes}
          borderColor="border-l-glass-primary"
          loading={kpiLoading}
        />
        <KpiCard
          icon={<BookOpen className="h-5 w-5" />}
          label={t("recipes.kpi.activeRecipes")}
          value={kpi.activeRecipes}
          borderColor="border-l-success"
          loading={kpiLoading}
        />
        <KpiCard
          icon={<Archive className="h-5 w-5" />}
          label={t("recipes.kpi.archivedRecipes")}
          value={kpi.archivedRecipes}
          borderColor="border-l-secondary"
          loading={kpiLoading}
        />
        <KpiCard
          icon={<Layers className="h-5 w-5" />}
          label={t("recipes.kpi.latestVersion")}
          value={kpi.latestVersion > 0 ? `v${kpi.latestVersion}` : "—"}
          borderColor="border-l-warning"
          loading={kpiLoading}
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="max-w-sm flex-1">
            <SearchBox
              placeholder={t("recipes.searchPlaceholder")}
              value={filters.search ?? ""}
              onSearch={(v) =>
                setFilters((p) => ({ ...p, search: v, page: 1 }))
              }
            />
          </div>
          <Select
            value={filters.productType ?? "all"}
            onValueChange={(v) =>
              setFilters((p) => ({
                ...p,
                productType: v === "all" ? undefined : v,
                page: 1,
              }))
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t("recipes.allProductTypes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("recipes.allProductTypes")}
              </SelectItem>
              {PRODUCT_TYPES.map((pt) => (
                <SelectItem key={pt.value} value={pt.value}>
                  {t(pt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={filters.status ?? "all"}
            onValueChange={(v) =>
              setFilters((p) => ({
                ...p,
                status: v === "all" ? undefined : v,
                page: 1,
              }))
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t("recipes.allStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("recipes.allStatus")}</SelectItem>
              <SelectItem value="active">
                <Badge variant="success">{t("recipes.status.active")}</Badge>
              </SelectItem>
              <SelectItem value="archived">
                <Badge variant="secondary">
                  {t("recipes.status.archived")}
                </Badge>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="rounded-lg border border-glass-border bg-glass-surface p-2 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("recipes.refresh")}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <Button onClick={() => router.push("/recipes/new")}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("recipes.addRecipe")}
          </Button>
        </div>
      </div>

      {/* ── DataGrid ── */}
      <Card>
        <CardContent className="p-0">
          <DataGrid
            columns={columns}
            data={recipes}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyTitle={t(
              filters.search
                ? "recipes.emptyState.noSearchResults"
                : "recipes.emptyState.noRecipes",
            )}
            emptyDescription={
              filters.search
                ? t("recipes.emptyState.noSearchResultsDesc")
                : t("recipes.emptyState.noRecipesDesc")
            }
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
            onRowClick={(row) => router.push(`/recipes/${row.id}`)}
            rowActions={(row) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/recipes/${row.id}`);
                  }}
                  className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
                  title={t("recipes.actions.view")}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/recipes/${row.id}/edit`);
                  }}
                  className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
                  title={t("recipes.actions.edit")}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/recipes/${row.id}/clone`);
                  }}
                  className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
                  title={t("recipes.actions.clone")}
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/recipes/${row.id}/versions/new`);
                  }}
                  className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
                  title={t("recipes.actions.newVersion")}
                >
                  <FilePlus className="h-4 w-4" />
                </button>
                {row.isArchived ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmAction({
                        type: "restore",
                        recipeId: row.id,
                        recipeName: row.name,
                      });
                    }}
                    className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
                    title={t("recipes.actions.restore")}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmAction({
                        type: "archive",
                        recipeId: row.id,
                        recipeName: row.name,
                      });
                    }}
                    className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
                    title={t("recipes.actions.archive")}
                  >
                    <Archive className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* ── Confirmation Dialog ── */}
      <Dialog
        open={confirmAction != null}
        onOpenChange={(open) => {
          if (!open) setConfirmAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "archive"
                ? `${t("recipes.confirmArchiveDesc")} "${confirmAction?.recipeName}"?`
                : `${t("recipes.confirmRestoreDesc")} "${confirmAction?.recipeName}"?`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setConfirmAction(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              variant={confirmAction?.type === "archive" ? "destructive" : "primary"}
              onClick={handleConfirmAction}
            >
              {confirmAction?.type === "archive"
                ? t("recipes.archive")
                : t("recipes.restore")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
