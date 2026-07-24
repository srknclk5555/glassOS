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
import { getMaterialByIdAction } from "@/app/actions/materials";
import { X } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */

interface MaterialDetail {
  id: string;
  materialCode: string;
  name: string;
  shortName: string | null;
  description: string | null;
  materialType: string;
  materialGroupId: string | null;
  brand: string | null;
  model: string | null;
  defaultWarehouseId: string | null;
  defaultLocationId: string | null;
  defaultSupplierId: string | null;
  baseUnit: string;
  stockTracking: boolean;
  inventoryItem: boolean;
  purchasable: boolean;
  sellable: boolean;
  manufacturable: boolean;
  qualityInspectionRequired: boolean;
  batchTracking: boolean;
  serialTracking: boolean;
  expirationTracking: boolean;
  minStock: string | null;
  maxStock: string | null;
  criticalStock: string | null;
  safetyStock: string | null;
  reorderPoint: string | null;
  reorderQuantity: string | null;
  standardCost: string | null;
  averageCost: string | null;
  lastPurchasePrice: string | null;
  currency: string | null;
  barcode: string | null;
  qrCode: string | null;
  rfidCode: string | null;
  imageUrl: string | null;
  technicalDrawingUrl: string | null;
  documentUrl: string | null;
  customCode1: string | null;
  customCode2: string | null;
  customCode3: string | null;
  customCode4: string | null;
  customCode5: string | null;
  status: string;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface MaterialDetailDrawerProps {
  materialId: string | null;
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

function MaterialTypeBadge({ type }: { type: string }) {
  const { t } = useI18n();
  const labels: Record<string, string> = {
    raw_material: t("materials.typeRawMaterial"),
    semi_finished: t("materials.typeSemiFinished"),
    finished_good: t("materials.typeFinishedGood"),
    consumable: t("materials.typeConsumable"),
    spare_part: t("materials.typeSparePart"),
    packaging: t("materials.typePackaging"),
    chemical: t("materials.typeChemical"),
    service: t("materials.typeService"),
    other: t("materials.typeOther"),
  };
  const colors: Record<string, string> = {
    raw_material: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    semi_finished: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    finished_good: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    consumable: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    spare_part: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    packaging: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    chemical: "bg-red-500/10 text-red-500 border-red-500/20",
    service: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    other: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  };
  return (
    <Badge variant="outline" className={colors[type] ?? ""}>
      {labels[type] ?? type}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: t("materials.statusActive"),
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    passive: {
      label: t("materials.statusPassive"),
      className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    },
    blocked: {
      label: t("materials.statusBlocked"),
      className: "bg-red-500/10 text-red-500 border-red-500/20",
    },
  };
  const c = (config[status] ?? config.passive)!;
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  );
}

function BooleanBadge({ value }: { value: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        value
          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
          : "bg-slate-500/10 text-slate-500 border-slate-500/20"
      }
    >
      {value ? "✓" : "✗"}
    </Badge>
  );
}

/* ── Component ─────────────────────────────────────────────────── */

export function MaterialDetailDrawer({ materialId, onClose }: MaterialDetailDrawerProps) {
  const { t } = useI18n();
  const [material, setMaterial] = useState<MaterialDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!materialId) return;
    setLoading(true);
    try {
      const result = await getMaterialByIdAction(materialId);
      setMaterial(result as MaterialDetail);
    } catch {
      setMaterial(null);
    } finally {
      setLoading(false);
    }
  }, [materialId]);

  useEffect(() => {
    if (materialId) {
      fetchDetail();
    } else {
      setMaterial(null);
    }
  }, [materialId, fetchDetail]);

  return (
    <Sheet open={!!materialId} onOpenChange={() => onClose()}>
      <SheetContent className="w-full max-w-lg overflow-y-auto">
        <SheetHeader className="border-b border-glass-border pb-4 mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle>{t("materials.details")}</SheetTitle>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <SheetDescription>
            {material && (
              <span className="font-mono text-xs text-text-muted">
                {material.materialCode}
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
        ) : material ? (
          <div className="space-y-6">
            {/* Status Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={material.status} />
              <MaterialTypeBadge type={material.materialType} />
              <Badge variant="outline" className="bg-glass-surface/50">
                {material.baseUnit}
              </Badge>
            </div>

            {/* General Information */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                {t("materials.generalInfo")}
              </h4>
              <div className="rounded-lg border border-glass-border bg-glass-surface/50 p-4">
                <DetailRow label={t("materials.materialCode")} value={material.materialCode} />
                <DetailRow label={t("materials.materialName")} value={material.name} />
                <DetailRow label={t("materials.shortName")} value={material.shortName} />
                <DetailRow label={t("materials.descriptionLabel")} value={material.description} />
                <DetailRow label={t("materials.baseUnit")} value={material.baseUnit} />
                <DetailRow label={t("materials.notes")} value={material.notes} />
                <DetailRow label={t("materials.createdAt")} value={new Date(material.createdAt).toLocaleString()} />
                <DetailRow label={t("materials.updatedAt")} value={new Date(material.updatedAt).toLocaleString()} />
              </div>
            </div>

            {/* Classification */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                {t("materials.classification")}
              </h4>
              <div className="rounded-lg border border-glass-border bg-glass-surface/50 p-4">
                <DetailRow
                  label={t("materials.materialType")}
                  value={<MaterialTypeBadge type={material.materialType} />}
                />
                <DetailRow label={t("materials.materialGroup")} value={material.materialGroupId} />
                <DetailRow label={t("materials.brand")} value={material.brand} />
                <DetailRow label={t("materials.model")} value={material.model} />
              </div>
            </div>

            {/* Stock Settings */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                {t("materials.stockSettings")}
              </h4>
              <div className="rounded-lg border border-glass-border bg-glass-surface/50 p-4">
                <DetailRow label={t("materials.stockTracking")} value={<BooleanBadge value={material.stockTracking} />} />
                <DetailRow label={t("materials.inventoryItem")} value={<BooleanBadge value={material.inventoryItem} />} />
                <DetailRow label={t("materials.purchasable")} value={<BooleanBadge value={material.purchasable} />} />
                <DetailRow label={t("materials.sellable")} value={<BooleanBadge value={material.sellable} />} />
                <DetailRow label={t("materials.manufacturable")} value={<BooleanBadge value={material.manufacturable} />} />
                <DetailRow label={t("materials.qualityInspection")} value={<BooleanBadge value={material.qualityInspectionRequired} />} />
                <DetailRow label={t("materials.batchTracking")} value={<BooleanBadge value={material.batchTracking} />} />
                <DetailRow label={t("materials.serialTracking")} value={<BooleanBadge value={material.serialTracking} />} />
                <DetailRow label={t("materials.expirationTracking")} value={<BooleanBadge value={material.expirationTracking} />} />
              </div>
            </div>

            {/* Stock Limits */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                {t("materials.stockLimits")}
              </h4>
              <div className="rounded-lg border border-glass-border bg-glass-surface/50 p-4">
                <DetailRow label={t("materials.minStock")} value={material.minStock} />
                <DetailRow label={t("materials.maxStock")} value={material.maxStock} />
                <DetailRow label={t("materials.criticalStock")} value={material.criticalStock} />
                <DetailRow label={t("materials.safetyStock")} value={material.safetyStock} />
                <DetailRow label={t("materials.reorderPoint")} value={material.reorderPoint} />
                <DetailRow label={t("materials.reorderQuantity")} value={material.reorderQuantity} />
              </div>
            </div>

            {/* Costing */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                {t("materials.costing")}
              </h4>
              <div className="rounded-lg border border-glass-border bg-glass-surface/50 p-4">
                <DetailRow label={t("materials.standardCost")} value={material.standardCost} />
                <DetailRow label={t("materials.averageCost")} value={material.averageCost} />
                <DetailRow label={t("materials.lastPurchasePrice")} value={material.lastPurchasePrice} />
                <DetailRow label={t("materials.currency")} value={material.currency} />
              </div>
            </div>

            {/* Identification */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                {t("materials.identification")}
              </h4>
              <div className="rounded-lg border border-glass-border bg-glass-surface/50 p-4">
                <DetailRow label={t("materials.barcode")} value={material.barcode} />
                <DetailRow label={t("materials.qrCode")} value={material.qrCode} />
                <DetailRow label={t("materials.rfidCode")} value={material.rfidCode} />
              </div>
            </div>

            {/* Default References */}
            <div>
              <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                {t("materials.defaults")}
              </h4>
              <div className="rounded-lg border border-glass-border bg-glass-surface/50 p-4">
                <DetailRow label={t("materials.defaultWarehouse")} value={material.defaultWarehouseId} />
                <DetailRow label={t("materials.defaultLocation")} value={material.defaultLocationId} />
                <DetailRow label={t("materials.defaultSupplier")} value={material.defaultSupplierId} />
              </div>
            </div>

            {/* Custom Codes */}
            {[1, 2, 3, 4, 5].some((i) => (material as any)[`customCode${i}`]) && (
              <div>
                <h4 className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">
                  {t("materials.customCodes")}
                </h4>
                <div className="rounded-lg border border-glass-border bg-glass-surface/50 p-4">
                  {[1, 2, 3, 4, 5].map((i) => {
                    const val = (material as any)[`customCode${i}`];
                    return val ? (
                      <DetailRow key={i} label={t(`materials.customCode${i}`)} value={val} />
                    ) : null;
                  })}
                </div>
              </div>
            )}
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
