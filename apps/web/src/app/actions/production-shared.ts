/* ─── Constants ──────────────────────────────────────────────── */

/**
 * Mapping from database operation codes to glass-industry stage labels.
 * Extend this map when new stages are added.
 */
export const STAGE_LABEL_MAP: Record<string, string> = {
  cutting: "productionWorkspace.stageCutting",
  grinding: "productionWorkspace.stageEdging",
  tempering: "productionWorkspace.stageTemperFurnace",
  quality: "productionWorkspace.stageQualityControl",
  dispatch: "productionWorkspace.stageReadyForShipment",
};

/** Operations that count as "active" for stage-based summary */
export const ACTIVE_STATUSES = ["pending", "in_progress"] as const;

/** Product type categories for glass temper factory */
export type CompletedFilter = "today" | "yesterday" | "this_week";

/* ─── Types ──────────────────────────────────────────────────── */

export interface ProductionOrderItem {
  id: string;
  glassBarcode: string;
  productType: string | null;
  currentOperation: string | null;
  currentStatus: string;
  isRework: boolean;
  revisionNumber: number;
  widthMm: string;
  heightMm: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  orderNumber: string | null;
  customerName: string | null;
  /* ── Glass temper extras ── */
  machineName: string | null;
  rack: string | null;
  priority: number | null;
  dueDate: string | null;
  remainingPieces: number | null;
  completedPieces: number | null;
  totalPieces: number | null;
  progress: number | null;
}

export interface StageCount {
  /** Database operation code (cutting, grinding, tempering, ...) */
  operation: string;
  /** i18n key for the stage label */
  labelKey: string;
  /** Number of orders currently at this stage */
  count: number;
}

export interface ProductionWorkspaceSummary {
  /* ── Legacy status counts (kept for backward compat) ── */
  activeJobs: number;
  completedToday: number;
  pendingJobs: number;
  brokenJobs: number;
  reworkJobs: number;
  /* ── Glass-industry stage counts ── */
  stageCounts: StageCount[];
}

export interface ProductionWorkspaceData {
  summary: ProductionWorkspaceSummary;
  activeJobs: ProductionOrderItem[];
  recentCompleted: ProductionOrderItem[];
}

/* ─── Helpers ────────────────────────────────────────────────── */

/** Map a raw query row to ProductionOrderItem, converting Date → ISO string */
export function formatRow(row: Record<string, any>): ProductionOrderItem {
  const totalPieces: number | null = row.totalPieces ?? null;
  const completedPieces: number | null = row.completedPieces ?? null;
  const progress: number | null =
    totalPieces !== null && completedPieces !== null && totalPieces > 0
      ? Math.round((completedPieces / totalPieces) * 100)
      : null;

  return {
    id: row.id,
    glassBarcode: row.glassBarcode,
    productType: row.productType ?? null,
    currentOperation: row.currentOperation ?? null,
    currentStatus: row.currentStatus,
    isRework: row.isRework ?? false,
    revisionNumber: row.revisionNumber ?? 0,
    widthMm: row.widthMm,
    heightMm: row.heightMm,
    notes: row.notes ?? null,
    createdAt: row.createdAt?.toISOString?.() ?? String(row.createdAt),
    updatedAt: row.updatedAt?.toISOString?.() ?? String(row.updatedAt),
    completedAt: row.completedAt?.toISOString?.() ?? null,
    orderNumber: row.orderNumber ?? null,
    customerName: row.customerName ?? null,
    /* ── Glass temper extras ── */
    machineName: row.machineName ?? null,
    rack: null, // Rack tracking not yet in schema — placeholder for future
    priority: row.priority ?? null,
    dueDate: row.dueDate?.toISOString?.() ?? row.dueDate ?? null,
    remainingPieces: row.remainingPieces ?? null,
    completedPieces,
    totalPieces,
    progress,
  };
}

/**
 * Resolve a CompletedFilter value to a Date range.
 */
export function resolveCompletedSince(filter: CompletedFilter): { since: Date; until?: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (filter) {
    case "today":
      return { since: start };
    case "yesterday": {
      const yesterday = new Date(start);
      yesterday.setDate(yesterday.getDate() - 1);
      return { since: yesterday, until: start };
    }
    case "this_week": {
      const weekStart = new Date(start);
      const day = weekStart.getDay();
      const diff = day === 0 ? -6 : 1 - day; // Monday start
      weekStart.setDate(weekStart.getDate() + diff);
      return { since: weekStart };
    }
  }
}
