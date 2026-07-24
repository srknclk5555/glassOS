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
  Card,
  CardContent,
  LoadingState,
} from "@repo/ui";
import {
  getInventoryItemByIdAction,
  getInventoryItemLotsAction,
} from "@/app/actions/inventory";
import {
  Package,
  WifiOff,
  Layers,
  Wallet,
  Calendar,
  Hash,
  User,
  Building2,
  MapPin,
  FileText,
} from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */

interface InventoryItemDetail {
  id: string;
  inventoryCode: string;
  name: string;
  inventoryType: string;
  unit: string;
  materialId: string | null;
  productId: string | null;
  locationId: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  materialName: string | null;
  materialCode: string | null;
  locationName: string | null;
  locationCode: string | null;
}

interface InventoryLot {
  id: string;
  lotNumber: string | null;
  supplierLot: string | null;
  quantity: string;
  remainingQuantity: string;
  unitCost: string;
  currency: string;
  receivedAt: string;
  expirationDate: string | null;
  status: string;
  barcode: string | null;
}

/* ── Helpers ────────────────────────────────────────────────────── */

function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(typeof value === "string" ? Number(value) : value);
}

function formatQty(value: string | number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(typeof value === "string" ? Number(value) : value);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function InventoryTypeBadge({ type }: { type: string }) {
  const { t } = useI18n();
  const labels: Record<string, string> = {
    raw_material: t("inventory.typeRawMaterial"),
    semi_finished: t("inventory.typeSemiFinished"),
    finished_product: t("inventory.typeFinishedProduct"),
    traded_goods: t("inventory.typeTradedGoods"),
    consumable: t("inventory.typeConsumable"),
    spare_part: t("inventory.typeSparePart"),
    packaging: t("inventory.typePackaging"),
    service: t("inventory.typeService"),
    scrap: t("inventory.typeScrap"),
    remnant: t("inventory.typeRemnant"),
    by_product: t("inventory.typeByProduct"),
  };
  const colors: Record<string, string> = {
    raw_material: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    semi_finished: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    finished_product: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    traded_goods: "bg-teal-500/10 text-teal-500 border-teal-500/20",
    consumable: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    spare_part: "bg-pink-500/10 text-pink-500 border-pink-500/20",
    packaging: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    service: "bg-sky-500/10 text-sky-500 border-sky-500/20",
    scrap: "bg-red-500/10 text-red-500 border-red-500/20",
    remnant: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    by_product: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  };
  return (
    <Badge variant="outline" className={colors[type] ?? ""}>
      {labels[type] ?? type}
    </Badge>
  );
}

function LotStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: t("inventory.lotStatusActive"),
      className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    },
    consumed: {
      label: t("inventory.lotStatusConsumed"),
      className: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    },
    expired: {
      label: t("inventory.lotStatusExpired"),
      className: "bg-red-500/10 text-red-500 border-red-500/20",
    },
    quarantine: {
      label: t("inventory.lotStatusQuarantine"),
      className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    },
  };
  const c = config[status] ?? config.active!;
  return (
    <Badge variant="outline" className={c.className}>
      {c.label}
    </Badge>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-glass-surface">
        <Icon className="h-4 w-4 text-text-muted" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-text-muted">{label}</p>
        <p className="text-sm font-medium text-text-primary truncate">
          {value ?? "—"}
        </p>
      </div>
    </div>
  );
}

/* ── Detail Drawer ────────────────────────────────────────────── */

interface Props {
  itemId: string | null;
  onClose: () => void;
}

export function InventoryDetailDrawer({ itemId, onClose }: Props) {
  const { t } = useI18n();
  const [item, setItem] = useState<InventoryItemDetail | null>(null);
  const [lots, setLots] = useState<InventoryLot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!itemId) return;
    setLoading(true);
    setError(null);
    try {
      const [detail, lotData] = await Promise.all([
        getInventoryItemByIdAction(itemId),
        getInventoryItemLotsAction(itemId),
      ]);
      if (!detail) {
        setError(t("common.error"));
        return;
      }
      setItem(detail as InventoryItemDetail);
      setLots(lotData as InventoryLot[]);
    } catch (err: any) {
      setError(err.message ?? t("common.error"));
    } finally {
      setLoading(false);
    }
  }, [itemId, t]);

  useEffect(() => {
    if (itemId) fetchDetail();
  }, [itemId, fetchDetail]);

  /* ── Compute totals ── */
  const totalQty = lots.reduce(
    (sum, lot) => sum + Number(lot.remainingQuantity),
    0,
  );
  const totalValue = lots.reduce(
    (sum, lot) => sum + Number(lot.remainingQuantity) * Number(lot.unitCost),
    0,
  );

  return (
    <Sheet open={!!itemId} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent className="sm:max-w-2xl">
        {loading && !item && (
          <div className="flex min-h-[60vh] items-center justify-center">
            <LoadingState title={t("common.loading")} />
          </div>
        )}

        {error && !item && (
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
            </div>
          </div>
        )}

        {item && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <SheetTitle>{item.name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-xs">{item.inventoryCode}</span>
                    <InventoryTypeBadge type={item.inventoryType} />
                  </SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* ── Genel Bilgiler ── */}
              <Card>
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-text-primary mb-3">
                    {t("inventory.generalInfo")}
                  </h3>
                  <div className="divide-y divide-glass-border">
                    <InfoRow
                      icon={Package}
                      label={t("inventory.inventoryCode")}
                      value={item.inventoryCode}
                    />
                    <InfoRow
                      icon={Building2}
                      label={t("inventory.inventoryType")}
                      value={t(`inventory.type${item.inventoryType.replace(/_./g, (c) => c[1]!.toUpperCase())}` as any)}
                    />
                    <InfoRow
                      icon={Hash}
                      label={t("inventory.unit")}
                      value={item.unit}
                    />
                    {item.materialName && (
                      <InfoRow
                        icon={Package}
                        label={t("inventory.material")}
                        value={
                          item.materialCode
                            ? `${item.materialCode} · ${item.materialName}`
                            : item.materialName
                        }
                      />
                    )}
                    {item.locationName && (
                      <InfoRow
                        icon={MapPin}
                        label={t("inventory.location")}
                        value={
                          item.locationCode
                            ? `${item.locationCode} · ${item.locationName}`
                            : item.locationName
                        }
                      />
                    )}
                    {item.notes && (
                      <InfoRow
                        icon={FileText}
                        label={t("inventory.notes")}
                        value={item.notes}
                      />
                    )}
                    <InfoRow
                      icon={Calendar}
                      label={t("inventory.createdAt")}
                      value={formatDate(item.createdAt)}
                    />
                    <InfoRow
                      icon={Calendar}
                      label={t("inventory.updatedAt")}
                      value={formatDate(item.updatedAt)}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── Stok Özeti ── */}
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-emerald-500" />
                      <p className="text-xs text-text-muted">
                        {t("inventory.totalQuantity")}
                      </p>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums text-text-primary">
                      {formatQty(totalQty)} {item.unit}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-blue-500" />
                      <p className="text-xs text-text-muted">
                        {t("inventory.totalValue")}
                      </p>
                    </div>
                    <p className="mt-2 text-xl font-semibold tabular-nums text-text-primary">
                      {formatCurrency(totalValue)} ₺
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* ── Aktif Lotlar ── */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers className="h-4 w-4 text-text-muted" />
                    <h3 className="text-sm font-semibold text-text-primary">
                      {t("inventory.activeLots")}
                    </h3>
                    <span className="text-xs text-text-muted">
                      ({lots.length} {t("inventory.lotCount")})
                    </span>
                  </div>

                  {lots.length === 0 ? (
                    <p className="text-sm text-text-muted py-4 text-center">
                      {t("inventory.noLots")}
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-glass-border">
                            <th className="text-left pb-2 text-xs font-medium text-text-muted">
                              {t("inventory.lotNumber")}
                            </th>
                            <th className="text-right pb-2 text-xs font-medium text-text-muted">
                              {t("inventory.remainingQty")}
                            </th>
                            <th className="text-right pb-2 text-xs font-medium text-text-muted">
                              {t("inventory.unitCost")}
                            </th>
                            <th className="text-right pb-2 text-xs font-medium text-text-muted">
                              {t("inventory.totalValue")}
                            </th>
                            <th className="text-left pb-2 text-xs font-medium text-text-muted">
                              {t("inventory.receivedAt")}
                            </th>
                            <th className="text-left pb-2 text-xs font-medium text-text-muted">
                              {t("inventory.status")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {lots.map((lot) => (
                            <tr
                              key={lot.id}
                              className="border-b border-glass-border/50"
                            >
                              <td className="py-2 pr-3">
                                <span className="font-mono text-xs font-medium text-text-primary">
                                  {lot.lotNumber ?? "—"}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums text-text-primary">
                                {formatQty(lot.remainingQuantity)}
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums text-text-primary">
                                {formatCurrency(lot.unitCost)} ₺
                              </td>
                              <td className="py-2 px-3 text-right tabular-nums text-text-primary font-medium">
                                {formatCurrency(
                                  Number(lot.remainingQuantity) * Number(lot.unitCost),
                                )}{" "}
                                ₺
                              </td>
                              <td className="py-2 px-3 text-xs text-text-muted">
                                {formatDate(lot.receivedAt)}
                              </td>
                              <td className="py-2 pl-3">
                                <LotStatusBadge status={lot.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
