import { and, eq, ne, or, ilike, isNull, asc, desc, sql } from "drizzle-orm";
import {
  recipes,
  recipeItems,
  recipeOperations,
  recipeRules,
  recipeVersions,
} from "../schema/index";
import { BaseRepository } from "./base.repository";

/* ══════════════════════════════════════════════════════════════════════════════
   PROJECTION TYPES
   ══════════════════════════════════════════════════════════════════════════════ */

export interface RecipeListItem {
  id: string;
  recipeCode: string;
  name: string;
  version: number;
  productType: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecipeSearchResult {
  id: string;
  recipeCode: string;
  name: string;
  productType: string | null;
  isActive: boolean;
}

export interface RecipeItemProjection {
  id: string;
  recipeId: string;
  materialId: string;
  consumptionBasis: string;
  quantityPerUnit: string;
  unit: string;
  sequence: number;
}

export interface RecipeOperationProjection {
  id: string;
  recipeId: string;
  operationCode: string;
  sequence: number;
  isMandatory: boolean;
  notes: string | null;
}

export interface RecipeRuleProjection {
  id: string;
  recipeId: string;
  ruleType: string;
  ruleValue: string | null;
}

export interface RecipeVersionProjection {
  id: string;
  recipeId: string;
  versionNumber: number;
  snapshotJson: unknown;
  createdAt: Date;
}

export interface RecipeDetail {
  id: string;
  tenantId: string;
  factoryId: string | null;
  recipeCode: string;
  name: string;
  version: number;
  productType: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string | null;
  updatedBy: string | null;
  deletedAt: Date | null;
  deletedBy: string | null;
  items: RecipeItemProjection[];
  operations: RecipeOperationProjection[];
  rules: RecipeRuleProjection[];
}

export interface RecipeListFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
  productType?: string;
}

export interface RecipeRepositoryPaginatedResult {
  items: RecipeListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/* ══════════════════════════════════════════════════════════════════════════════
   RECIPE REPOSITORY
   ══════════════════════════════════════════════════════════════════════════════ */

export class RecipeRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, recipes, {
      softDelete: true,
      tenantScoped: true,
    });
  }

  /* ─── Transaction-safe DB resolver ──────────────────────────────────── */

  private resolveTx(options?: { tx?: unknown }): any {
    return this.getDb(options?.tx);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     LIST / SEARCH PROJECTIONS
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * §7.1 — Recipe List
   * Used by: /recipes page
   * Loads: id, recipe_code, name, version, product_type, is_active, timestamps
   * Supports: pagination, ILIKE search, sorting, active-only filter, productType filter
   */
  async findForList(
    tenantId: string,
    filters?: RecipeListFilters,
    options?: { tx?: unknown },
  ): Promise<RecipeRepositoryPaginatedResult> {
    const db = this.resolveTx(options);
    const conditions: any[] = [eq(recipes.tenantId, tenantId), isNull(recipes.deletedAt)];

    if (filters?.activeOnly) {
      conditions.push(eq(recipes.isActive, true));
    }

    if (filters?.productType) {
      conditions.push(eq(recipes.productType, filters.productType));
    }

    if (filters?.search) {
      const pattern = `%${filters.search}%`;
      conditions.push(
        or(
          ilike(recipes.name, pattern),
          ilike(recipes.recipeCode, pattern),
        ),
      );
    }

    const where = and(...conditions);

    const page = Math.max(1, filters?.page ?? 1);
    const pageSize = Math.max(1, filters?.pageSize ?? 20);
    const offset = (page - 1) * pageSize;

    const orderColumn = filters?.sortBy ?? "name";
    const orderDir = filters?.sortOrder === "desc" ? desc : asc;

    const items = await db
      .select({
        id: recipes.id,
        recipeCode: recipes.recipeCode,
        name: recipes.name,
        version: recipes.version,
        productType: recipes.productType,
        isActive: recipes.isActive,
        createdAt: recipes.createdAt,
        updatedAt: recipes.updatedAt,
      })
      .from(recipes)
      .where(where)
      .orderBy(orderDir((recipes as any)[orderColumn] ?? recipes.name))
      .limit(pageSize)
      .offset(offset);

    const totalResult = await db
      .select({ total: sql<number>`count(*)` })
      .from(recipes)
      .where(where);

    const total = Number(totalResult[0]?.total ?? 0);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * §7.2 — Recipe Search
   * Used by: search-as-you-type in RecipeSelector, command palette
   * Loads: id, recipe_code, name, product_type, is_active
   * Strategy: ILIKE on name, recipe_code
   * Limit: 20 results maximum
   */
  async search(
    tenantId: string,
    query: string,
    options?: { activeOnly?: boolean; limit?: number; tx?: unknown },
  ): Promise<RecipeSearchResult[]> {
    const db = this.resolveTx(options);
    const conditions: any[] = [eq(recipes.tenantId, tenantId), isNull(recipes.deletedAt)];

    if (query) {
      const pattern = `%${query}%`;
      conditions.push(
        or(
          ilike(recipes.name, pattern),
          ilike(recipes.recipeCode, pattern),
        ),
      );
    }

    if (options?.activeOnly ?? true) {
      conditions.push(eq(recipes.isActive, true));
    }

    const limit = Math.min(Math.max(1, options?.limit ?? 20), 100);

    return db
      .select({
        id: recipes.id,
        recipeCode: recipes.recipeCode,
        name: recipes.name,
        productType: recipes.productType,
        isActive: recipes.isActive,
      })
      .from(recipes)
      .where(and(...conditions))
      .orderBy(asc(recipes.name))
      .limit(limit);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     DETAIL PROJECTIONS
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * §7.3 — Recipe Detail (full)
   * Used by: Recipe detail/edit page
   * Loads: all recipe columns + items + operations + rules
   * Joins: recipe_items, recipe_operations, recipe_rules in parallel
   */
  async findDetail(
    id: string,
    tenantId: string,
    options?: { includeDeleted?: boolean; tx?: unknown },
  ): Promise<RecipeDetail | null> {
    const db = this.resolveTx(options);

    const conditions: any[] = [eq(recipes.id, id), eq(recipes.tenantId, tenantId)];
    if (!options?.includeDeleted) {
      conditions.push(isNull(recipes.deletedAt));
    }

    const row = await db
      .select({
        id: recipes.id,
        tenantId: recipes.tenantId,
        factoryId: recipes.factoryId,
        recipeCode: recipes.recipeCode,
        name: recipes.name,
        version: recipes.version,
        productType: recipes.productType,
        isActive: recipes.isActive,
        notes: recipes.notes,
        createdAt: recipes.createdAt,
        updatedAt: recipes.updatedAt,
        createdBy: recipes.createdBy,
        updatedBy: recipes.updatedBy,
        deletedAt: recipes.deletedAt,
        deletedBy: recipes.deletedBy,
      })
      .from(recipes)
      .where(and(...conditions))
      .limit(1);

    if (!row[0]) return null;

    const [items, operations, rules] = await Promise.all([
      this.findItemsByRecipeId(id, options),
      this.findOperationsByRecipeId(id, options),
      this.findRulesByRecipeId(id, options),
    ]);

    return {
      ...row[0],
      items,
      operations,
      rules,
    };
  }

  /**
   * §7.4 — Find by recipe code (tenant-scoped)
   * Used by: import, API lookup, duplicate detection
   * Loads: all recipe columns (root only, no children)
   */
  async findByRecipeCode(
    tenantId: string,
    recipeCode: string,
    options?: { tx?: unknown },
  ): Promise<typeof recipes.$inferSelect | undefined> {
    const db = this.resolveTx(options);
    const conditions = [
      eq(recipes.tenantId, tenantId),
      eq(recipes.recipeCode, recipeCode),
      isNull(recipes.deletedAt),
    ];

    const rows = await db
      .select()
      .from(recipes)
      .where(and(...conditions))
      .limit(1);

    return rows[0];
  }

  /**
   * §7.5 — Find active recipes
   * Used by: recipe selector in order entry, production workspace
   * Loads: id, recipe_code, name, version, product_type
   */
  async findActive(
    tenantId: string,
    options?: { tx?: unknown },
  ): Promise<RecipeSearchResult[]> {
    const db = this.resolveTx(options);
    const conditions = [
      eq(recipes.tenantId, tenantId),
      eq(recipes.isActive, true),
      isNull(recipes.deletedAt),
    ];

    return db
      .select({
        id: recipes.id,
        recipeCode: recipes.recipeCode,
        name: recipes.name,
        productType: recipes.productType,
        isActive: recipes.isActive,
      })
      .from(recipes)
      .where(and(...conditions))
      .orderBy(asc(recipes.name));
  }

  /* ══════════════════════════════════════════════════════════════════════════
     VERSION LOOKUPS
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * §7.6 — Find latest version snapshot for a recipe
   * Used by: production record creation, recipe comparison
   * Returns: the recipe_versions row matching recipes.version
   */
  async findLatestVersion(
    recipeId: string,
    options?: { tx?: unknown },
  ): Promise<typeof recipeVersions.$inferSelect | undefined> {
    const recipe = await this.findById(recipeId, { tx: options?.tx });
    if (!recipe) return undefined;
    return this.findByVersion(recipeId, (recipe as any).version, options);
  }

  /**
   * §7.7 — Find a specific version snapshot for a recipe
   * Used by: version history browser, rollback review
   */
  async findByVersion(
    recipeId: string,
    versionNumber: number,
    options?: { tx?: unknown },
  ): Promise<typeof recipeVersions.$inferSelect | undefined> {
    const db = this.resolveTx(options);

    const rows = await db
      .select()
      .from(recipeVersions)
      .where(
        and(
          eq(recipeVersions.recipeId, recipeId),
          eq(recipeVersions.versionNumber, versionNumber),
        ),
      )
      .limit(1);

    return rows[0];
  }

  /**
   * §7.8 — List all version snapshots for a recipe
   * Used by: version history UI
   */
  async listVersions(
    recipeId: string,
    options?: { tx?: unknown },
  ): Promise<RecipeVersionProjection[]> {
    const db = this.resolveTx(options);

    return db
      .select({
        id: recipeVersions.id,
        recipeId: recipeVersions.recipeId,
        versionNumber: recipeVersions.versionNumber,
        snapshotJson: recipeVersions.snapshotJson,
        createdAt: recipeVersions.createdAt,
      })
      .from(recipeVersions)
      .where(eq(recipeVersions.recipeId, recipeId))
      .orderBy(desc(recipeVersions.versionNumber));
  }

  /* ══════════════════════════════════════════════════════════════════════════
     EXISTENCE CHECKS
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * §7.9 — Check if a recipe code is already taken (tenant-scoped)
   * Used by: create/update validation
   */
  async exists(
    tenantId: string,
    recipeCode: string,
    options?: { excludeId?: string; tx?: unknown },
  ): Promise<boolean> {
    const db = this.resolveTx(options);
    const conditions: any[] = [
      eq(recipes.tenantId, tenantId),
      eq(recipes.recipeCode, recipeCode),
      isNull(recipes.deletedAt),
    ];

    if (options?.excludeId) {
      conditions.push(ne(recipes.id, options.excludeId));
    }

    const rows = await db
      .select({ id: recipes.id })
      .from(recipes)
      .where(and(...conditions))
      .limit(1);

    return rows.length > 0;
  }

  /**
   * §7.10 — Count recipes (optional filtered by product type)
   * Used by: dashboard widgets, statistics
   */
  async count(
    tenantId: string,
    options?: { productType?: string; activeOnly?: boolean; tx?: unknown },
  ): Promise<number> {
    const db = this.resolveTx(options);
    const conditions: any[] = [eq(recipes.tenantId, tenantId), isNull(recipes.deletedAt)];

    if (options?.productType) {
      conditions.push(eq(recipes.productType, options.productType));
    }

    if (options?.activeOnly) {
      conditions.push(eq(recipes.isActive, true));
    }

    const result = await db
      .select({ total: sql<number>`count(*)` })
      .from(recipes)
      .where(and(...conditions));

    return Number(result[0]?.total ?? 0);
  }

  /* ══════════════════════════════════════════════════════════════════════════
     CHILD LOADERS (private)
     ══════════════════════════════════════════════════════════════════════════ */

  private async findItemsByRecipeId(
    recipeId: string,
    options?: { tx?: unknown },
  ): Promise<RecipeItemProjection[]> {
    const db = this.resolveTx(options);

    return db
      .select({
        id: recipeItems.id,
        recipeId: recipeItems.recipeId,
        materialId: recipeItems.materialId,
        consumptionBasis: recipeItems.consumptionBasis,
        quantityPerUnit: recipeItems.quantityPerUnit,
        unit: recipeItems.unit,
        sequence: recipeItems.sequence,
      })
      .from(recipeItems)
      .where(eq(recipeItems.recipeId, recipeId))
      .orderBy(asc(recipeItems.sequence));
  }

  private async findOperationsByRecipeId(
    recipeId: string,
    options?: { tx?: unknown },
  ): Promise<RecipeOperationProjection[]> {
    const db = this.resolveTx(options);

    return db
      .select({
        id: recipeOperations.id,
        recipeId: recipeOperations.recipeId,
        operationCode: recipeOperations.operationCode,
        sequence: recipeOperations.sequence,
        isMandatory: recipeOperations.isMandatory,
        notes: recipeOperations.notes,
      })
      .from(recipeOperations)
      .where(eq(recipeOperations.recipeId, recipeId))
      .orderBy(asc(recipeOperations.sequence));
  }

  private async findRulesByRecipeId(
    recipeId: string,
    options?: { tx?: unknown },
  ): Promise<RecipeRuleProjection[]> {
    const db = this.resolveTx(options);

    return db
      .select({
        id: recipeRules.id,
        recipeId: recipeRules.recipeId,
        ruleType: recipeRules.ruleType,
        ruleValue: recipeRules.ruleValue,
      })
      .from(recipeRules)
      .where(eq(recipeRules.recipeId, recipeId));
  }
}
