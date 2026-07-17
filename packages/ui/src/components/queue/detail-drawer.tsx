"use client";

import * as React from "react";
import {
  X,
  Clock,
  Ruler,
  Layers,
  AlertTriangle,
  RotateCcw,
  FileText,
  User,
  Hash,
  ChevronRight,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { useI18n } from "../../i18n/context";
import type { QueueDetail, TimelineEvent } from "./types";
import {
  JOB_STATUS_CONFIG,
  getPriorityLabel,
  getPriorityColor,
} from "./types";

interface DetailDrawerProps {
  jobId: string | null;
  detail: QueueDetail | null;
  loading: boolean;
  onClose: () => void;
}

function TimelineItem({ event }: { event: TimelineEvent }) {
  const { t } = useI18n();
  const labels: Record<string, string> = {
    started: t("queue.eventStarted"),
    paused: t("queue.eventPaused"),
    completed: t("queue.eventCompleted"),
    transferred: t("queue.eventTransferred"),
    rework_created: t("queue.eventReworkCreated"),
    broken: t("queue.eventMarkedBroken"),
  };

  return (
    <div className="relative flex gap-3 pb-4 pl-6">
      {/* Dot + line */}
      <div className="absolute left-0 top-1 flex flex-col items-center">
        <div className="h-2 w-2 rounded-full border-2 border-primary bg-glass-background" />
        <div className="mt-1 h-full w-px bg-glass-border" />
      </div>
      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-primary">
          {labels[event.eventType] ?? event.eventType}
        </p>
        <p className="text-[11px] text-text-muted">
          {new Date(event.timestamp).toLocaleString()}
        </p>
        {(event.fromOperation || event.toOperation) && (
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-text-muted">
            {event.fromOperation && <span>{event.fromOperation}</span>}
            {(event.fromOperation && event.toOperation) && (
              <ChevronRight className="h-3 w-3" />
            )}
            {event.toOperation && <span>{event.toOperation}</span>}
          </p>
        )}
      </div>
    </div>
  );
}

function DetailDrawer({ jobId, detail, loading, onClose }: DetailDrawerProps) {
  const { t } = useI18n();
  /* Don't render anything if closed */
  if (!jobId) return null;

  const statusCfg = detail
    ? JOB_STATUS_CONFIG[detail.status] ?? JOB_STATUS_CONFIG.waiting
    : null;

  return (
    <div
      className="fixed inset-0 z-40 flex justify-end bg-black/30 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("queue.jobDetails")}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-glass-border bg-glass-background shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b border-glass-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">
              {t("queue.jobDetails")}
            </h2>
            {detail && (
              <p className="text-xs text-text-muted">{detail.glassBarcode}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-text-muted hover:bg-glass-surface hover:text-text-primary transition-colors"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-xs text-text-muted">{t("queue.loading")}</p>
            </div>
          </div>
        )}

        {/* ── Content ── */}
        {!loading && !detail && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-xs text-text-muted">{t("queue.jobNotFound")}</p>
          </div>
        )}

        {!loading && detail && (
          <div className="flex-1 overflow-y-auto scroll-smooth px-5 py-4">
            <div className="space-y-5">
              {/* Status + Priority */}
              <div className="flex items-center justify-between">
                {statusCfg && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
                      statusCfg.bg,
                      statusCfg.color
                    )}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`}
                    />
                    {t(statusCfg.labelKey)}
                  </span>
                )}
                <span
                  className={cn(
                    "text-xs font-bold",
                    getPriorityColor(detail.priority)
                  )}
                >
                  {t(getPriorityLabel(detail.priority))} {t("queue.prioritySuffix")}
                </span>
              </div>

              {/* Order Info */}
              <div className="space-y-3 rounded-xl border border-glass-border bg-glass-surface p-4">
                <div className="flex items-center gap-2 text-xs">
                  <Hash className="h-3.5 w-3.5 text-text-muted" />
                  <span className="text-text-secondary">{t("queue.order")}</span>
                  <span className="font-medium text-text-primary">
                    {detail.orderNumber}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <User className="h-3.5 w-3.5 text-text-muted" />
                  <span className="text-text-secondary">{t("queue.customer")}</span>
                  <span className="font-medium text-text-primary">
                    {detail.customerName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Layers className="h-3.5 w-3.5 text-text-muted" />
                  <span className="text-text-secondary">{t("queue.operation")}</span>
                  <span className="font-medium text-text-primary">
                    {detail.operation}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Hash className="h-3.5 w-3.5 text-text-muted" />
                  <span className="text-text-secondary">{t("queue.station")}</span>
                  <span className="font-medium text-text-primary">
                    {detail.stationName}
                  </span>
                </div>
              </div>

              {/* Glass Dimensions */}
              <div className="space-y-2 rounded-xl border border-glass-border bg-glass-surface p-4">
                <h4 className="text-xs font-semibold text-text-primary">
                  {t("queue.glassDimensions")}
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[11px] text-text-muted">{t("queue.width")}</p>
                    <p className="text-sm font-medium text-text-primary">
                      {detail.widthMm} mm
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-text-muted">{t("queue.height")}</p>
                    <p className="text-sm font-medium text-text-primary">
                      {detail.heightMm} mm
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-text-muted">{t("queue.pieces")}</p>
                    <p className="text-sm font-medium text-text-primary">
                      {detail.pieces}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-text-muted">{t("queue.area")}</p>
                    <p className="text-sm font-medium text-text-primary">
                      {detail.areaM2} m²
                    </p>
                  </div>
                </div>
              </div>

              {/* Recipe */}
              {detail.recipeName && (
                <div className="rounded-xl border border-glass-border bg-glass-surface p-4">
                  <h4 className="text-xs font-semibold text-text-primary">
                    {t("queue.recipe")}
                  </h4>
                  <p className="mt-1 text-xs text-text-secondary">
                    {detail.recipeName}
                  </p>
                </div>
              )}

              {/* Notes */}
              {detail.notes && (
                <div className="rounded-xl border border-glass-border bg-glass-surface p-4">
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
                    <FileText className="h-3.5 w-3.5 text-text-muted" />
                    {t("queue.notes")}
                  </div>
                  <p className="mt-1.5 text-xs text-text-secondary">
                    {detail.notes}
                  </p>
                </div>
              )}

              {/* Rework Badge */}
              {detail.isRework && (
                <div className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/5 p-3">
                  <RotateCcw className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                    {t("queue.reworkJob")}
                  </span>
                </div>
              )}

              {/* Timeline */}
              <div className="rounded-xl border border-glass-border bg-glass-surface p-4">
                <h4 className="mb-3 text-xs font-semibold text-text-primary">
                  {t("queue.timeline")}
                </h4>
                {detail.timeline.length === 0 ? (
                  <p className="text-xs text-text-muted">{t("queue.noEvents")}</p>
                ) : (
                  <div className="space-y-0">
                    {detail.timeline.map((evt, i) => (
                      <TimelineItem key={i} event={evt} />
                    ))}
                  </div>
                )}
              </div>

              {/* Created */}
              <div className="flex items-center gap-2 text-[11px] text-text-muted">
                <Clock className="h-3 w-3" />
                {t("queue.created")} {new Date(detail.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export { DetailDrawer };
