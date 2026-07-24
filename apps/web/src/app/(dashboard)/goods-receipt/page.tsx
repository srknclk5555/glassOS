"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
  DataGrid,
  SearchBox,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  LoadingState,
} from "@repo/ui";
import type { Column } from "@repo/ui";
import { useI18n } from "@repo/ui";
import {
  Plus,
  RefreshCw,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  ClipboardCheck,
  WifiOff,
} from "lucide-react";
import {
  getGoodsReceiptsAction,
  getGoodsReceiptStatsAction,
  createGoodsReceiptAction,
  deleteGoodsReceiptAction,
  restoreGoodsReceiptAction,
  completeGoodsReceiptAction,
  cancelGoodsReceiptAction,
} from "@/app/actions/goods-receipt";
import { GoodsReceiptDialog } from "./_components/goods-receipt-dialog";
import { GoodsReceiptDetailDrawer } from "./_components/goods-receipt-detail-drawer";
import type { GoodsReceiptStatus } from "@repo/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GoodsReceiptListItem {
  id: string;
  receiptNumber: string;
  receiptDate: string;
  receiptTime: string;
  status: GoodsReceiptStatus;
  vehiclePlate: string | null;
  driverName: string | null;
  despatchNumber: string | null;
  invoiceNumber: string | null;
  supplierId: string | null;
  warehouseId: string | null;
  receivedById: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GoodsReceiptStats {
  total: number;
  draft: number;
  completed: number;
  today: number;
}

// ─── Badge Helpers ───────────────────────────────────────────────────────────

const statusBadgeMap: Record<GoodsReceiptStatus, { label: string; variant: "default" | "secondary" | "success" | "danger" | "warning" }> = {
  draft: { label: "statusDraft", variant: "secondary" },
  completed: { label: "statusCompleted", variant: "success" },
  cancelled: { label: "statusCancelled", variant: "danger" },
};

function StatusBadge({ status }: { status: GoodsReceiptStatus }) {
  const { t } = useI18n();
  const info = statusBadgeMap[status] ?? statusBadgeMap.draft;
  return <Badge variant={info.variant}>{t(`goodsReceipt.${info.label}`)}</Badge>;
}

function StatsCard({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg bg-glass-bg-alt">{icon}</div>
        <div>
          <p className="text-2xl font-semibold text-text-primary">{value}</p>
          <p className="text-xs text-text-muted">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page Component ──────────────────────────────────────────────────────────

export default function GoodsReceiptPage() {
  const { t } = useI18n();

  // Data state
  const [items, setItems] = useState<GoodsReceiptListItem[]>([]);
  const [stats, setStats] = useState<GoodsReceiptStats>({ total: 0, draft: 0, completed: 0, today: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & pagination
  const [filters, setFilters] = useState<{ search?: string; status?: string }>({});
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Dialogs
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState<{
    id: string;
    type: "delete" | "complete" | "cancel" | "restore";
  } | null>(null);

  // ── Data Fetching ──

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [itemsResult, statsResult] = await Promise.all([
        getGoodsReceiptsAction({ ...filters, page, pageSize }),
        getGoodsReceiptStatsAction(),
      ]);
      setItems(itemsResult.items as GoodsReceiptListItem[]);
      setTotal(itemsResult.total);
      setStats(statsResult);
    } catch (err: any) {
      setError(err.message ?? "Failed to load goods receipts");
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── CRUD Handlers ──

  const handleCreate = async (data: any) => {
    await createGoodsReceiptAction(data);
    setAddDialogOpen(false);
    fetchData();
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { id, type } = confirmAction;
    try {
      switch (type) {
        case "delete":
          await deleteGoodsReceiptAction(id);
          break;
        case "complete":
          await completeGoodsReceiptAction(id);
          break;
        case "cancel":
          await cancelGoodsReceiptAction(id);
          break;
        case "restore":
          await restoreGoodsReceiptAction(id);
          break;
      }
    } catch {
      // ignore
    } finally {
      setConfirmAction(null);
      fetchData();
    }
  };

  // ── Columns ──

  const columns: Column<GoodsReceiptListItem>[] = [
    {
      key: "receiptNumber",
      header: t("goodsReceipt.receiptNumber"),
      sortable: true,
      render: (row: GoodsReceiptListItem) => (
        <span className="font-mono text-xs font-medium text-text-primary">{row.receiptNumber}</span>
      ),
    },
    {
      key: "receiptDate",
      header: t("goodsReceipt.receiptDate"),
      sortable: true,
      render: (row: GoodsReceiptListItem) => (
        <span className="text-sm text-text-primary">{row.receiptDate} {row.receiptTime}</span>
      ),
    },
    {
      key: "vehiclePlate",
      header: t("goodsReceipt.vehiclePlate"),
      sortable: true,
      render: (row: GoodsReceiptListItem) => (
        <span className="text-sm text-text-primary">{row.vehiclePlate ?? "—"}</span>
      ),
    },
    {
      key: "documentNo",
      header: t("goodsReceipt.documentNo"),
      render: (row: GoodsReceiptListItem) => (
        <span className="text-sm text-text-primary">{row.despatchNumber ?? row.invoiceNumber ?? "—"}</span>
      ),
    },
    {
      key: "status",
      header: t("goodsReceipt.status"),
      sortable: true,
      render: (row: GoodsReceiptListItem) => <StatusBadge status={row.status} />,
    },
    {
      key: "actions",
      header: t("goodsReceipt.actions"),
      render: (row: GoodsReceiptListItem) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setDetailId(row.id)} title={t("goodsReceipt.viewDetails")}>
            <Eye className="h-4 w-4" />
          </Button>
          {row.status === "draft" && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmAction({ id: row.id, type: "complete" })}
                title={t("goodsReceipt.completeReceipt")}
              >
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmAction({ id: row.id, type: "cancel" })}
                title={t("goodsReceipt.cancelReceipt")}
              >
                <XCircle className="h-4 w-4 text-red-500" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConfirmAction({ id: row.id, type: "delete" })}
                title={t("common.delete")}
              >
                <Trash2 className="h-4 w-4 text-red-400" />
              </Button>
            </>
          )}
          {row.status === "cancelled" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setConfirmAction({ id: row.id, type: "restore" })}
              title={t("goodsReceipt.restoreReceipt")}
            >
              <RotateCcw className="h-4 w-4 text-blue-400" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  // ── Render ──

  if (loading && items.length === 0) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <WifiOff className="h-12 w-12 text-text-muted mx-auto" />
            <p className="text-lg font-semibold text-text-primary">{t("common.error")}</p>
            <p className="text-sm text-text-muted">{error}</p>
            <Button onClick={fetchData}>
              <RefreshCw className="h-4 w-4 mr-2" /> {t("common.retry")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">{t("goodsReceipt.title")}</h1>
          <p className="text-sm text-text-muted">{t("goodsReceipt.description")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" /> {t("common.refresh")}
          </Button>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> {t("goodsReceipt.addReceipt")}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatsCard
          label={t("goodsReceipt.summaryTotal")}
          value={stats.total}
          icon={<ClipboardCheck className="h-5 w-5 text-icon-primary" />}
        />
        <StatsCard
          label={t("goodsReceipt.summaryDraft")}
          value={stats.draft}
          icon={<ClipboardCheck className="h-5 w-5 text-yellow-500" />}
        />
        <StatsCard
          label={t("goodsReceipt.summaryCompleted")}
          value={stats.completed}
          icon={<CheckCircle2 className="h-5 w-5 text-green-500" />}
        />
        <StatsCard
          label={t("goodsReceipt.summaryToday")}
          value={stats.today}
          icon={<ClipboardCheck className="h-5 w-5 text-blue-500" />}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <SearchBox
          placeholder={t("goodsReceipt.searchPlaceholder")}
          value={filters.search ?? ""}
          onChange={(e) => {
            setFilters((prev) => ({ ...prev, search: e.target.value }));
            setPage(1);
          }}
          className="w-80"
        />
        <Select
          value={filters.status ?? "all"}
          onValueChange={(v: string) => {
            setFilters((prev) => ({ ...prev, status: v === "all" ? undefined : v }));
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("goodsReceipt.allStatus")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("goodsReceipt.allStatus")}</SelectItem>
            <SelectItem value="draft">{t("goodsReceipt.statusDraft")}</SelectItem>
            <SelectItem value="completed">{t("goodsReceipt.statusCompleted")}</SelectItem>
            <SelectItem value="cancelled">{t("goodsReceipt.statusCancelled")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Grid */}
      <Card>
        <CardContent className="p-0">
          <DataGrid
            columns={columns}
            data={items}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyTitle={t("goodsReceipt.noReceipts")}
            emptyDescription={t("goodsReceipt.noGoodsReceiptsDesc")}
            total={total}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <GoodsReceiptDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleCreate}
      />

      <GoodsReceiptDetailDrawer
        goodsReceiptId={detailId}
        onClose={() => setDetailId(null)}
      />

      {/* Confirm Dialog */}
      <Dialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction?.type === "delete" && t("goodsReceipt.confirmDelete")}
              {confirmAction?.type === "complete" && t("goodsReceipt.confirmComplete")}
              {confirmAction?.type === "cancel" && t("goodsReceipt.confirmCancel")}
              {confirmAction?.type === "restore" && t("goodsReceipt.confirmRestore")}
            </DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "delete" && t("goodsReceipt.confirmDelete")}
              {confirmAction?.type === "complete" && t("goodsReceipt.confirmComplete")}
              {confirmAction?.type === "cancel" && t("goodsReceipt.confirmCancel")}
              {confirmAction?.type === "restore" && t("goodsReceipt.confirmRestore")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              {t("common.cancel")}
            </Button>
            <Button
              variant={confirmAction?.type === "delete" || confirmAction?.type === "cancel" ? "destructive" : "primary"}
              onClick={handleConfirmAction}
            >
              {confirmAction?.type === "delete" && t("common.delete")}
              {confirmAction?.type === "complete" && t("goodsReceipt.completeReceipt")}
              {confirmAction?.type === "cancel" && t("goodsReceipt.cancelReceipt")}
              {confirmAction?.type === "restore" && t("goodsReceipt.restoreReceipt")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
