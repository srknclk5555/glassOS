"use client";

import * as React from "react";
import {
  Clock,
  Ruler,
  Layers,
  AlertTriangle,
  RotateCcw,
  UserPlus,
  Eye,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/button";
import { useI18n } from "../../i18n/context";
import type { QueueJobItem } from "./types";
import {
  JOB_STATUS_CONFIG,
  getPriorityLabel,
  getPriorityColor,
} from "./types";

interface QueueCardProps {
  job: QueueJobItem;
  onTakeJob?: (id: string) => void;
  onViewDetails?: (id: string) => void;
}

function QueueCard({ job, onTakeJob, onViewDetails }: QueueCardProps) {
  const { t } = useI18n();
  const statusCfg = (JOB_STATUS_CONFIG[job.status] ??
    JOB_STATUS_CONFIG.waiting) as NonNullable<typeof JOB_STATUS_CONFIG[string]>;

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-glass-border bg-glass-surface p-4 transition-all",
        "hover:border-glass-border-hover hover:shadow-md hover:shadow-black/5",
        job.isRework && "border-l-4 border-l-purple-500"
      )}
    >
      {/* Top row: status + priority */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${statusCfg.bg} ${statusCfg.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
            {t(statusCfg.labelKey)}
          </span>
          {job.isRework && (
            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              <RotateCcw className="h-3 w-3" />
              {t("queue.rework")}
            </span>
          )}
        </div>
        <span
          className={cn(
            "whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-bold",
            getPriorityColor(job.priority),
            "bg-current/5"
          )}
        >
          {t(getPriorityLabel(job.priority))}
        </span>
      </div>

      {/* Order number + Customer */}
      <div className="mb-2">
        <p className="text-sm font-semibold text-text-primary">
          {job.orderNumber || job.glassBarcode}
        </p>
        {job.customerName && (
          <p className="text-xs text-text-muted">{job.customerName}</p>
        )}
      </div>

      {/* Specs grid */}
      <div className="mb-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-secondary">
        <span className="flex items-center gap-1">
          <Layers className="h-3 w-3 text-text-muted" />
          {job.pieces} {t("queue.piecesShort")}
        </span>
        <span className="flex items-center gap-1">
          <Ruler className="h-3 w-3 text-text-muted" />
          {job.widthMm}×{job.heightMm} mm
        </span>
        <span className="flex items-center gap-1">
          <span className="font-medium">{job.operation}</span>
        </span>
        <span className="flex items-center gap-1">
          <span>{job.areaM2} m²</span>
        </span>
      </div>

      {/* Station + Created */}
      <div className="mb-3 flex items-center gap-3 text-[11px] text-text-muted">
        {job.stationName && (
          <span>{job.stationName}</span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {new Date(job.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 border-t border-glass-border pt-3">
        {onTakeJob && job.status === "waiting" && (
          <Button
            variant="primary"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onTakeJob(job.id)}
          >
            <UserPlus className="mr-1 h-3.5 w-3.5" />
            {t("queue.takeJob")}
          </Button>
        )}
        {onViewDetails && (
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 text-xs"
            onClick={() => onViewDetails(job.id)}
          >
            <Eye className="mr-1 h-3.5 w-3.5" />
            {t("queue.details")}
          </Button>
        )}
      </div>
    </div>
  );
}

export { QueueCard };
