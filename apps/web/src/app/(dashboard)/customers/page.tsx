"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@repo/ui";
import { CustomerPageShell } from "./_components/customer-page-shell";
import {
  Card,
  CardContent,
  DataGrid,
  SearchBox,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Badge,
} from "@repo/ui";
import type { Column } from "@repo/ui";
import {
  Plus,
  RefreshCw,
  Eye,
  Pencil,
  PowerOff,
  Power,
  Ban,
  WifiOff,
  Trash2,
} from "lucide-react";
import {
  getCustomersAction,
  deactivateCustomerAction,
  activateCustomerAction,
  softDeleteCustomerAction,
  blockCustomerAction,
  releaseCustomerBlockAction,
  type CustomerListFilters,
} from "@/app/actions/customers";

/* ── Types ─────────────────────────────────────────────────────── */

interface CustomerRow {
  id: string;
  customerCode: string;
  name: string;
  shortName: string | null;
  phone: string | null;
  taxNumber: string | null;
  isActive: boolean;
  operationalBlock: Record<string, unknown> | null;
  updatedAt: string | Date;
}

interface ConfirmAction {
  action: "deactivate" | "activate" | "block" | "releaseBlock" | "delete";
  customerId: string;
  customerName: string;
}

/* ── Badge Helpers ─────────────────────────────────────────────── */

function CustomerStatusBadge({
  isActive,
  operationalBlock,
}: {
  isActive: boolean;
  operationalBlock: Record<string, unknown> | null;
}) {
  const { t } = useI18n();
  const isBlocked =
    isActive &&
    operationalBlock != null &&
    !(operationalBlock as any).blockReleasedAt;

  if (isBlocked) {
    return <Badge variant="danger">{t("customers.status.blocked")}</Badge>;
  }
  if (isActive) {
    return <Badge variant="success">{t("customers.status.active")}</Badge>;
  }
  return <Badge variant="secondary">{t("customers.status.passive")}</Badge>;
}

function formatDate(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function CustomerListPage() {
  const { t } = useI18n();
  const router = useRouter();

  /* ── State ── */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [filters, setFilters] = useState<CustomerListFilters>({});

  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getCustomersAction({ ...filters, page, pageSize });
      setCustomers(result.items as any);
      setTotal(result.total);
    } catch (err: any) {
      setError(err.message ?? t("customers.error.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Handlers ── */
  const handleRefresh = useCallback(() => {
    setPage(1);
    setFilters({});
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!confirmAction) return;
    const { action, customerId } = confirmAction;
    try {
      switch (action) {
        case "deactivate":
          await deactivateCustomerAction(customerId);
          break;
        case "activate":
          await activateCustomerAction(customerId);
          break;
        case "block":
          await blockCustomerAction({
            customerId,
            blockReason: "Manual block from list",
            blockCategory: "other",
          });
          break;
        case "releaseBlock":
          await releaseCustomerBlockAction({ customerId });
          break;
        case "delete":
          await softDeleteCustomerAction({ id: customerId });
          break;
      }
      setConfirmAction(null);
      fetchData();
    } catch (err: any) {
      setError(err.message ?? "Operation failed");
      setConfirmAction(null);
    }
  }, [confirmAction, fetchData]);

  /* ── Columns ── */
  const columns: Column<CustomerRow>[] = useMemo(
    () => [
      {
        key: "customerCode",
        header: t("customers.customerCode") || "Code",
        sortable: true,
        render: (row) => (
          <span className="font-mono text-xs font-medium text-text-primary">
            {row.customerCode}
          </span>
        ),
      },
      {
        key: "name",
        header: t("customers.name") || "Name",
        sortable: true,
        render: (row) => (
          <div>
            <p className="font-medium text-text-primary">{row.name}</p>
            {row.shortName && (
              <p className="text-xs text-text-muted">{row.shortName}</p>
            )}
          </div>
        ),
      },
      {
        key: "shortName",
        header: t("customers.shortName") || "Short Name",
        sortable: true,
        render: (row) => (
          <span className="text-sm text-text-muted">
            {row.shortName ?? "—"}
          </span>
        ),
      },
      {
        key: "phone",
        header: t("customers.phone") || "Phone",
        sortable: false,
        render: (row) => (
          <span className="text-sm text-text-primary">
            {row.phone ?? "—"}
          </span>
        ),
      },
      {
        key: "taxNumber",
        header: t("customers.taxNumber") || "Tax No",
        sortable: false,
        render: (row) => (
          <span className="text-sm text-text-primary">
            {row.taxNumber ?? "—"}
          </span>
        ),
      },
      {
        key: "isActive",
        header: t("customers.columnStatus") || "Status",
        sortable: false,
        render: (row) => (
          <CustomerStatusBadge
            isActive={row.isActive}
            operationalBlock={row.operationalBlock}
          />
        ),
      },
      {
        key: "updatedAt",
        header: t("customers.updatedAt") || "Updated",
        sortable: true,
        render: (row) => (
          <span className="text-sm text-text-muted">
            {formatDate(row.updatedAt)}
          </span>
        ),
      },
    ],
    [t],
  );

  /* ── Confirm Dialog Title ── */
  const confirmTitle = useMemo(() => {
    if (!confirmAction) return "";
    const keyMap: Record<string, string> = {
      deactivate: "customers.confirmDeactivate",
      activate: "customers.confirmActivate",
      block: "customers.confirmBlock",
      releaseBlock: "customers.confirmReleaseBlock",
      delete: "customers.confirmDelete",
    };
    return t(keyMap[confirmAction.action] ?? "");
  }, [confirmAction, t]);

  /* ── Render ── */
  if (error && customers.length === 0) {
    return (
      <CustomerPageShell
        title={t("customers.title")}
        description={t("customers.description")}
      >
        <Card>
          <CardContent className="flex flex-col items-center gap-4 p-12">
            <p className="text-sm text-red-500">{error}</p>
            <Button onClick={fetchData}>
              {t("common.retry") || "Retry"}
            </Button>
          </CardContent>
        </Card>
      </CustomerPageShell>
    );
  }

  return (
    <CustomerPageShell
      title={t("customers.title")}
      description={t("customers.description")}
    >
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div className="max-w-sm flex-1">
            <SearchBox
              placeholder={t("customers.searchPlaceholder")}
              value={filters.search ?? ""}
              onSearch={(v) =>
                setFilters((p) => ({ ...p, search: v, page: 1 }))
              }
            />
          </div>
          <Select
            value={filters.status ?? "all"}
            onValueChange={(v) =>
              setFilters((p) => ({
                ...p,
                status: v === "all" ? undefined : v,
                page: 1,
              }))
            }
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t("customers.allStatus")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t("customers.allStatus")}
              </SelectItem>
              <SelectItem value="active">
                <Badge variant="success">
                  {t("customers.status.active")}
                </Badge>
              </SelectItem>
              <SelectItem value="passive">
                <Badge variant="secondary">
                  {t("customers.status.passive")}
                </Badge>
              </SelectItem>
              <SelectItem value="blocked">
                <Badge variant="danger">
                  {t("customers.status.blocked")}
                </Badge>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="rounded-lg border border-glass-border bg-glass-surface p-2 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
            title={t("customers.refresh")}
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
          </button>
          <Button onClick={() => router.push("/customers/new")}>
            <Plus className="mr-1.5 h-4 w-4" />
            {t("customers.addCustomer")}
          </Button>
        </div>
      </div>

      {/* ── Table ── */}
      <Card>
        <CardContent className="p-0">
          <DataGrid
            columns={columns}
            data={customers}
            keyExtractor={(row) => row.id}
            loading={loading}
            emptyTitle={t(
              filters.search
                ? "customers.emptyState.noSearchResults"
                : "customers.emptyState.noCustomers",
            )}
            emptyDescription={
              filters.search
                ? t("customers.emptyState.noSearchResultsDesc")
                : t("customers.emptyState.noCustomersDesc")
            }
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            sortColumn={filters.sortBy}
            sortDirection={filters.sortOrder}
            onSort={(col) =>
              setFilters((p) => ({
                ...p,
                sortBy: col,
                sortOrder:
                  p.sortBy === col && p.sortOrder === "asc" ? "desc" : "asc",
              }))
            }
            onRowClick={(row) => router.push(`/customers/${row.id}`)}
            rowActions={(row) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/customers/${row.id}`);
                  }}
                  className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
                  title={t("customers.actions.viewDetails")}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/customers/${row.id}/edit`);
                  }}
                  className="rounded-md p-1.5 text-text-muted hover:bg-glass-surface-hover hover:text-text-primary transition-colors"
                  title={t("customers.actions.edit")}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                {/* Toggle activate/deactivate */}
                {row.isActive ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmAction({
                        action: "deactivate",
                        customerId: row.id,
                        customerName: row.name,
                      });
                    }}
                    className="rounded-md p-1.5 text-text-muted hover:bg-amber-500/10 hover:text-amber-500 transition-colors"
                    title={t("customers.actions.deactivate")}
                  >
                    <PowerOff className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setConfirmAction({
                        action: "activate",
                        customerId: row.id,
                        customerName: row.name,
                      });
                    }}
                    className="rounded-md p-1.5 text-text-muted hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                    title={t("customers.actions.activate")}
                  >
                    <Power className="h-4 w-4" />
                  </button>
                )}
                {/* Block / Release Block toggle */}
                {(() => {
                  const isBlocked =
                    row.isActive &&
                    row.operationalBlock != null &&
                    !(row.operationalBlock as any).blockReleasedAt;
                  return isBlocked ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmAction({
                          action: "releaseBlock",
                          customerId: row.id,
                          customerName: row.name,
                        });
                      }}
                      className="rounded-md p-1.5 text-text-muted hover:bg-emerald-500/10 hover:text-emerald-500 transition-colors"
                      title={t("customers.releaseBlock")}
                    >
                      <WifiOff className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmAction({
                          action: "block",
                          customerId: row.id,
                          customerName: row.name,
                        });
                      }}
                      className="rounded-md p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      title={t("customers.block")}
                    >
                      <Ban className="h-4 w-4" />
                    </button>
                  );
                })()}
                {/* Soft Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmAction({
                      action: "delete",
                      customerId: row.id,
                      customerName: row.name,
                    });
                  }}
                  className="rounded-md p-1.5 text-text-muted hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  title={t("customers.delete")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* ── Confirm Action Dialog ── */}
      <Dialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTitle}</DialogTitle>
            <DialogDescription>
              {confirmAction && (
                <span>
                  <strong>{confirmAction.customerName}</strong> (
                  {confirmAction.customerId.slice(0, 8)}...)
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setConfirmAction(null)}>
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button
              variant={
                confirmAction?.action === "activate" ||
                confirmAction?.action === "releaseBlock"
                  ? "primary"
                  : "destructive"
              }
              onClick={handleConfirm}
            >
              {confirmAction?.action === "deactivate" && (
                <>
                  <PowerOff className="mr-1.5 h-4 w-4" />{" "}
                  {t("customers.actions.deactivate")}
                </>
              )}
              {confirmAction?.action === "activate" && (
                <>
                  <Power className="mr-1.5 h-4 w-4" />{" "}
                  {t("customers.actions.activate")}
                </>
              )}
              {confirmAction?.action === "block" && (
                <>
                  <Ban className="mr-1.5 h-4 w-4" /> {t("customers.block")}
                </>
              )}
              {confirmAction?.action === "releaseBlock" && (
                <>
                  <WifiOff className="mr-1.5 h-4 w-4" />{" "}
                  {t("customers.releaseBlock")}
                </>
              )}
              {confirmAction?.action === "delete" && (
                <>
                  <Trash2 className="mr-1.5 h-4 w-4" />{" "}
                  {t("customers.delete")}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </CustomerPageShell>
  );
}
