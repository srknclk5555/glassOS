"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Badge,
  Skeleton,
  Button,
} from "@repo/ui";
import { useI18n } from "@repo/ui";
import { X, Truck, FileText, ClipboardCheck, Package } from "lucide-react";
import { getGoodsReceiptByIdAction } from "@/app/actions/goods-receipt";
import type { GoodsReceiptStatus } from "@repo/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

const statusBadgeMap: Record<GoodsReceiptStatus, { label: string; variant: "default" | "secondary" | "success" | "danger" | "warning" }> = {
  draft: { label: "statusDraft", variant: "secondary" },
  completed: { label: "statusCompleted", variant: "success" },
  cancelled: { label: "statusCancelled", variant: "danger" },
};

function DetailRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-glass-border">
      <span className="text-xs font-medium text-text-muted w-36 shrink-0">{label}</span>
      <span className="text-sm text-text-primary text-right">{value ?? "—"}</span>
    </div>
  );
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface GoodsReceiptDetailDrawerProps {
  goodsReceiptId: string | null;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GoodsReceiptDetailDrawer({ goodsReceiptId, onClose }: GoodsReceiptDetailDrawerProps) {
  const { t } = useI18n();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const result = await getGoodsReceiptByIdAction(id);
      setData(result);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (goodsReceiptId) {
      fetchDetail(goodsReceiptId);
    } else {
      setData(null);
    }
  }, [goodsReceiptId, fetchDetail]);

  const statusInfo = data ? statusBadgeMap[data.status as GoodsReceiptStatus] ?? statusBadgeMap.draft : null;

  return (
    <Sheet open={!!goodsReceiptId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="w-full max-w-lg overflow-y-auto">
        <SheetHeader className="flex flex-row items-center justify-between">
          <SheetTitle>{t("goodsReceipt.details")}</SheetTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </SheetHeader>

        {loading && (
          <div className="space-y-4 mt-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}

        {!loading && !data && (
          <div className="mt-6 text-center text-sm text-text-muted">
            {t("common.noResults")}
          </div>
        )}

        {!loading && data && (
          <div className="mt-6 space-y-6">
            {/* Status */}
            <div className="flex items-center gap-2">
              {statusInfo && (
                <Badge variant={statusInfo.variant}>{t(`goodsReceipt.${statusInfo.label}`)}</Badge>
              )}
              <Badge variant="outline">{data.receiptNumber}</Badge>
            </div>

            {/* Header Info */}
            <div>
              <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-2">
                <ClipboardCheck className="h-4 w-4 text-icon-primary" />
                {t("goodsReceipt.generalInfo")}
              </h3>
              <DetailRow label={t("goodsReceipt.receiptNumber")} value={data.receiptNumber} />
              <DetailRow label={t("goodsReceipt.receiptDate")} value={`${data.receiptDate} ${data.receiptTime}`} />
              <DetailRow label={t("goodsReceipt.supplier")} value={data.supplierId ?? "—"} />
              <DetailRow label={t("goodsReceipt.purchaseOrder")} value={data.purchaseOrderId ?? "—"} />
              <DetailRow label={t("goodsReceipt.targetWarehouse")} value={data.warehouseId ?? "—"} />
              <DetailRow label={t("goodsReceipt.receivedBy")} value={data.receivedById ?? "—"} />
            </div>

            {/* Vehicle Info */}
            {(data.vehiclePlate || data.driverName) && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-2">
                  <Truck className="h-4 w-4 text-icon-primary" />
                  {t("goodsReceipt.vehicleInfo")}
                </h3>
                {data.vehiclePlate && <DetailRow label={t("goodsReceipt.vehiclePlate")} value={data.vehiclePlate} />}
                {data.trailerPlate && <DetailRow label={t("goodsReceipt.trailerPlate")} value={data.trailerPlate} />}
                {data.driverName && <DetailRow label={t("goodsReceipt.driverName")} value={data.driverName} />}
                {data.driverPhone && <DetailRow label={t("goodsReceipt.driverPhone")} value={data.driverPhone} />}
                {data.carrierCompany && <DetailRow label={t("goodsReceipt.carrierCompany")} value={data.carrierCompany} />}
              </div>
            )}

            {/* Document Info */}
            {(data.despatchNumber || data.invoiceNumber) && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-2">
                  <FileText className="h-4 w-4 text-icon-primary" />
                  {t("goodsReceipt.documentInfo")}
                </h3>
                {data.despatchNumber && <DetailRow label={t("goodsReceipt.documentNo")} value={data.despatchNumber} />}
                {data.despatchDate && <DetailRow label={t("goodsReceipt.despatchDate")} value={data.despatchDate} />}
                {data.invoiceNumber && <DetailRow label={t("goodsReceipt.waybillNo")} value={data.invoiceNumber} />}
                {data.orderReference && <DetailRow label={t("goodsReceipt.orderReference")} value={data.orderReference} />}
              </div>
            )}

            {/* Items Summary */}
            {data.items && data.items.length > 0 && (
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary mb-2">
                  <Package className="h-4 w-4 text-icon-primary" />
                  {t("goodsReceipt.items")} ({data.items.length})
                </h3>
                {data.items.map((item: any, idx: number) => (
                  <div key={item.id} className="py-2 border-b border-glass-border last:border-b-0">
                    <div className="text-sm font-medium text-text-primary">
                      {idx + 1}. {item.materialId}
                    </div>
                    <div className="text-xs text-text-muted mt-1 space-y-0.5">
                      <div>
                        {t("goodsReceipt.plateCount")}: {item.plateCount ?? "—"} adet
                        {" | "}
                        {t("goodsReceipt.totalArea")}: {item.totalAreaM2 ?? item.quantity} {item.unit}
                      </div>
                      <div className="flex items-center gap-2">
                        {item.qualityStatus && (
                          <Badge variant="outline">
                            {t(`goodsReceipt.quality${item.qualityStatus.charAt(0).toUpperCase() + item.qualityStatus.slice(1)}`)}
                          </Badge>
                        )}
                        {(item.damagedCount > 0 || item.missingCount > 0) && (
                          <span className="text-[10px]">
                            {item.damagedCount > 0 && <>🔴 {t("goodsReceipt.damaged")}: {item.damagedCount}</>}
                            {item.damagedCount > 0 && item.missingCount > 0 && " "}
                            {item.missingCount > 0 && <>⚠️ {t("goodsReceipt.missing")}: {item.missingCount}</>}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Notes */}
            {data.notes && (
              <div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">{t("goodsReceipt.notes")}</h3>
                <p className="text-sm text-text-muted">{data.notes}</p>
              </div>
            )}

            {/* Audit */}
            <div className="pt-2 border-t border-glass-border">
              <DetailRow label={t("goodsReceipt.createdAt")} value={data.createdAt ? new Date(data.createdAt).toLocaleString() : "—"} />
              <DetailRow label={t("goodsReceipt.updatedAt")} value={data.updatedAt ? new Date(data.updatedAt).toLocaleString() : "—"} />
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
