"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  ProductionStatusBadge,
  PriorityBadge,
  DataGrid,
  Skeleton,
  EmptyState,
  Tabs,
  TabsList,
  TabsTrigger,
  useI18n,
} from "@repo/ui";
import type { Column, PriorityLevel } from "@repo/ui";
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  Inbox,
  Scissors,
  FileSliders,
  Flame,
  ShieldCheck,
  Truck,
  Layers,
  Gauge,
  TrendingUp,
  Percent,
  BarChart3,
  User,
  Package,
} from "lucide-react";
import { getProductionWorkspaceData } from "@/app/actions/production";
import type {
  ProductionWorkspaceData,
  ProductionOrderItem,
  StageCount,
  CompletedFilter,
} from "@/app/actions/production-shared";

/* ═══════════════════════════════════════════════════════════════════════════
   Stage Visual Configuration
   ═══════════════════════════════════════════════════════════════════════════
   Production stages are mapped via a single lookup function rather than
   hardcoded JSX. This design supports future dynamic loading from database
   or config without rewriting the UI — simply replace this function.
   ═══════════════════════════════════════════════════════════════════════════ */

interface StageVisual {
  icon: React.ReactNode;
  borderColor: string;
}

const STAGE_COLORS = {
  default: "border-l-glass-primary",
  success: "border-l-success",
  warning: "border-l-warning",
  danger: "border-l-danger",
} as const;

function getStageVisual(operation: string): StageVisual {
  /* Known stages mapped by operation code. When stages become dynamic,
     replace this map with a config lookup or API-driven registry. */
  const map: Record<string, StageVisual> = {
    cutting:  { icon: <Scissors className="h-5 w-5" />,     borderColor: STAGE_COLORS.default },
    grinding: { icon: <FileSliders className="h-5 w-5" />,  borderColor: STAGE_COLORS.default },
    tempering:{ icon: <Flame className="h-5 w-5" />,        borderColor: STAGE_COLORS.warning },
    quality:  { icon: <ShieldCheck className="h-5 w-5" />,  borderColor: STAGE_COLORS.success },
    dispatch: { icon: <Truck className="h-5 w-5" />,        borderColor: STAGE_COLORS.success },
  };
  /* Unknown stages get a generic fallback — dashboard never breaks */
  return map[operation] ?? { icon: <Layers className="h-5 w-5" />, borderColor: STAGE_COLORS.default };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Auto-Refresh Options
   ═══════════════════════════════════════════════════════════════════════════ */

const REFRESH_OPTIONS: { labelKey: string; value: number | null }[] = [
  { labelKey: "productionWorkspace.refreshOff", value: null },
  { labelKey: "productionWorkspace.refresh10s", value: 10_000 },
  { labelKey: "productionWorkspace.refresh30s", value: 30_000 },
  { labelKey: "productionWorkspace.refresh60s", value: 60_000 },
];

const COMPLETED_FILTERS: { labelKey: string; value: CompletedFilter }[] = [
  { labelKey: "productionWorkspace.filterToday",      value: "today" },
  { labelKey: "productionWorkspace.filterYesterday",  value: "yesterday" },
  { labelKey: "productionWorkspace.filterThisWeek",   value: "this_week" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   KPI Definitions (Config-Driven)
   ═══════════════════════════════════════════════════════════════════════════
   Cards are rendered from this array — no duplicated JSX.
   // TODO: Connect KPI calculations when KPI Engine module is built.
   // TODO: Replace placeholder icon/borderColor with real data bindings.
   // TODO: Add onClick drill-down to Production Detail or Machine Dashboard.
   ═══════════════════════════════════════════════════════════════════════════ */

interface KpiDefinition {
  key: string;
  labelKey: string;
  icon: React.ReactNode;
  borderColor: string;
}

const KPI_DEFINITIONS: KpiDefinition[] = [
  { key: "utilization",  labelKey: "productionWorkspace.kpiMachineUtilization", icon: <Gauge className="h-5 w-5" />,     borderColor: STAGE_COLORS.default },
  { key: "furnaceLoad",  labelKey: "productionWorkspace.kpiFurnaceLoad",        icon: <Flame className="h-5 w-5" />,       borderColor: STAGE_COLORS.warning },
  { key: "dailyYield",   labelKey: "productionWorkspace.kpiDailyYield",         icon: <TrendingUp className="h-5 w-5" />,  borderColor: STAGE_COLORS.success },
  { key: "scrapRate",    labelKey: "productionWorkspace.kpiScrapRate",          icon: <Percent className="h-5 w-5" />,     borderColor: STAGE_COLORS.danger },
  { key: "reworkRate",   labelKey: "productionWorkspace.kpiReworkRate",         icon: <RotateCcw className="h-5 w-5" />,   borderColor: STAGE_COLORS.warning },
  { key: "avgCycleTime", labelKey: "productionWorkspace.kpiAvgCycleTime",       icon: <BarChart3 className="h-5 w-5" />,  borderColor: STAGE_COLORS.default },
];

/* ═══════════════════════════════════════════════════════════════════════════
   Future-Ready Optional Columns
   ═══════════════════════════════════════════════════════════════════════════
   These columns are defined once and rendered only when data exists.
   To add a new optional column: add an entry here with a getValue accessor.
   No other UI changes required.
   ═══════════════════════════════════════════════════════════════════════════ */

interface OptionalColumnConfig<T> {
  key: string;
  header: string;
  getValue: (row: T) => unknown;
  render: (row: T) => React.ReactNode;
}

const OPTIONAL_COLUMNS: OptionalColumnConfig<ProductionOrderItem>[] = [
  {
    key: "completedPieces",
    header: "Completed",
    getValue: (r) => r.completedPieces,
    render: (r) =>
      r.completedPieces !== null ? (
        <span className="text-sm tabular-nums text-text-secondary">{r.completedPieces}</span>
      ) : null,
  },
  {
    key: "totalPieces",
    header: "Total",
    getValue: (r) => r.totalPieces,
    render: (r) =>
      r.totalPieces !== null ? (
        <span className="text-sm tabular-nums text-text-secondary">{r.totalPieces}</span>
      ) : null,
  },
  {
    key: "progress",
    header: "Progress",
    getValue: (r) => r.progress,
    render: (r) =>
      r.progress !== null ? (
        <div className="flex items-center gap-2">
          <div className="h-2 w-16 overflow-hidden rounded-full bg-glass-surface">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(r.progress, 100)}%` }}
            />
          </div>
          <span className="text-xs tabular-nums text-text-secondary">{r.progress}%</span>
        </div>
      ) : null,
  },
  /* // TODO: Uncomment when machineName tracking is extended to completed orders */
  /* {
    key: "operator",
    header: "Operator",
    getValue: (r) => r.operator,
    render: (r) =>
      r.operator ? (
        <div className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-text-muted" />
          <span className="text-sm text-text-secondary">{r.operator}</span>
        </div>
      ) : null,
  }, */
];

/* ═══════════════════════════════════════════════════════════════════════════
   Utility Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

/** Map queue priority integer → PriorityLevel label */
function mapPriority(priority: number | null): PriorityLevel {
  if (priority === null) return "normal";
  if (priority <= 10) return "critical";
  if (priority <= 25) return "high";
  if (priority <= 50) return "normal";
  return "low";
}

/** Due-date proximity classification for glass temper scheduling */
type DueDateCategory = "overdue" | "dueToday" | "dueTomorrow" | "upcoming";

function classifyDueDate(dueDate: string): DueDateCategory | null {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const due = new Date(dueDate);
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());

  const diffTime = dueDay.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / 86400000);

  if (diffDays < 0) return "overdue";
  if (diffDays === 0) return "dueToday";
  if (diffDays === 1) return "dueTomorrow";
  return "upcoming";
}

const DUE_DATE_CONFIG: Record<DueDateCategory, { labelKey: string; variant: "danger" | "warning" | "info" | "default" }> = {
  overdue:     { labelKey: "productionWorkspace.dueOverdue",  variant: "danger" },
  dueToday:    { labelKey: "productionWorkspace.dueToday",    variant: "warning" },
  dueTomorrow: { labelKey: "productionWorkspace.dueTomorrow", variant: "info" },
  upcoming:    { labelKey: "productionWorkspace.dueUpcoming", variant: "default" },
};

/** Build the base set of always-visible DataGrid columns */
function buildBaseColumns(t: (key: string) => string): Column<ProductionOrderItem>[] {
  return [
    {
      key: "glassBarcode",
      header: "Glass Barcode",
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm font-medium text-text-primary">
          {row.glassBarcode}
        </span>
      ),
    },
    {
      key: "orderNumber",
      header: "Order",
      render: (row) => (
        <span className="text-sm text-text-secondary">{row.orderNumber ?? "—"}</span>
      ),
    },
    {
      key: "customerName",
      header: "Customer",
      render: (row) => (
        <span className="text-sm text-text-secondary">{row.customerName ?? "—"}</span>
      ),
    },
    {
      key: "productType",
      header: "Product Type",
      render: (row) => (
        <span className="text-sm text-text-secondary">{row.productType ?? "—"}</span>
      ),
    },
    {
      key: "currentOperation",
      header: "Stage",
      render: (row) => (
        <Badge variant="outline" className="text-xs">
          {row.currentOperation ?? "—"}
        </Badge>
      ),
    },
    {
      key: "currentStatus",
      header: "Status",
      render: (row) => <ProductionStatusBadge status={row.currentStatus as any} />,
    },
    {
      key: "machineName",
      header: t("productionWorkspace.colMachine"),
      render: (row) => (
        <span className="text-sm text-text-secondary">{row.machineName ?? "—"}</span>
      ),
    },
    {
      key: "rack",
      header: t("productionWorkspace.colRack"),
      // Rack tracking not yet in schema — value is always null.
      // TODO: Connect to rack_location field when schema migration is added.
      render: () => (
        <span className="text-sm text-text-muted/50 italic">—</span>
      ),
    },
    {
      key: "priority",
      header: t("productionWorkspace.colPriority"),
      render: (row) =>
        row.priority !== null ? (
          <PriorityBadge priority={mapPriority(row.priority)} />
        ) : (
          <span className="text-sm text-text-muted">—</span>
        ),
    },
    {
      key: "dueDate",
      header: t("productionWorkspace.colDueDate"),
      render: (row) => {
        if (!row.dueDate) {
          return <span className="text-sm text-text-muted">—</span>;
        }
        const category = classifyDueDate(row.dueDate);
        if (!category) {
          return <span className="text-sm text-text-muted">—</span>;
        }
        const config = DUE_DATE_CONFIG[category];
        const dateStr = new Date(row.dueDate).toLocaleDateString();
        return (
          <Badge variant={config.variant} className="text-xs whitespace-nowrap">
            {category === "upcoming" ? dateStr : t(config.labelKey)}
          </Badge>
        );
      },
    },
    {
      key: "isRework",
      header: "Type",
      render: (row) =>
        row.isRework ? (
          <Badge variant="warning" className="text-xs">
            Rework R{row.revisionNumber}
          </Badge>
        ) : (
          <span className="text-xs text-text-muted">Original</span>
        ),
    },
    {
      key: "dimensions",
      header: "Dimensions",
      render: (row) => (
        <span className="text-sm text-text-secondary">
          {row.widthMm}×{row.heightMm} mm
        </span>
      ),
    },
    {
      key: "remainingPieces",
      header: t("productionWorkspace.colRemainingPieces"),
      render: (row) => (
        <span className="text-sm tabular-nums text-text-secondary">
          {row.remainingPieces ?? "—"}
        </span>
      ),
    },
  ];
}

/* ═══════════════════════════════════════════════════════════════════════════
   Sub-Components
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Stage Summary Card ─────────────────────────────────────── */
interface StageCardProps {
  operation: string;
  labelKey: string;
  count: number;
  visual: StageVisual;
}

function StageCard({ operation, labelKey, count, visual }: StageCardProps) {
  const { t } = useI18n();
  return (
    <Card className={`border-l-4 ${visual.borderColor}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm text-text-muted">{t(labelKey)}</p>
            <p className="mt-1 text-2xl font-bold text-text-primary">{count}</p>
          </div>
          <div className="shrink-0 rounded-full bg-glass-elevated p-2.5 text-text-muted">
            {visual.icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── KPI Placeholder Card ──────────────────────────────────────
   // TODO: Replace with live data subscription from KPI Engine.
   // TODO: Add sparkline / mini-chart visualization.
   // TODO: Add date-range selector for trend view.                    */
function KpiCard({ labelKey, icon, borderColor }: KpiDefinition) {
  const { t } = useI18n();
  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-muted">{t(labelKey)}</p>
            <p className="mt-1 text-2xl font-bold text-text-muted/50">
              {t("productionWorkspace.kpiNotAvailable")}
            </p>
          </div>
          <div className="rounded-full bg-glass-elevated p-2.5 text-text-muted/50">
            {icon}
          </div>
        </div>
        <p className="mt-2 text-xs italic text-text-muted/40">
          {t("productionWorkspace.kpiPendingEngine")}
        </p>
      </CardContent>
    </Card>
  );
}

/* ── Auto-Refresh Selector ──────────────────────────────────── */
interface AutoRefreshSelectorProps {
  value: number | null;
  onChange: (interval: number | null) => void;
}

function AutoRefreshSelector({ value, onChange }: AutoRefreshSelectorProps) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2">
      <label className="whitespace-nowrap text-sm text-text-muted">
        {t("productionWorkspace.autoRefresh")}
      </label>
      <select
        value={String(value ?? "")}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        className="rounded-lg border border-glass-border bg-glass-surface px-2.5 py-1.5 text-sm text-text-primary outline-none transition-colors focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {REFRESH_OPTIONS.map((opt) => (
          <option key={opt.labelKey} value={String(opt.value ?? "")}>
            {t(opt.labelKey)}
          </option>
        ))}
      </select>
    </div>
  );
}

/* ── Completed Filter Tabs ──────────────────────────────────── */
interface CompletedFilterTabsProps {
  value: CompletedFilter;
  onChange: (value: CompletedFilter) => void;
}

function CompletedFilterTabs({ value, onChange }: CompletedFilterTabsProps) {
  const { t } = useI18n();
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as CompletedFilter)}>
      <TabsList>
        {COMPLETED_FILTERS.map((f) => (
          <TabsTrigger key={f.value} value={f.value}>
            {t(f.labelKey)}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

/* ── Loading Skeleton (6 placeholder cards) ─────────────────── */
function StageCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-8 w-12" />
              </div>
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Production Order DataGrid ──────────────────────────────── */
interface OrderTableProps {
  data: ProductionOrderItem[];
  loading: boolean;
  emptyTitle: string;
  emptyDescription: string;
}

function ProductionOrderTable({ data, loading, emptyTitle, emptyDescription }: OrderTableProps) {
  const { t } = useI18n();

  /* Build columns: always-visible + optional that have data */
  const baseColumns = buildBaseColumns(t);

  /* Filter optional columns to only those with at least one non-null value */
  const availableOptional = OPTIONAL_COLUMNS.filter((col) =>
    data.some((row) => {
      const v = col.getValue(row);
      return v !== null && v !== undefined;
    }),
  ).map(
    (col): Column<ProductionOrderItem> => ({
      key: col.key,
      header: col.header,
      render: (row) => col.render(row) ?? <span className="text-sm text-text-muted">—</span>,
    }),
  );

  const columns = [...baseColumns, ...availableOptional];

  if (!loading && data.length === 0) {
    return (
      <EmptyState
        icon={<Inbox className="h-8 w-8" />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <DataGrid
      columns={columns}
      data={data}
      keyExtractor={(row) => row.id}
      loading={loading}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      pageSize={50}
    />
  );
}

/* ── Last-Updated Timestamp ─────────────────────────────────── */
function LastUpdated({ date }: { date: Date | null }) {
  if (!date) return null;
  const formatted = date.toLocaleTimeString();
  return (
    <span className="text-xs text-text-muted/60" title={date.toLocaleString()}>
      Last updated: {formatted}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Main Client Component
   ═══════════════════════════════════════════════════════════════════════════
   // TODO: Connect to Production Detail when implemented.
   // TODO: Connect to Machine Dashboard when implemented.
   // TODO: Connect to Traceability module when implemented.
   // TODO: Connect to Quality Control module when implemented.
   // TODO: Connect to Live MES feed when implemented.
   ═══════════════════════════════════════════════════════════════════════════ */

function ProductionWorkspaceClient() {
  const { t } = useI18n();
  const [data, setData] = useState<ProductionWorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState<number | null>(null);
  const [completedFilter, setCompletedFilter] = useState<CompletedFilter>("today");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  /* Ref to prevent overlapping fetch requests */
  const isFetchingRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── Shared fetch with overlap guard ── */
  const fetchData = useCallback(
    async (isInitial = false, filter?: CompletedFilter) => {
      /* Prevent overlapping requests (auto-refresh or rapid clicks) */
      if (isFetchingRef.current && !isInitial) return;
      isFetchingRef.current = true;

      if (isInitial) setLoading(true);
      else setIsRefreshing(true);

      try {
        const result = await getProductionWorkspaceData(filter ?? completedFilter);
        setData(result);
        setLastUpdated(new Date());
        setError(null);
      } catch (err: any) {
        setError(err?.message ?? t("productionWorkspace.errorLoading"));
      } finally {
        isFetchingRef.current = false;
        if (isInitial) setLoading(false);
        else setIsRefreshing(false);
      }
    },
    [completedFilter, t],
  );

  /* ── Initial load ── */
  useEffect(() => {
    fetchData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Auto-refresh polling — cleaned up on interval change or unmount ── */
  useEffect(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (refreshInterval !== null) {
      pollRef.current = setInterval(() => {
        fetchData(false);
      }, refreshInterval);
    }
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [refreshInterval, fetchData]);

  /* ── Re-fetch when filter tab changes ── */
  useEffect(() => {
    if (data) fetchData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedFilter]);

  /* ── Derive stage card props from server data ── */
  const stageCards: StageCardProps[] = React.useMemo(
    () =>
      (data?.summary.stageCounts ?? []).map((sc: StageCount) => ({
        operation: sc.operation,
        labelKey: sc.labelKey,
        count: sc.count,
        visual: getStageVisual(sc.operation),
      })),
    [data],
  );

  /* ══════════════════════════════════════════════════════════════════════
     Render: Loading (first paint)
     ══════════════════════════════════════════════════════════════════════ */
  if (loading && !data) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <StageCardsSkeleton />
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     Render: Error (no cached data)
     ══════════════════════════════════════════════════════════════════════ */
  if (error && !data) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="rounded-full bg-danger/10 p-4 text-danger">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">
            {t("productionWorkspace.errorLoading")}
          </h3>
          <p className="max-w-sm text-sm text-text-muted">{error}</p>
          <button
            onClick={() => fetchData(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            {t("productionWorkspace.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════════════════════
     Render: Data
     ══════════════════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ── Header: title + sync controls ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {t("productionWorkspace.title")}
          </h1>
          <p className="mt-1 text-sm text-text-muted">
            {t("productionWorkspace.description")}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            <AutoRefreshSelector value={refreshInterval} onChange={setRefreshInterval} />
            <button
              onClick={() => fetchData(false)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-glass-border bg-glass-surface px-3 py-1.5 text-sm text-text-secondary transition-colors hover:bg-glass-elevated hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
          <LastUpdated date={lastUpdated} />
        </div>
      </div>

      {/* ── Stage Summary Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stageCards.map((card) => (
          <StageCard key={card.operation} {...card} />
        ))}
      </div>

      {/* ── Production KPIs (Placeholder) ──
           // TODO: Replace with live KPI Engine data subscription.
           // TODO: Add per-KPI trend sparkline.
           // TODO: Connect card click → KPI detail panel.                */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-text-muted" />
            <div>
              <CardTitle>{t("productionWorkspace.kpiSectionTitle")}</CardTitle>
              <CardDescription>
                {t("productionWorkspace.kpiSectionDesc")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {KPI_DEFINITIONS.map(({ key, ...kpi }) => (
              <KpiCard key={key} {...kpi} />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Active Production Orders ──
           // TODO: Row click → Production Detail page.                  */}
      <Card>
        <CardHeader>
          <CardTitle>{t("productionWorkspace.activeTitle")}</CardTitle>
          <CardDescription>
            {t("productionWorkspace.activeDescription")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProductionOrderTable
            data={data!.activeJobs}
            loading={loading}
            emptyTitle={t("productionWorkspace.noActive")}
            emptyDescription={t("productionWorkspace.noActiveDesc")}
          />
        </CardContent>
      </Card>

      {/* ── Recently Completed ──
           // TODO: Row click → completed Production Detail read-only view. */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("productionWorkspace.recentTitle")}</CardTitle>
              <CardDescription>
                {t("productionWorkspace.recentDescription")}
              </CardDescription>
            </div>
            <CompletedFilterTabs value={completedFilter} onChange={setCompletedFilter} />
          </div>
        </CardHeader>
        <CardContent>
          <ProductionOrderTable
            data={data!.recentCompleted}
            loading={loading}
            emptyTitle={t("productionWorkspace.noCompleted")}
            emptyDescription={t("productionWorkspace.noCompletedDesc")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

export { ProductionWorkspaceClient };
