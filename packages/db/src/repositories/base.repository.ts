import { and, eq, isNull, isNotNull, or, sql, gte, lte, lt, gt, inArray } from "drizzle-orm";
import { getTenantContext, getActiveDb } from "../db/transactions.js";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RepositoryQueryOptions {
  tenantId?: string;
  factoryId?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
  activeOnly?: boolean;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  filters?: Record<string, unknown>;
  tx?: unknown;
  userId?: string;
}

export interface RepositoryListResult<T> {
  items: T[];
  total: number;
}

export interface RepositorySoftDeleteOptions {
  userId?: string;
  tx?: unknown;
}

/**
 * Resolve the actual db client to use — prefers transaction client if available.
 * This enables proper transaction-scoped queries.
 */
function resolveDb(db: any, options: { tx?: unknown } = {}): any {
  if (options.tx) return options.tx;
  return db;
}

// ─── Base Repository ────────────────────────────────────────────────────────
// All queries use SQL WHERE clauses via Drizzle ORM.
// No in-memory filtering for tenant/factory scope.
// update/softDelete/restore include tenant guards when tenantScoped is set.

export class BaseRepository<T extends Record<string, unknown>> {
  /** Column name resolution for snake_case DB columns mapped to camelCase properties */
  protected readonly columnMap: Record<string, string> = {
    tenantId: "tenant_id",
    factoryId: "factory_id",
    deletedAt: "deleted_at",
    deletedBy: "deleted_by",
    createdAt: "created_at",
    createdBy: "created_by",
    updatedAt: "updated_at",
    updatedBy: "updated_by",
    isActive: "is_active",
  };

  constructor(
    protected readonly _db: any,
    protected readonly table: unknown,
    protected readonly options: {
      softDelete?: boolean;
      tenantScoped?: boolean;
      factoryScoped?: boolean;
      activeFlag?: boolean;
    } = {}
  ) {}

  /**
   * Resolve the database client to use for the current operation.
   *
   * Priority:
   *   1. Explicit transaction passed via options.tx
   *   2. Active transaction from AsyncLocalStorage (set by withTenantSession)
   *   3. Default database client (this._db)
   *
   * This ensures that every repository query executed inside withTenantSession()
   * uses the SAME PostgreSQL transaction client, so RLS session variables
   * set via set_config() are always visible.
   */
  protected getDb(tx?: unknown): any {
    if (tx) return tx;
    const activeTx = getActiveDb();
    if (activeTx) return activeTx;
    return this._db;
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────

  async create(input: Partial<T> & Record<string, unknown>): Promise<T> {
    const record = {
      ...input,
      createdAt: input.createdAt ?? new Date(),
      updatedAt: input.updatedAt ?? new Date(),
      createdBy: input.createdBy ?? input.userId ?? null,
      updatedBy: input.updatedBy ?? input.userId ?? null,
      deletedAt: input.deletedAt ?? null,
      deletedBy: input.deletedBy ?? null,
    };

    const db = this.getDb();
    const result = await db.insert(this.table).values(record).returning().execute();
    return (result?.[0] ?? record) as T;
  }

  async update(
    id: string,
    changes: Partial<T> & Record<string, unknown>,
    options: RepositorySoftDeleteOptions = {}
  ): Promise<T> {
    const db = this.getDb(options.tx);
    const payload: Record<string, unknown> = {
      id,
      ...changes,
      updatedAt: new Date(),
      updatedBy: changes.updatedBy ?? options.userId ?? null,
    };

    const builder = db.update(this.table).set(payload);
    const conditions = [eq((this.table as any).id, id)];

    // Add tenant guard to prevent cross-tenant updates
    if (this.options.tenantScoped && (changes as any).tenantId) {
      conditions.push(eq((this.table as any).tenantId, (changes as any).tenantId));
    }

    if (typeof builder.where === "function") {
      builder.where(and(...conditions));
    }

    const result = await builder.returning().execute();
    return (result?.[0] ?? payload) as T;
  }

  async softDelete(
    id: string,
    options: RepositorySoftDeleteOptions & { tenantId?: string } = {}
  ): Promise<T> {
    const db = this.getDb(options.tx);
    const payload: Record<string, unknown> = {
      deletedAt: new Date(),
      deletedBy: options.userId ?? null,
      updatedAt: new Date(),
      updatedBy: options.userId ?? null,
    };

    const builder = db.update(this.table).set(payload);
    const conditions = [eq((this.table as any).id, id)];

    // Add tenant guard
    if (this.options.tenantScoped && options.tenantId) {
      conditions.push(eq((this.table as any).tenantId, options.tenantId));
    }

    if (typeof builder.where === "function") {
      builder.where(and(...conditions));
    }

    const result = await builder.returning().execute();
    return (result?.[0] ?? { ...payload, id }) as T;
  }

  async restore(
    id: string,
    options: RepositorySoftDeleteOptions & { tenantId?: string } = {}
  ): Promise<T> {
    const db = this.getDb(options.tx);
    const payload: Record<string, unknown> = {
      deletedAt: null,
      deletedBy: null,
      updatedAt: new Date(),
      updatedBy: options.userId ?? null,
    };

    const builder = db.update(this.table).set(payload);
    const conditions = [eq((this.table as any).id, id)];

    if (this.options.tenantScoped && options.tenantId) {
      conditions.push(eq((this.table as any).tenantId, options.tenantId));
    }

    if (typeof builder.where === "function") {
      builder.where(and(...conditions));
    }

    const result = await builder.returning().execute();
    return (result?.[0] ?? { ...payload, id }) as T;
  }

  // ─── Finder Methods ────────────────────────────────────────────────────

  async findById(id: string, options: RepositoryQueryOptions = {}): Promise<T | undefined> {
    const rows = await this.selectMany({ ...options, filters: { ...(options.filters ?? {}), id } });
    return rows[0];
  }

  async findByULID(id: string, options: RepositoryQueryOptions = {}): Promise<T | undefined> {
    return this.findById(id, options);
  }

  async findByCode(code: string, options: RepositoryQueryOptions = {}): Promise<T | undefined> {
    const rows = await this.selectMany({
      ...options,
      filters: { ...(options.filters ?? {}), code },
    });
    return rows[0];
  }

  async findByStatus(status: string, options: RepositoryQueryOptions = {}): Promise<T[]> {
    return this.selectMany({ ...options, status });
  }

  async findByTenant(tenantId: string, options: RepositoryQueryOptions = {}): Promise<T[]> {
    return this.selectMany({ ...options, tenantId });
  }

  async findByFactory(factoryId: string, options: RepositoryQueryOptions = {}): Promise<T[]> {
    return this.selectMany({ ...options, factoryId });
  }

  async list(options: RepositoryQueryOptions = {}): Promise<T[]> {
    return this.selectMany(options);
  }

  async filter(options: RepositoryQueryOptions = {}): Promise<T[]> {
    return this.selectMany(options);
  }

  async paginate(options: RepositoryQueryOptions = {}): Promise<RepositoryListResult<T>> {
    const page = Math.max(1, options.page ?? 1);
    const pageSize = Math.max(1, options.pageSize ?? 50);
    const all = await this.selectMany(options);
    const total = all.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;

    return {
      items: all.slice(start, end),
      total,
    };
  }

  // ─── Query Builder ─────────────────────────────────────────────────────

  /**
   * Enrich options with tenant context from AsyncLocalStorage if not
   * explicitly provided. This ensures all repository reads automatically
   * benefit from the tenant context set by the API middleware — no
   * controller or service changes needed for tenant scoping.
   */
  private enrichOptions(options: RepositoryQueryOptions): RepositoryQueryOptions {
    const ctx = getTenantContext();
    if (!ctx) return options;

    const enriched = { ...options };
    if (this.options.tenantScoped && !enriched.tenantId && ctx.tenantId) {
      enriched.tenantId = ctx.tenantId;
    }
    if (this.options.factoryScoped && !enriched.factoryId && ctx.factoryId) {
      enriched.factoryId = ctx.factoryId;
    }
    return enriched;
  }

  protected async selectMany(options: RepositoryQueryOptions = {}): Promise<T[]> {
    const enriched = this.enrichOptions(options);
    const db = this.getDb(enriched.tx);
    const query = db.select().from(this.table as never);
    const whereClause = this.buildWhereClause(enriched);

    if (whereClause) {
      query.where(whereClause as never);
    }

    const rows = (await query.execute()) as T[];
    return this.applyPostFilters(rows, enriched);
  }

  /**
   * Build a real SQL WHERE clause using Drizzle ORM expressions.
   * All tenant/factory filtering happens at the database level.
   *
   * Supports both explicit option fields (tenantId, status, etc.) and
   * generic filters passed via options.filters.* — any filter key that
   * matches a column on the table is automatically converted to an eq().
   */
  protected buildWhereClause(options: RepositoryQueryOptions): unknown | undefined {
    const clauses: unknown[] = [];
    const tableAny = this.table as any;

    // ── Tenant scope ───────────────────────────────────────────────────
    if (this.options.tenantScoped && options.tenantId) {
      clauses.push(eq(tableAny.tenantId, options.tenantId));
    }

    // ── Factory scope ──────────────────────────────────────────────────
    if (this.options.factoryScoped && options.factoryId) {
      clauses.push(eq(tableAny.factoryId, options.factoryId));
    }

    // ── Status filter ──────────────────────────────────────────────────
    if (options.status) {
      clauses.push(eq(tableAny.status, options.status));
    }

    // ── Soft delete filter ─────────────────────────────────────────────
    if (this.options.softDelete) {
      if (options.onlyDeleted) {
        clauses.push(isNotNull(tableAny.deletedAt));
      } else if (!options.includeDeleted) {
        clauses.push(isNull(tableAny.deletedAt));
      }
    }

    // ── Active flag ────────────────────────────────────────────────────
    if (this.options.activeFlag && options.activeOnly) {
      clauses.push(eq(tableAny.isActive, true));
    }

    // ── ID filter ──────────────────────────────────────────────────────
    if (options.filters?.id) {
      clauses.push(eq(tableAny.id, options.filters.id as string));
    }

    // ── Code filter ────────────────────────────────────────────────────
    if (options.filters?.code) {
      clauses.push(
        or(
          eq(tableAny.code, options.filters.code as string),
          eq(tableAny.customerCode, options.filters.code as string),
          eq(tableAny.factoryCode, options.filters.code as string)
        )!
      );
    }

    // ── Slug filter ────────────────────────────────────────────────────
    if (options.filters?.slug) {
      clauses.push(eq(tableAny.slug, options.filters.slug as string));
    }

    // ── Email filter ───────────────────────────────────────────────────
    if (options.filters?.email) {
      clauses.push(eq(tableAny.email, options.filters.email as string));
    }

    // ── Date range filter ──────────────────────────────────────────────
    if (options.filters?.startDate) {
      clauses.push(gte(tableAny.orderDate ?? tableAny.createdAt, options.filters.startDate as Date));
    }
    if (options.filters?.endDate) {
      clauses.push(lte(tableAny.orderDate ?? tableAny.createdAt, options.filters.endDate as Date));
    }

    // ── Quantity comparison filters (order lines) ──────────────────────
    if (options.filters?.incompleteOnly) {
      clauses.push(lt(tableAny.completedQuantity, tableAny.quantity));
    }
    if (options.filters?.hasBroken) {
      clauses.push(gt(tableAny.brokenQuantity, 0));
    }
    if (options.filters?.waitingRework) {
      clauses.push(gt(tableAny.brokenQuantity, 0));
      clauses.push(gt(tableAny.completedQuantity, 0));
    }

    // ── Operation list filter (for findByMachine) ──────────────────────
    if (options.filters?.operationIn && Array.isArray(options.filters.operationIn)) {
      clauses.push(inArray(
        tableAny.currentOperation ?? tableAny.operationCode,
        options.filters.operationIn as string[]
      ));
    }

    // ── Generic filters (auto-map keys to columns) ─────────────────────
    // Any filter key not handled above is tried as a direct eq() on the
    // corresponding table column. Skips undefined/null values and special
    // internal keys (prefixed with __).
    if (options.filters) {
      const handledKeys = new Set([
        "id", "code", "slug", "email",
        "startDate", "endDate",
        "incompleteOnly", "hasBroken", "waitingRework",
        "operationIn",
      ]);
      for (const [key, value] of Object.entries(options.filters)) {
        if (value === undefined || value === null) continue;
        if (handledKeys.has(key)) continue;
        if (key.startsWith("__")) continue;

        // Try matching the filter key to a column on the table
        if (tableAny[key] !== undefined) {
          clauses.push(eq(tableAny[key], value as any));
        }
      }
    }

    if (clauses.length === 0) return undefined;
    // @ts-expect-error — Drizzle accepts array of conditions for AND
    return and(...clauses);
  }

  /**
   * Post-fetch operations — search, sorting, and fallback filtering.
   *
   * When running against a real Postgres database, all filtering is done
   * via SQL WHERE in buildWhereClause() and this is a no-op (rows already
   * filtered). When running against a fake/mock DB that ignores WHERE
   * clauses (tests), the fallback filtering here ensures correct results.
   */
  protected applyPostFilters(rows: T[], options: RepositoryQueryOptions): T[] {
    let filtered = rows;

    // ── Fallback tenant scope ──────────────────────────────────────────
    if (this.options.tenantScoped && options.tenantId) {
      filtered = filtered.filter((row) => (row as any).tenantId === options.tenantId);
    }

    // ── Fallback factory scope ─────────────────────────────────────────
    if (this.options.factoryScoped && options.factoryId) {
      filtered = filtered.filter((row) => (row as any).factoryId === options.factoryId);
    }

    // ── Fallback status filter ─────────────────────────────────────────
    if (options.status) {
      filtered = filtered.filter((row) => (row as any).status === options.status);
    }

    // ── Fallback soft delete filter ────────────────────────────────────
    if (this.options.softDelete) {
      if (options.onlyDeleted) {
        filtered = filtered.filter((row) => (row as any).deletedAt != null);
      } else if (!options.includeDeleted) {
        filtered = filtered.filter((row) => (row as any).deletedAt == null);
      }
    }

    // ── Fallback active flag ───────────────────────────────────────────
    if (this.options.activeFlag && options.activeOnly) {
      filtered = filtered.filter((row) => (row as any).isActive === true);
    }

    // ── Fallback generic filters (mirrors buildWhereClause logic) ──────
    if (options.filters) {
      const handledKeys = new Set(["startDate", "endDate"]);
      for (const [key, value] of Object.entries(options.filters)) {
        if (value === undefined || value === null) continue;
        if (handledKeys.has(key)) continue;
        if (key.startsWith("__")) continue;

        const rowKey = key; // same as column name in JS (camelCase)
        if (key === "id" || key === "slug" || key === "email") {
          // Simple equality
          filtered = filtered.filter((row) => (row as any)[rowKey] === value);
        } else if (key === "code") {
          // Code filter matches code, customerCode, or factoryCode
          filtered = filtered.filter((row) =>
            (row as any).code === value ||
            (row as any).customerCode === value ||
            (row as any).factoryCode === value
          );
        } else if (key === "incompleteOnly" && value) {
          filtered = filtered.filter((row) => {
            const completed = Number((row as any).completedQuantity ?? 0);
            const quantity = Number((row as any).quantity ?? 0);
            return completed < quantity;
          });
        } else if (key === "hasBroken" && value) {
          filtered = filtered.filter((row) => Number((row as any).brokenQuantity ?? 0) > 0);
        } else if (key === "waitingRework" && value) {
          filtered = filtered.filter((row) => {
            const broken = Number((row as any).brokenQuantity ?? 0);
            const completed = Number((row as any).completedQuantity ?? 0);
            return broken > 0 && completed > 0;
          });
        } else if (key === "operationIn" && Array.isArray(value)) {
          const ops = (value as string[]).map((s) => s.toLowerCase());
          filtered = filtered.filter((row) => {
            const op = String((row as any).currentOperation ?? (row as any).operationCode ?? "").toLowerCase();
            return ops.includes(op);
          });
        } else {
          // Generic equality fallback
          filtered = filtered.filter((row) => (row as any)[rowKey] === value);
        }
      }
    }

    // ── Fallback date range ────────────────────────────────────────────
    if (options.filters?.startDate) {
      const start = options.filters.startDate as Date;
      filtered = filtered.filter((row) => {
        const d = new Date((row as any).orderDate ?? (row as any).createdAt ?? 0);
        return d >= start;
      });
    }
    if (options.filters?.endDate) {
      const end = options.filters.endDate as Date;
      filtered = filtered.filter((row) => {
        const d = new Date((row as any).orderDate ?? (row as any).createdAt ?? 0);
        return d <= end;
      });
    }

    // ── Client-side search across all fields ───────────────────────────
    if (options.search) {
      const term = options.search.toLowerCase();
      filtered = filtered.filter((row) =>
        Object.values(row as Record<string, unknown>).some(
          (value) => String(value ?? "").toLowerCase().includes(term)
        )
      );
    }

    // ── Client-side sort ───────────────────────────────────────────────
    if (options.sortBy) {
      filtered = [...filtered].sort((left, right) => {
        const leftValue = String(
          (left as Record<string, unknown>)[options.sortBy!] ?? ""
        );
        const rightValue = String(
          (right as Record<string, unknown>)[options.sortBy!] ?? ""
        );
        const comparison = leftValue.localeCompare(rightValue);
        return options.sortOrder === "desc" ? comparison * -1 : comparison;
      });
    }

    return filtered;
  }
}
