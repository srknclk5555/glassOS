"use client";

import * as React from "react";
import {
  PlayCircle,
  Pause,
  CheckCircle2,
  QrCode,
  Timer,
  Layers,
  Factory,
} from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/button";
import { useI18n } from "../../i18n/context";
import type { ActiveWorkItem } from "./types";
import { formatElapsed, JOB_STATUS_CONFIG } from "./types";

interface ActiveWorkPanelProps {
  work: ActiveWorkItem | null;
  onPause?: (id: string) => void;
  onComplete?: (id: string) => void;
  onOpenBarcode?: () => void;
}

function EmptyActiveWork() {
  const { t } = useI18n();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-glass-surface">
        <PlayCircle className="h-6 w-6 text-text-muted" />
      </div>
      <div>
        <p className="text-sm font-medium text-text-primary">{t("queue.noActiveWork")}</p>
        <p className="mt-0.5 text-xs text-text-muted">
          {t("queue.takeJobHint")}
        </p>
      </div>
    </div>
  );
}

function ActiveWorkPanel({
  work,
  onPause,
  onComplete,
  onOpenBarcode,
}: ActiveWorkPanelProps) {
  const { t } = useI18n();
  if (!work) return <EmptyActiveWork />;

  const statusCfg =
    (JOB_STATUS_CONFIG[work.status] ?? JOB_STATUS_CONFIG.in_progress) as NonNullable<typeof JOB_STATUS_CONFIG[string]>;

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
          {t("queue.myActiveWork")}
        </h3>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
            statusCfg.bg,
            statusCfg.color
          )}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusCfg.dot}`} />
          {t(statusCfg.labelKey)}
        </span>
      </div>

      {/* Current Job */}
      <div className="rounded-xl border border-glass-border bg-glass-surface p-4">
        <p className="text-base font-bold text-text-primary">
          {work.orderNumber || work.glassBarcode}
        </p>
        <p className="mt-0.5 text-xs text-text-muted">{work.customerName}</p>
      </div>

      {/* Timer */}
      <div className="flex items-center gap-3 rounded-xl border border-glass-border bg-glass-surface p-4">
        <Timer className="h-5 w-5 text-primary" />
        <div>
          <p className="text-xs text-text-muted">{t("queue.elapsedTime")}</p>
          <p className="text-lg font-bold tabular-nums text-text-primary">
            {formatElapsed(work.elapsedMinutes)}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="space-y-2 rounded-xl border border-glass-border bg-glass-surface p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-text-muted">{t("queue.progress")}</span>
          <span className="font-medium text-text-primary">{work.progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-glass-background">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${Math.min(work.progress, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[11px] text-text-muted">
          <span>{work.piecesCompleted} {t("queue.done")}</span>
          <span>{work.piecesRemaining} {t("queue.remaining")}</span>
        </div>
      </div>

      {/* Station + Machine */}
      <div className="space-y-2 rounded-xl border border-glass-border bg-glass-surface p-4">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Factory className="h-3.5 w-3.5 text-text-muted" />
          <span className="font-medium text-text-primary">{work.stationName}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Layers className="h-3.5 w-3.5 text-text-muted" />
          <span>{work.operation}</span>
        </div>
        {work.machineName && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <Factory className="h-3.5 w-3.5 text-text-muted" />
            <span>{work.machineName}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <Layers className="h-3.5 w-3.5 text-text-muted" />
          <span>{work.pieces} {t("queue.piecesTotal")}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto space-y-2 border-t border-glass-border pt-4">
        {onOpenBarcode && (
          <Button
            variant="secondary"
            size="md"
            className="w-full text-xs"
            onClick={onOpenBarcode}
          >
            <QrCode className="mr-2 h-4 w-4" />
            {t("queue.openBarcodeScanner")}
          </Button>
        )}
        <div className="flex gap-2">
          {onPause && (
            <Button
              variant="outline"
              size="md"
              className="flex-1 text-xs"
              onClick={() => onPause(work.id)}
            >
              <Pause className="mr-1 h-3.5 w-3.5" />
              {t("queue.pause")}
            </Button>
          )}
          {onComplete && (
            <Button
              variant="primary"
              size="md"
              className="flex-1 text-xs"
              onClick={() => onComplete(work.id)}
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              {t("queue.complete")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export { ActiveWorkPanel };
