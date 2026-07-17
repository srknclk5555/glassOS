"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { useI18n } from "../../i18n/context";
import type {
  StationFilter,
  MachineFilter,
  OperationFilter,
  QueueFiltersState,
} from "./types";

interface QueueFiltersProps {
  stations: StationFilter[];
  machines: MachineFilter[];
  operations: OperationFilter[];
  filters: QueueFiltersState;
  onChange: (filters: QueueFiltersState) => void;
}

function QueueFilters({
  stations,
  machines,
  operations,
  filters,
  onChange,
}: QueueFiltersProps) {
  const { t } = useI18n();
  const update = (patch: Partial<QueueFiltersState>) =>
    onChange({ ...filters, ...patch });

  const clearFilters = () =>
    onChange({
      stationId: "",
      machineId: "",
      operation: "",
      priority: "",
      status: "",
      search: "",
    });

  const hasAnyFilter = Object.values(filters).some((v) => v !== "");

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-text-muted">
          {t("queue.filters")}
        </h3>
        {hasAnyFilter && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover transition-colors"
          >
            <X className="h-3 w-3" />
            {t("queue.clear")}
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          placeholder={t("queue.searchOrders")}
          value={filters.search}
          onChange={(e) => update({ search: e.target.value })}
          className="w-full rounded-lg border border-glass-border bg-glass-surface py-2 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {/* Station */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-text-secondary">
          {t("queue.station")}
        </label>
        <select
          value={filters.stationId}
          onChange={(e) => update({ stationId: e.target.value })}
          className="w-full rounded-lg border border-glass-border bg-glass-surface px-2.5 py-2 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t("queue.allStations")}</option>
          {stations.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Machine */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-text-secondary">
          {t("queue.machine")}
        </label>
        <select
          value={filters.machineId}
          onChange={(e) => update({ machineId: e.target.value })}
          className="w-full rounded-lg border border-glass-border bg-glass-surface px-2.5 py-2 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t("queue.allMachines")}</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Operation */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-text-secondary">
          {t("queue.operation")}
        </label>
        <select
          value={filters.operation}
          onChange={(e) => update({ operation: e.target.value })}
          className="w-full rounded-lg border border-glass-border bg-glass-surface px-2.5 py-2 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t("queue.allOperations")}</option>
          {operations.map((o) => (
            <option key={o.operationCode} value={o.operationCode}>
              {o.operationName}
            </option>
          ))}
        </select>
      </div>

      {/* Priority */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-text-secondary">
          {t("queue.priority")}
        </label>
        <select
          value={filters.priority}
          onChange={(e) => update({ priority: e.target.value })}
          className="w-full rounded-lg border border-glass-border bg-glass-surface px-2.5 py-2 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t("queue.allPriorities")}</option>
          <option value="1">{t("queue.critical")}</option>
          <option value="50">{t("queue.high")}</option>
          <option value="100">{t("queue.normal")}</option>
          <option value="200">{t("queue.low")}</option>
        </select>
      </div>

      {/* Status */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-text-secondary">
          {t("queue.status")}
        </label>
        <select
          value={filters.status}
          onChange={(e) => update({ status: e.target.value })}
          className="w-full rounded-lg border border-glass-border bg-glass-surface px-2.5 py-2 text-xs text-text-primary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t("queue.allStatus")}</option>
          <option value="waiting">{t("queue.statusWaiting")}</option>
          <option value="in_progress">{t("queue.statusRunning")}</option>
          <option value="paused">{t("queue.statusPaused")}</option>
          <option value="blocked">{t("queue.statusBlocked")}</option>
          <option value="rework">{t("queue.statusRework")}</option>
        </select>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Count badge */}
      <div className="rounded-lg border border-glass-border bg-glass-surface px-3 py-2 text-center">
        <span className="text-xs text-text-muted">
          {hasAnyFilter ? t("queue.filtered") : t("queue.noFiltersActive")}
        </span>
      </div>
    </div>
  );
}

export { QueueFilters };
