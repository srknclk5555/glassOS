"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@repo/ui";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  Badge,
  Button,
  Skeleton,
} from "@repo/ui";
import { getWarehouseByIdAction } from "@/app/actions/warehouses";
import { X } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */

interface WarehouseDetail {
  id: string;
  warehouseCode: string;
  name: string;
  warehouseType: string;
  description: string | null;
  managerId: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  factoryId: string | null;
}

interface WarehouseDetailDrawerProps {
  warehouseId: string | null;
  onClose: () => void;
}

/* ── Helpers ───────────────────────────────────────────────────── */

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-glass-border last:border-0">
      <span className="text-xs font-medium text-text-muted shrink-0 w-36">{label}</span>
      <span className="text-sm text-text-primary text-right">{value ?? "—"}</span>
    </div>
  );
}

function WarehouseTypeBadge({ type }: { type: string }) {
  const { t } = useI18n();
  const labels: Record<string, string> = {
    raw_material: t("warehouses.typeRawMaterial"),
    semi_finished: t("warehouses.typeSemiFinished"),
    finished_goods: t("warehouses.typeFinishedGoods"),
    consumables: t("warehouses.typeConsumables"),
    quality: t("warehouses.typeQuality"),
    scrap: t("warehouses.typeScrap"),
    shipping: t("warehouses.typeShipping"),
    spare_parts: t("warehouses.typeSpareParts"),
  };
  const colors: Record<string, string> = {
    raw_material: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    semi_finished: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    finished_goods: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    consumables: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    quality: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    scrap: "bg-red-500/10 text-red-500 border-red-500/20",
    shipping: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    spare_parts: "bg-pink-500/10 text-pink-500 border-pink-500/20",
  };
  return (
    <Badge variant="outline" className={colors[type] ?? ""}>
      {labels[type] ?? type}
    </Badge>
  );
}

/* ── Component ─────────────────────────────────────────────────── */

export function WarehouseDetailDrawer({ warehouseId, onClose }: WarehouseDetailDrawerProps) {
  const { t } = useI18n();
  const [warehouse, setWarehouse] = useState<WarehouseDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    try {
      const result = await getWarehouseByIdAction(warehouseId);
      setWarehouse(result as WarehouseDetail);
    } catch {
      setWarehouse(null);
    } finally {
      setLoading(false);
    }
  }, [warehouseId]);

  useEffect(() => {
    if (warehouseId) {
      fetchDetail();
    } else {
      setWarehouse(null);
    }
  }, [warehouseId, fetchDetail]);

  return (
    <Sheet open={!!warehouseId} onOpenChange={() => onClose()}>
      <SheetContent className="w-full max-w-lg overflow-y-auto">
        <SheetHeader className="border-b border-glass-border pb-4 mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>{t("warehouses.details")}</SheetTitle>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SheetDescription>
            {warehouse && (
              <span className="font-mono text-xs text-text-muted">
                {warehouse.warehouseCode}
              </span>
            )}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : warehouse ? (
          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={
                  warehouse.isActive
                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                    : "bg-slate-500/10 text-slate-500 border-slate-500/20"
                }
              >
                {warehouse.isActive ? t("warehouses.statusActive") : t("warehouses.statusInactive")}
              </Badge>
              <WarehouseTypeBadge type={warehouse.warehouseType} />
            </div>

            {/* General Information */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                {t("warehouses.generalInfo")}
              </h4>
              <div className="rounded-lg border border-glass-border bg-glass-surface/50 p-4">
                <DetailRow label={t("warehouses.warehouseCode")} value={warehouse.warehouseCode} />
                <DetailRow label={t("warehouses.warehouseName")} value={warehouse.name} />
                <DetailRow
                  label={t("warehouses.warehouseType")}
                  value={<WarehouseTypeBadge type={warehouse.warehouseType} />}
                />
                <DetailRow label={t("warehouses.descriptionLabel")} value={warehouse.description} />
                <DetailRow label={t("warehouses.manager")} value={warehouse.managerId ?? "—"} />
                <DetailRow label={t("warehouses.notes")} value={warehouse.notes} />
                <DetailRow label={t("warehouses.createdAt")} value={new Date(warehouse.createdAt).toLocaleString()} />
                <DetailRow label={t("warehouses.updatedAt")} value={new Date(warehouse.updatedAt).toLocaleString()} />
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-text-muted text-center py-8">
            {t("common.noResults")}
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
