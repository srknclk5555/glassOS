"use client";

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { Loader2, AlertCircle, WifiOff } from "lucide-react";
import { useI18n } from "../../i18n/context";
import { SummaryCards } from "./summary-cards";
import { QueueFilters } from "./queue-filters";
import { QueueCard } from "./queue-card";
import { ActiveWorkPanel } from "./active-work-panel";
import { BarcodeScanner } from "./barcode-scanner";
import { DetailDrawer } from "./detail-drawer";
import type {
  QueueJobItem,
  StationFilter,
  MachineFilter,
  OperationFilter,
  ActiveWorkItem,
  QueueSummary,
  QueueFiltersState,
  QueueDetail,
} from "./types";

/* ── Types for the page's data contract ── */

export interface ProductionQueuePageData {
  jobs: QueueJobItem[];
  stations: StationFilter[];
  machines: MachineFilter[];
  operations: OperationFilter[];
  activeWork: ActiveWorkItem | null;
  summary: QueueSummary;
}

/* ── Props ── */

interface ProductionQueuePageProps {
  data: ProductionQueuePageData;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onTakeJob: (id: string) => Promise<void>;
  onPauseJob: (id: string) => Promise<void>;
  onCompleteJob: (id: string) => Promise<void>;
  onGetDetail: (id: string) => Promise<QueueDetail | null>;
}

/* ── Component ── */

function ProductionQueuePage({
  data,
  loading,
  error,
  onRefresh,
  onTakeJob,
  onPauseJob,
  onCompleteJob,
  onGetDetail,
}: ProductionQueuePageProps) {
  const { t } = useI18n();
  const [filters, setFilters] = useState<QueueFiltersState>({
    stationId: "",
    machineId: "",
    operation: "",
    priority: "",
    status: "",
    search: "",
  });
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [detailJobId, setDetailJobId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<QueueDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [takingIds, setTakingIds] = useState<Set<string>>(new Set());

  /* ── Filtered jobs ── */
  const filteredJobs = useMemo(() => {
    let list = data.jobs;

    if (filters.stationId) {
      list = list.filter((j) => j.stationName.includes(filters.stationId));
    }
    if (filters.operation) {
      list = list.filter((j) => j.operation === filters.operation);
    }
    if (filters.priority) {
      const pri = Number(filters.priority);
      list = list.filter((j) => j.priority === pri);
    }
    if (filters.status) {
      list = list.filter((j) => j.status === filters.status);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (j) =>
          j.orderNumber.toLowerCase().includes(q) ||
          j.glassBarcode.toLowerCase().includes(q) ||
          j.customerName.toLowerCase().includes(q)
      );
    }

    return list;
  }, [data.jobs, filters]);

  /* ── Handlers ── */
  const handleTakeJob = useCallback(
    async (id: string) => {
      setTakingIds((prev) => new Set(prev).add(id));
      try {
        await onTakeJob(id);
      } finally {
        setTakingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [onTakeJob]
  );

  const handleViewDetails = useCallback(
    async (id: string) => {
      setDetailJobId(id);
      setDetailLoading(true);
      setDetailData(null);
      try {
        const detail = await onGetDetail(id);
        setDetailData(detail);
      } finally {
        setDetailLoading(false);
      }
    },
    [onGetDetail]
  );

  const handleBarcodeScan = useCallback(
    (barcode: string) => {
      setFilters((prev) => ({ ...prev, search: barcode }));
    },
    []
  );

  /* ── Loading State ── */
  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-text-muted">{t("queue.loading")}</p>
        </div>
      </div>
    );
  }

  /* ── Error State ── */
  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10">
            <WifiOff className="h-6 w-6 text-danger" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              {t("queue.backendUnavailable")}
            </h2>
            <p className="mt-1 text-sm text-text-muted">{error}</p>
          </div>
          <button
            onClick={onRefresh}
            className="rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary-hover transition-colors"
          >
            {t("queue.tryAgain")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* ── Top Summary ── */}
      <SummaryCards summary={data.summary} />

      {/* ── Three-panel layout ── */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* LEFT: Filters */}
        <aside className="hidden w-56 shrink-0 overflow-y-auto rounded-xl border border-glass-border bg-glass-surface p-4 lg:block">
          <QueueFilters
            stations={data.stations}
            machines={data.machines}
            operations={data.operations}
            filters={filters}
            onChange={setFilters}
          />
        </aside>

        {/* CENTER: Waiting Jobs */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">
              {t("queue.waitingJobs")}
              <span className="ml-2 text-xs font-normal text-text-muted">
                {filteredJobs.length} of {data.jobs.length}
              </span>
            </h2>
            <button
              onClick={onRefresh}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              {t("queue.refresh")}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scroll-smooth">
            {filteredJobs.length === 0 ? (
              <div className="flex h-full items-center justify-center py-12">
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-glass-surface">
                    <AlertCircle className="h-5 w-5 text-text-muted" />
                  </div>
                  <p className="text-sm font-medium text-text-primary">
                    {t("queue.noJobsFound")}
                  </p>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {data.jobs.length === 0
                      ? t("queue.queueEmpty")
                      : t("queue.adjustFilters")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredJobs.map((job) => (
                  <QueueCard
                    key={job.queueItemId}
                    job={job}
                    onTakeJob={handleTakeJob}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* RIGHT: Active Work */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto rounded-xl border border-glass-border bg-glass-surface p-4 xl:block">
          <ActiveWorkPanel
            work={data.activeWork}
            onPause={onPauseJob}
            onComplete={onCompleteJob}
            onOpenBarcode={() => setBarcodeOpen(true)}
          />
        </aside>
      </div>

      {/* ── Barcode Scanner ── */}
      <BarcodeScanner
        open={barcodeOpen}
        onClose={() => setBarcodeOpen(false)}
        onScan={handleBarcodeScan}
      />

      {/* ── Detail Drawer ── */}
      <DetailDrawer
        jobId={detailJobId}
        detail={detailData}
        loading={detailLoading}
        onClose={() => {
          setDetailJobId(null);
          setDetailData(null);
        }}
      />
    </div>
  );
}

export { ProductionQueuePage };
