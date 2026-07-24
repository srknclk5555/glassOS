"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@repo/ui";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Skeleton,
  EmptyState,
} from "@repo/ui";
import {
  Plus,
  RefreshCw,
  Eye,
  ClipboardList,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Search,
  Filter,
  FileSpreadsheet,
  Bookmark,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import { listProductionOrdersAction, getProductionOrderKpiAction } from "@/app/actions/production-orders";
import type { ProductionOrderListFilters } from "@/app/actions/production-orders";
import type { ProductionOrderKpiData } from "@/app/actions/production-orders";

/* ── Types ────────────────────────────────────────────────────────────── */

interface ProductionOrderRow {
  id: string;
  orderNo: string;
  customerName: string | null;
  productionDate: string | null;
  dueDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  itemCount?: number;
  totalNetArea?: number;
  totalProductionArea?: number;
  totalGlassConsumption?: number;
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

const STATUS_OPTIONS = [
  { value: "", labelKey: "productionOrders.allStatus" },
  { value: "draft", labelKey: "productionOrders.statusDraft" },
  { value: "ready", labelKey: "productionOrders.statusReady" },
  { value: "released", labelKey: "productionOrders.statusReleased" },
  { value: "cancelled", labelKey: "productionOrders.statusCancelled" },
] as const;

const STATUS_LABELS: Record<string, string> = {
  draft: "Taslak",
  ready: "Hazır",
  released: "Serbest",
  cancelled: "İptal",
};

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const statusMap: Record<string, { variant: "secondary" | "warning" | "info" | "success" | "danger"; icon: React.ReactNode; label: string }> = {
    draft: { variant: "secondary", icon: <Clock className="h-3 w-3" />, label: t("productionOrders.statusDraft") },
    ready: { variant: "info", icon: <AlertCircle className="h-3 w-3" />, label: t("productionOrders.statusReady") },
    released: { variant: "success", icon: <CheckCircle2 className="h-3 w-3" />, label: t("productionOrders.statusReleased") },
    cancelled: { variant: "danger", icon: <XCircle className="h-3 w-3" />, label: t("productionOrders.statusCancelled") },
  };
  const config = statusMap[status] ?? statusMap.draft;
  return (
    <Badge variant={config!.variant} className="gap-1.5 whitespace-nowrap">
      {config!.icon}
      {config!.label}
    </Badge>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    draft: "bg-gray-400",
    ready: "bg-blue-400",
    released: "bg-green-400",
    cancelled: "bg-red-400",
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[status] ?? "bg-gray-400"}`} />;
}

function formatDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatM2(value: number | string | null | undefined): string {
  const num = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (isNaN(num)) return "0";
  if (num >= 10000) return `${(num / 1000).toFixed(1)}k`;
  return num.toFixed(0);
}

/* ── KPI Mini Card ──────────────────────────────────────────────────── */

interface KpiMiniProps {
  label: string;
  count: number;
  areaM2: number;
  color: string;
  barColor: string;
  loading?: boolean;
}

function KpiMiniCard({ label, count, areaM2, color, barColor, loading }: KpiMiniProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1 rounded-lg border border-glass-border bg-glass-panel p-2.5">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-3 w-10" />
      </div>
    );
  }
  return (
    <div className={`flex flex-col gap-0.5 rounded-lg border border-glass-border bg-glass-panel p-2.5 border-l-2 ${barColor}`}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-text-muted">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-lg font-bold ${color}`}>{count}</span>
        <span className="text-[10px] text-text-muted">emir</span>
      </div>
      <span className="text-[11px] font-medium text-text-secondary">{formatM2(areaM2)} m²</span>
    </div>
  );
}

/* ── Data Grid (lightweight) ────────────────────────────────────────── */

interface Column2<T> {
  key: string;
  header: string;
  width?: string;
  render: (row: T) => React.ReactNode;
}

function SimpleDataGrid<T extends { id: string }>({
  columns,
  data,
  loading,
  error,
  emptyMessage,
  onRowClick,
}: {
  columns: Column2<T>[];
  data: T[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
}) {
  if (loading) {
    return (
      <div className="flex flex-col gap-1 p-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <EmptyState icon={<AlertCircle className="h-8 w-8" />} title="Error" description={error} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-6">
        <EmptyState
          icon={<ClipboardList className="h-8 w-8" />}
          title={emptyMessage ?? "Kayıt bulunamadı"}
          description=""
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-glass-border bg-glass-surface/50">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-3 py-2.5 text-left font-medium uppercase tracking-wider text-text-muted"
                style={col.width ? { width: col.width } : undefined}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.id}
              className={`border-b border-glass-border transition-colors hover:bg-glass-surface/40 cursor-pointer ${
                idx % 2 === 0 ? "bg-glass-panel/30" : ""
              }`}
              onClick={() => onRowClick?.(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2.5">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Production Order List Page
   ═══════════════════════════════════════════════════════════════════════════ */

export function ProductionOrderListClient() {
  const { t } = useI18n();
  const router = useRouter();

  /* ── State ── */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<ProductionOrderRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [kpi, setKpi] = useState<ProductionOrderKpiData | null>(null);
  const [kpiLoading, setKpiLoading] = useState(true);

  const [filters, setFilters] = useState<{
    search?: string;
    status?: string;
  }>({});

  const [searchInput, setSearchInput] = useState("");

  /* ── Fetch KPI Data ── */
  const fetchKpiData = useCallback(async () => {
    setKpiLoading(true);
    try {
      const result = await getProductionOrderKpiAction();
      setKpi(result);
    } catch {
      // Non-critical
    } finally {
      setKpiLoading(false);
    }
  }, []);

  /* ── Fetch Main List ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listProductionOrdersAction({
        page,
        limit: pageSize,
        search: filters.search,
        status: filters.status || undefined,
      });
      setOrders((result.items ?? []) as ProductionOrderRow[]);
      setTotal(result.total ?? 0);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : t("productionOrders.error.loadFailed"),
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
    setSearchInput("");
    fetchKpiData();
    fetchData();
  }, [fetchData, fetchKpiData]);

  const handleSearch = useCallback((value: string) => {
    setSearchInput(value);
    setFilters((prev) => ({ ...prev, search: value || undefined }));
    setPage(1);
  }, []);

  const handleStatusFilter = useCallback((status: string) => {
    setFilters((prev) => ({ ...prev, status: status || undefined }));
    setPage(1);
  }, []);

  const totalPages = Math.ceil(total / pageSize);

  /* ── Columns ── */
  const columns: Column2<ProductionOrderRow>[] = useMemo(() => [
    {
      key: "orderNo",
      header: "Emir No",
      width: "14%",
      render: (row) => (
        <span className="font-semibold text-text-primary text-xs">{row.orderNo}</span>
      ),
    },
    {
      key: "customerName",
      header: "Müşteri",
      width: "18%",
      render: (row) => (
        <span className="text-text-secondary">{row.customerName ?? "—"}</span>
      ),
    },
    {
      key: "productionDate",
      header: "Tarih",
      width: "12%",
      render: (row) => (
        <span className="text-text-secondary">{formatDate(row.productionDate)}</span>
      ),
    },
    {
      key: "totalProductionArea",
      header: "m²",
      width: "8%",
      render: (row) => (
        <span className="font-medium text-text-primary">{formatM2(row.totalProductionArea ?? 0)}</span>
      ),
    },
    {
      key: "status",
      header: "Durum",
      width: "14%",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: "",
      width: "6%",
      render: (row) => (
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/production/orders/${row.id}`);
          }}
        >
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      ),
    },
  ], [t, router]);

  /* ── Total m² for KPI summary ── */
  const todayAreaM2 = kpi?.todayAreaM2 ?? 0;
  const pendingAreaM2 = (kpi?.draftAreaM2 ?? 0) + (kpi?.readyAreaM2 ?? 0);
  const totalAreaM2 = kpi?.totalAreaM2 ?? 0;

  /* ── Render ── */
  return (
    <div className="flex h-full gap-0">
      {/* ═══ LEFT PANEL (240px) ═══ */}
      <aside className="w-60 shrink-0 border-r border-glass-border bg-glass-panel/50 flex flex-col">
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* ── FİLTRELER ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Filter className="h-3.5 w-3.5 text-text-muted" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Filtreler</span>
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => handleStatusFilter("")}
                className={`w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                  !filters.status
                    ? "bg-glass-accent/10 text-glass-accent font-medium"
                    : "text-text-secondary hover:bg-glass-surface/50"
                }`}
              >
                <span>Tümü</span>
                <span className="text-[11px] text-text-muted">{kpi ? ((kpi.draft + kpi.ready + kpi.released + kpi.cancelled) || "-") : "..."}</span>
              </button>
              {["draft", "ready", "released", "cancelled"].map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusFilter(s)}
                  className={`w-full flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition-colors ${
                    filters.status === s
                      ? "bg-glass-accent/10 text-glass-accent font-medium"
                      : "text-text-secondary hover:bg-glass-surface/50"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <StatusDot status={s} />
                    <span>{STATUS_LABELS[s]}</span>
                  </div>
                  <span className="text-[11px] text-text-muted">{kpi ? kpi[s as keyof ProductionOrderKpiData] || "-" : "..."}</span>
                </button>
              ))}
            </div>
            {filters.status && (
              <button
                onClick={() => handleStatusFilter("")}
                className="mt-2 flex items-center gap-1 text-[11px] text-text-muted hover:text-text-primary transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Filtreleri Temizle</span>
              </button>
            )}
          </div>

          {/* ── HACİM ÖZETİ ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 mt-4">
              <ClipboardList className="h-3.5 w-3.5 text-text-muted" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Hacim Özeti</span>
            </div>
            <div className="space-y-1.5">
              {kpiLoading ? (
                <>
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                  <Skeleton className="h-7 w-full" />
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-md bg-glass-surface/30 px-2.5 py-1.5">
                    <span className="text-xs text-text-secondary">Bugünkü m²</span>
                    <span className="text-sm font-bold text-glass-accent">{formatM2(todayAreaM2)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-glass-surface/30 px-2.5 py-1.5">
                    <span className="text-xs text-text-secondary">Bekleyen m²</span>
                    <span className="text-sm font-bold text-amber-500">{formatM2(pendingAreaM2)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-glass-surface/30 px-2.5 py-1.5">
                    <span className="text-xs text-text-secondary">Toplam m²</span>
                    <span className="text-sm font-bold text-text-primary">{formatM2(totalAreaM2)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-md bg-glass-surface/30 px-2.5 py-1.5">
                    <span className="text-xs text-text-secondary">Toplam Fire</span>
                    <span className="text-sm font-bold text-red-500">%--</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── SIK KULLANILANLAR ── */}
          <div>
            <div className="flex items-center gap-1.5 mb-2 mt-4">
              <Bookmark className="h-3.5 w-3.5 text-text-muted" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">Sık Kullanılanlar</span>
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => handleStatusFilter("")}
                className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-text-secondary hover:bg-glass-surface/50 transition-colors"
              >
                <span>📌</span>
                <span>Krizdeki siparişler</span>
              </button>
              <button
                onClick={() => {
                  const today = new Date().toISOString().split("T")[0]!;
                  handleSearch(today);
                }}
                className="w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs text-text-secondary hover:bg-glass-surface/50 transition-colors"
              >
                <span>📌</span>
                <span>Bugün terminli emirler</span>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ═══ RIGHT PANEL (main) ═══ */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* ── TOOLBAR ── */}
        <div className="flex items-center justify-between gap-3 border-b border-glass-border px-5 py-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <input
                type="text"
                placeholder="Emir no, müşteri ara..."
                value={searchInput}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full rounded-md border border-glass-border bg-glass-panel py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-glass-accent"
              />
            </div>
            <div className="flex items-center gap-1 rounded-md border border-glass-border bg-glass-panel px-2 py-1">
              <span className="text-[11px] text-text-muted">Durum:</span>
              <select
                value={filters.status ?? ""}
                onChange={(e) => handleStatusFilter(e.target.value)}
                className="border-0 bg-transparent text-xs text-text-primary focus:outline-none cursor-pointer"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey as any)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={handleRefresh}>
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Yenile</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dışa Aktar</span>
            </Button>
            <Button size="sm" className="h-7 text-xs gap-1" onClick={() => router.push("/production/orders/new")}>
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Yeni Emir</span>
            </Button>
          </div>
        </div>

        {/* ── KPI BAR (compact) ── */}
        <div className="grid grid-cols-5 gap-2 px-5 py-3 border-b border-glass-border">
          <KpiMiniCard
            label="Toplam"
            count={kpi ? (kpi.draft + kpi.ready + kpi.released + kpi.cancelled) : 0}
            areaM2={totalAreaM2}
            color="text-blue-600 dark:text-blue-400"
            barColor="border-l-blue-500"
            loading={kpiLoading}
          />
          <KpiMiniCard
            label="Taslak"
            count={kpi?.draft ?? 0}
            areaM2={kpi?.draftAreaM2 ?? 0}
            color="text-gray-600 dark:text-gray-400"
            barColor="border-l-gray-400"
            loading={kpiLoading}
          />
          <KpiMiniCard
            label="Hazır"
            count={kpi?.ready ?? 0}
            areaM2={kpi?.readyAreaM2 ?? 0}
            color="text-blue-600 dark:text-blue-400"
            barColor="border-l-blue-400"
            loading={kpiLoading}
          />
          <KpiMiniCard
            label="Serbest"
            count={kpi?.released ?? 0}
            areaM2={kpi?.releasedAreaM2 ?? 0}
            color="text-green-600 dark:text-green-400"
            barColor="border-l-green-400"
            loading={kpiLoading}
          />
          <KpiMiniCard
            label="İptal"
            count={kpi?.cancelled ?? 0}
            areaM2={kpi?.cancelledAreaM2 ?? 0}
            color="text-red-600 dark:text-red-400"
            barColor="border-l-red-400"
            loading={kpiLoading}
          />
        </div>

        {/* ── DATA GRID ── */}
        <div className="flex-1 overflow-auto">
          <SimpleDataGrid
            columns={columns}
            data={orders}
            loading={loading}
            error={error}
            emptyMessage={t("productionOrders.emptyState.noOrders")}
            onRowClick={(row) => router.push(`/production/orders/${row.id}`)}
          />
        </div>

        {/* ── PAGINATION ── */}
        {total > pageSize && !loading && (
          <div className="flex items-center justify-between border-t border-glass-border px-5 py-2.5">
            <span className="text-[11px] text-text-muted">
              Toplam {total} kayıt — {page}. sayfa
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ◀
              </Button>
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                const startPage = Math.max(1, page - 3);
                const pageNum = startPage + i;
                if (pageNum > totalPages) return null;
                return (
                  <Button
                    key={pageNum}
                    variant={pageNum === page ? "primary" : "ghost"}
                    size="sm"
                    className={`h-7 min-w-7 p-0 text-xs ${pageNum === page ? "" : "text-text-secondary"}`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                ▶
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
