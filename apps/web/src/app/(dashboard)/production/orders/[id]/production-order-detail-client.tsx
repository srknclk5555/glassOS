"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@repo/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Badge,
  Skeleton,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@repo/ui";
import {
  ArrowLeft,
  ArrowUpRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Trash2,
  Pencil,
  Calculator,
  Layers,
  Ruler,
  Package,
  Flame,
  SquareStack,
} from "lucide-react";
import {
  getProductionOrderAction,
  updateProductionOrderStatusAction,
  deleteProductionOrderAction,
} from "@/app/actions/production-orders";

/* ── Types ────────────────────────────────────────────────────────────── */

interface ItemSnapshot {
  id: string;
  recipeId: string;
  recipeCode: string | null;
  recipeName: string | null;
  netWidthMm: number;
  netHeightMm: number;
  quantity: number;
  engineSnapshot: any;
  sequence: number;
}

interface OrderDetail {
  id: string;
  orderNo: string;
  customerName: string | null;
  productionDate: string | null;
  dueDate: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  createdBy: string | null;
  items: ItemSnapshot[];
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function formatDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatArea(m2: number): string {
  return `${m2.toFixed(3)} m²`;
}

/* ── Status Badge ─────────────────────────────────────────────────────── */

function DetailStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const statusMap: Record<string, { variant: "secondary" | "info" | "success" | "danger"; icon: React.ReactNode; label: string }> = {
    draft: { variant: "secondary", icon: <Clock className="h-3.5 w-3.5" />, label: t("productionOrders.statusDraft") },
    ready: { variant: "info", icon: <AlertCircle className="h-3.5 w-3.5" />, label: t("productionOrders.statusReady") },
    released: { variant: "success", icon: <CheckCircle2 className="h-3.5 w-3.5" />, label: t("productionOrders.statusReleased") },
    cancelled: { variant: "danger", icon: <XCircle className="h-3.5 w-3.5" />, label: t("productionOrders.statusCancelled") },
  };
  const config = statusMap[status] ?? statusMap.draft!;
  return (
    <Badge variant={config.variant} className="gap-1.5 px-3 py-1 text-sm">
      {config.icon}
      {config.label}
    </Badge>
  );
}

/* ── Engine Summary Helpers ───────────────────────────────────────────── */

function aggregateFromSnapshots(items: ItemSnapshot[]) {
  let totalProdM2 = 0;
  let totalGlassM2 = 0;
  let totalFirePct = 0;
  let totalPieces = 0;

  for (const item of items) {
    const snap = item.engineSnapshot;
    if (!snap) continue;
    const qty = item.quantity;
    totalProdM2 += (snap.totals?.productionAreaM2 ?? 0) * qty;
    totalGlassM2 += (snap.totals?.totalGlassConsumptionM2 ?? 0) * qty;
    totalFirePct += (snap.totalFireRate ?? 0) * qty;
    const produced = snap.producedProducts as Array<{ quantity: number }> | undefined;
    if (produced) {
      totalPieces += produced.reduce((s: number, p: { quantity: number }) => s + p.quantity, 0) * qty;
    }
  }

  return { totalProdM2, totalGlassM2, totalFirePct, totalPieces };
}

/* ═══════════════════════════════════════════════════════════════════════════
   Production Order Detail Page
   ═══════════════════════════════════════════════════════════════════════════ */

export function ProductionOrderDetailClient({ id }: { id: string }) {
  const { t } = useI18n();
  const router = useRouter();

  /* ── Data State ── */
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* ── Dialog State ── */
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  /* ── Fetch ── */
  const fetchOrder = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProductionOrderAction(id);
      setOrder(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load production order");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  /* ── Actions ── */
  const handleRelease = useCallback(async () => {
    setActionLoading("release");
    try {
      await updateProductionOrderStatusAction(id, "released");
      setShowReleaseDialog(false);
      await fetchOrder();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to release order");
    } finally {
      setActionLoading(null);
    }
  }, [id, fetchOrder]);

  const handleDelete = useCallback(async () => {
    setActionLoading("delete");
    try {
      await deleteProductionOrderAction(id);
      setShowDeleteDialog(false);
      router.push("/production/orders");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to delete order");
      setActionLoading(null);
    }
  }, [id, router]);

  /* ── Aggregated Totals ── */
  const totals = useMemo(() => {
    if (!order) return null;
    return aggregateFromSnapshots(order.items);
  }, [order]);

  /* ── Loading State ── */
  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-md" />
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  /* ── Error State ── */
  if (error || !order) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/production/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-text-primary">Production Order</h1>
        </div>
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-6 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
            <p className="text-sm font-medium text-red-700">{error ?? "Production order not found"}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchOrder}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = order.status;

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/production/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary">{order.orderNo}</h1>
              <DetailStatusBadge status={status} />
            </div>
            <p className="mt-1 text-sm text-text-muted">
              {order.createdBy ?? "—"} &middot; {formatDateTime(order.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {status === "draft" && (
            <>
              <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} disabled={actionLoading === "delete"}>
                <Trash2 className="mr-1.5 h-4 w-4" />
                {t("productionOrders.delete")}
              </Button>
              <Button variant="outline" size="sm" disabled>
                <Pencil className="mr-1.5 h-4 w-4" />
                {t("productionOrders.edit")}
              </Button>
              <Button size="sm" onClick={() => setShowReleaseDialog(true)} disabled={actionLoading === "release"}>
                <ArrowUpRight className="mr-1.5 h-4 w-4" />
                {t("productionOrders.release")}
              </Button>
            </>
          )}
          {status === "ready" && (
            <Button size="sm" onClick={() => setShowReleaseDialog(true)} disabled={actionLoading === "release"}>
              <ArrowUpRight className="mr-1.5 h-4 w-4" />
              {t("productionOrders.release")}
            </Button>
          )}
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm font-medium">{error}</p>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>Dismiss</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("productionOrders.generalInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6 lg:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-text-muted">{t("productionOrders.orderNo")}</p>
              <p className="mt-0.5 text-sm font-semibold text-text-primary">{order.orderNo}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted">{t("productionOrders.customer")}</p>
              <p className="mt-0.5 text-sm text-text-primary">{order.customerName ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted">{t("productionOrders.status")}</p>
              <div className="mt-0.5"><DetailStatusBadge status={status} /></div>
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted">{t("productionOrders.productionDate")}</p>
              <p className="mt-0.5 text-sm text-text-primary">{formatDate(order.productionDate)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted">{t("productionOrders.dueDate")}</p>
              <p className="mt-0.5 text-sm text-text-primary">{formatDate(order.dueDate)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-text-muted">{t("productionOrders.createdAt")}</p>
              <p className="mt-0.5 text-sm text-text-primary">{formatDateTime(order.createdAt)}</p>
            </div>
          </div>
          {order.notes && (
            <div className="mt-4 border-t pt-4">
              <p className="text-xs font-medium text-text-muted">{t("productionOrders.notes")}</p>
              <p className="mt-0.5 text-sm text-text-primary">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Production Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-text-muted" />
            <div>
              <CardTitle className="text-base">{t("productionOrders.items")}</CardTitle>
              <CardDescription>{order.items.length} item(s)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-3 px-6 py-3 text-xs font-medium text-text-muted bg-glass-surface">
              <div className="col-span-1">#</div>
              <div className="col-span-2">{t("productionOrders.product")}</div>
              <div className="col-span-2">{t("productionOrders.recipe")}</div>
              <div className="col-span-1">{t("productionOrders.netSizeLabel")}</div>
              <div className="col-span-1">{t("productionOrders.productionSizeLabel")}</div>
              <div className="col-span-1">{t("productionOrders.quantity")}</div>
              <div className="col-span-2">{t("productionOrders.materialConsumption")}</div>
              <div className="col-span-1">{t("productionOrders.totalFire")}</div>
              <div className="col-span-1">{t("productionOrders.pieces")}</div>
            </div>

            {/* Table Rows */}
            {order.items.map((item) => {
              const snap = item.engineSnapshot;
              const dim = snap?.dimensions;
              const netW = Number(item.netWidthMm);
              const netH = Number(item.netHeightMm);
              const prodW = dim?.production?.widthMm;
              const prodH = dim?.production?.heightMm;
              const prodArea = dim?.production?.areaM2;
              const glassConsumption = snap?.totals?.totalGlassConsumptionM2;
              const fireRate = snap?.totalFireRate;
              const pieces = snap?.producedProducts
                ? (snap.producedProducts as Array<{ quantity: number }>).reduce((s: number, p: { quantity: number }) => s + p.quantity, 0)
                : 0;

              return (
                <div key={item.id} className="grid grid-cols-12 gap-3 px-6 py-4 text-sm text-text-primary items-center">
                  <div className="col-span-1 text-text-muted">{item.sequence}</div>
                  <div className="col-span-2 font-medium truncate">{item.recipeName ?? "—"}</div>
                  <div className="col-span-2 text-text-muted truncate">{item.recipeCode ?? "—"}</div>
                  <div className="col-span-1">{netW}×{netH}</div>
                  <div className="col-span-1">
                    {prodW && prodH ? `${prodW}×${prodH}` : "—"}
                  </div>
                  <div className="col-span-1">{item.quantity}</div>
                  <div className="col-span-2">
                    {glassConsumption ? formatArea(glassConsumption * item.quantity) : "—"}
                  </div>
                  <div className="col-span-1">{fireRate != null ? `${(fireRate * 100).toFixed(1)}%` : "—"}</div>
                  <div className="col-span-1">{pieces > 0 ? pieces * item.quantity : "—"}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Production Summary */}
      {totals && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-text-muted" />
              <div>
                <CardTitle className="text-base">{t("productionOrders.productionSummary")}</CardTitle>
                <CardDescription>{t("productionOrders.productionPreviewDesc")}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <div className="rounded-lg border bg-blue-50/50 p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Ruler className="h-4 w-4" />
                  <p className="text-xs font-medium">{t("productionOrders.totalArea")}</p>
                </div>
                <p className="text-xl font-semibold text-blue-800">{formatArea(totals.totalProdM2)}</p>
              </div>
              <div className="rounded-lg border bg-amber-50/50 p-4">
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  <Package className="h-4 w-4" />
                  <p className="text-xs font-medium">{t("productionOrders.materialConsumption")}</p>
                </div>
                <p className="text-xl font-semibold text-amber-800">{formatArea(totals.totalGlassM2)}</p>
              </div>
              <div className="rounded-lg border bg-red-50/50 p-4">
                <div className="flex items-center gap-2 text-red-600 mb-1">
                  <Flame className="h-4 w-4" />
                  <p className="text-xs font-medium">{t("productionOrders.totalFire")}</p>
                </div>
                <p className="text-xl font-semibold text-red-800">
                  {totals.totalPieces > 0 ? `${(totals.totalFirePct / totals.totalPieces).toFixed(1)}%` : "—"}
                </p>
              </div>
              <div className="rounded-lg border bg-green-50/50 p-4">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <SquareStack className="h-4 w-4" />
                  <p className="text-xs font-medium">{t("productionOrders.totalProduction")}</p>
                </div>
                <p className="text-xl font-semibold text-green-800">{totals.totalPieces} pcs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Release Dialog */}
      <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("productionOrders.release")}</DialogTitle>
            <DialogDescription>
              {t("productionOrders.confirmRelease")}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-amber-50 p-3 text-sm text-amber-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {t("productionOrders.productionPreviewDesc")}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReleaseDialog(false)} disabled={actionLoading === "release"}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleRelease} disabled={actionLoading === "release"}>
              {actionLoading === "release" ? "Releasing..." : t("productionOrders.release")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("productionOrders.delete")}</DialogTitle>
            <DialogDescription>
              {t("productionOrders.confirmDelete")}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border bg-red-50 p-3 text-sm text-red-800">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>This action cannot be undone.</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={actionLoading === "delete"}>
              {t("common.cancel")}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={actionLoading === "delete"}>
              {actionLoading === "delete" ? "Deleting..." : t("productionOrders.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
