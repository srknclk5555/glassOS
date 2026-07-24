import { RecipeManagementEngine } from "@repo/engine";
import { RecipeRepository } from "../repositories/recipe.repository";
import { withTenantSession } from "../db/transactions";
import { recipeVersions } from "../schema/recipes";
import type {
  DomainEvent,
  EventPublisher,
  RecipeCreatedEvent,
  RecipeUpdatedEvent,
  RecipeArchivedEvent,
  RecipeRestoredEvent,
  RecipeVersionCreatedEvent,
  RecipeClonedEvent,
} from "./events";

/* ══════════════════════════════════════════════════════════════════════════════
   RECIPE SERVICE
   ══════════════════════════════════════════════════════════════════════════════
   Orchestration layer between UI/API → Engine → Repository → Database.
   Owns the workflow: validation, version management, event publishing.
   Engine owns recipe rules. Repository owns persistence.
   ══════════════════════════════════════════════════════════════════════════════ */

export class RecipeService {
  constructor(
    private readonly recipeRepository: RecipeRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly db: any,
  ) {}

  /* ══════════════════════════════════════════════════════════════════════════
     CORE CRUD
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * §7.11 — Create a new recipe
   * Orchestrates: existence check → repository.create → Engine version
   *               → version snapshot persist → event publish
   */
  async create(input: {
    id: string;
    tenantId: string;
    factoryId?: string;
    recipeCode: string;
    name: string;
    productType?: string;
    notes?: string;
    userId?: string;
  }): Promise<{ recipe: any; events: DomainEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      // 1. Uniqueness check
      const alreadyExists = await this.recipeRepository.exists(
        input.tenantId,
        input.recipeCode,
      );
      if (alreadyExists) {
        throw new Error(
          `Recipe code "${input.recipeCode}" already exists for this tenant.`,
        );
      }

      // 2. Create the recipe record
      const recipe = await this.recipeRepository.create({
        id: input.id,
        tenantId: input.tenantId,
        factoryId: input.factoryId ?? null,
        recipeCode: input.recipeCode,
        name: input.name,
        version: 1,
        productType: input.productType ?? null,
        isActive: true,
        notes: input.notes ?? null,
        userId: input.userId,
      });

      // 3. Create initial version snapshot via Engine
      const engineRecipe = RecipeManagementEngine.addVersion(
        RecipeManagementEngine.createRecipe({
          recipeCode: input.recipeCode,
          productName: input.name,
        }),
        {
          versionNumber: 1,
          effectiveDate: new Date().toISOString(),
          notes: "Initial version",
          isActive: true,
        },
      );

      const versionNumber =
        engineRecipe.versions[engineRecipe.versions.length - 1]
          ?.versionNumber ?? 1;

      // 4. Persist initial version snapshot
      const snapshotJson = JSON.parse(JSON.stringify(engineRecipe));

      await this.db
        .insert(recipeVersions)
        .values({
          id: input.id,
          recipeId: recipe.id,
          versionNumber,
          snapshotJson,
        })
        .execute();

      const event: RecipeCreatedEvent = {
        eventType: "recipe.created",
        recipeId: recipe.id,
        recipeCode: recipe.recipeCode,
        name: recipe.name,
        createdAt: new Date(),
      };

      return { recipe, events: [event] };
    });

    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * §7.12 — Update a recipe's root fields
   * Does NOT create a new version. Use createNewVersion() for that.
   */
  async update(
    id: string,
    changes: Partial<{
      name: string;
      recipeCode: string;
      productType: string;
      notes: string;
      userId: string;
    }>,
  ): Promise<{ recipe: any; events: DomainEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      // 1. Existence check
      const existing = await this.recipeRepository.findById(id);
      if (!existing) {
        throw new Error(`Recipe not found: ${id}`);
      }

      // 2. If recipeCode is changing, check uniqueness
      if (changes.recipeCode && changes.recipeCode !== existing.recipeCode) {
        const alreadyExists = await this.recipeRepository.exists(
          existing.tenantId,
          changes.recipeCode,
          { excludeId: id },
        );
        if (alreadyExists) {
          throw new Error(
            `Recipe code "${changes.recipeCode}" already exists for this tenant.`,
          );
        }
      }

      // 3. Update the recipe
      const recipe = await this.recipeRepository.update(id, changes);

      const changedFields = Object.keys(changes).filter(
        (k) => k !== "userId",
      );
      const event: RecipeUpdatedEvent = {
        eventType: "recipe.updated",
        recipeId: id,
        recipeCode: recipe.recipeCode,
        changedFields,
        updatedAt: new Date(),
      };

      return { recipe, events: [event] };
    });

    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * §7.13 — Archive (soft-deactivate) a recipe
   */
  async archive(
    id: string,
    userId?: string,
  ): Promise<{ recipe: any; events: DomainEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const existing = await this.recipeRepository.findById(id);
      if (!existing) {
        throw new Error(`Recipe not found: ${id}`);
      }

      const recipe = await this.recipeRepository.update(id, {
        isActive: false,
        userId,
      });

      const event: RecipeArchivedEvent = {
        eventType: "recipe.archived",
        recipeId: id,
        recipeCode: recipe.recipeCode,
        archivedAt: new Date(),
      };

      return { recipe, events: [event] };
    });

    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /**
   * §7.14 — Restore an archived recipe
   */
  async restore(
    id: string,
    userId?: string,
  ): Promise<{ recipe: any; events: DomainEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const existing = await this.recipeRepository.findById(id, {
        includeDeleted: true,
      });
      if (!existing) {
        throw new Error(`Recipe not found: ${id}`);
      }

      const recipe = await this.recipeRepository.update(id, {
        isActive: true,
        userId,
      });

      const event: RecipeRestoredEvent = {
        eventType: "recipe.restored",
        recipeId: id,
        recipeCode: recipe.recipeCode,
        restoredAt: new Date(),
      };

      return { recipe, events: [event] };
    });

    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     READ OPERATIONS
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * §7.15 — Get a single recipe by ID (root fields only)
   */
  async getRecipe(id: string): Promise<any | undefined> {
    return withTenantSession(async (tx, ctx) => {
      return this.recipeRepository.findById(id);
    });
  }

  /**
   * §7.16 — Get recipe detail with all children (items, operations, rules)
   */
  async getRecipeDetail(
    id: string,
    tenantId: string,
  ): Promise<any | null> {
    return withTenantSession(async (tx, ctx) => {
      return this.recipeRepository.findDetail(id, tenantId);
    });
  }

  /**
   * §7.17 — List recipes with pagination and filtering
   */
  async listRecipes(
    tenantId: string,
    filters?: import("../repositories/recipe.repository").RecipeListFilters,
  ): Promise<
    import("../repositories/recipe.repository").RecipeRepositoryPaginatedResult
  > {
    return withTenantSession(async (tx, ctx) => {
      return this.recipeRepository.findForList(tenantId, filters);
    });
  }

  /**
   * §7.18 — Search recipes by name/code (for selectors)
   */
  async searchRecipes(
    tenantId: string,
    query: string,
    options?: { activeOnly?: boolean; limit?: number },
  ): Promise<
    import("../repositories/recipe.repository").RecipeSearchResult[]
  > {
    return withTenantSession(async (tx, ctx) => {
      return this.recipeRepository.search(tenantId, query, options);
    });
  }

  /* ══════════════════════════════════════════════════════════════════════════
     VERSION OPERATIONS
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * §7.19 — List all version snapshots for a recipe
   */
  async listVersions(
    recipeId: string,
  ): Promise<
    import("../repositories/recipe.repository").RecipeVersionProjection[]
  > {
    return withTenantSession(async (tx, ctx) => {
      return this.recipeRepository.listVersions(recipeId);
    });
  }

  /**
   * §7.20 — Get a specific version snapshot
   */
  async getVersion(
    recipeId: string,
    versionNumber: number,
  ): Promise<any | undefined> {
    return withTenantSession(async (tx, ctx) => {
      return this.recipeRepository.findByVersion(recipeId, versionNumber);
    });
  }

  /**
   * §7.21 — Create a new version for an existing recipe
   *
   * Orchestrates: existence check → Engine.addVersion → repository update
   *               → version snapshot persist → event publish
   *
   * The Engine handles version increment logic and activation/deactivation.
   * The Service persists the result.
   */
  async createNewVersion(
    id: string,
    input: {
      notes?: string;
      isActive?: boolean;
      userId?: string;
    },
  ): Promise<{ recipe: any; events: DomainEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      // 1. Fetch existing recipe
      const existing = await this.recipeRepository.findById(id);
      if (!existing) {
        throw new Error(`Recipe not found: ${id}`);
      }

      // 2. Build a ProductRecipe for the Engine
      const engineRecipe = RecipeManagementEngine.addVersion(
        RecipeManagementEngine.createRecipe({
          recipeCode: existing.recipeCode,
          productName: existing.name,
        }),
        {
          versionNumber: existing.version + 1,
          effectiveDate: new Date().toISOString(),
          notes: input.notes,
          isActive: input.isActive ?? true,
        },
      );

      const newVersionNumber =
        engineRecipe.versions[engineRecipe.versions.length - 1]
          ?.versionNumber ?? existing.version + 1;

      // 3. Update recipe version number
      const recipe = await this.recipeRepository.update(id, {
        version: newVersionNumber,
        userId: input.userId,
      });

      // 4. Persist version snapshot
      const snapshotJson = JSON.parse(JSON.stringify(engineRecipe));

      await this.db
        .insert(recipeVersions)
        .values({
          id: id,
          recipeId: id,
          versionNumber: newVersionNumber,
          snapshotJson,
        })
        .execute();

      const event: RecipeVersionCreatedEvent = {
        eventType: "recipe.version.created",
        recipeId: id,
        recipeCode: recipe.recipeCode,
        versionNumber: newVersionNumber,
        createdAt: new Date(),
      };

      return { recipe, events: [event] };
    });

    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     CLONE
     ══════════════════════════════════════════════════════════════════════════ */

  /**
   * §7.22 — Clone an existing recipe with a new code
   *
   * Copies the recipe root, creates version 1 for the clone, and
   * preserves the snapshot of the original recipe as a reference.
   */
  async cloneRecipe(
    id: string,
    newRecipeCode: string,
    options?: {
      newId: string;
      newName?: string;
      tenantId?: string;
      factoryId?: string;
      userId?: string;
    },
  ): Promise<{ recipe: any; events: DomainEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      // 1. Fetch original recipe detail with all children
      const original = await this.recipeRepository.findDetail(
        id,
        ctx.tenantId!,
      );
      if (!original) {
        throw new Error(`Recipe not found: ${id}`);
      }

      // 2. Check new code uniqueness
      const alreadyExists = await this.recipeRepository.exists(
        ctx.tenantId!,
        newRecipeCode,
      );
      if (alreadyExists) {
        throw new Error(
          `Recipe code "${newRecipeCode}" already exists for this tenant.`,
        );
      }

      const cloneId = options?.newId;
      if (!cloneId) {
        throw new Error("options.newId is required for cloneRecipe.");
      }

      // 3. Create the clone recipe root
      const recipe = await this.recipeRepository.create({
        id: cloneId,
        tenantId: original.tenantId,
        factoryId: options?.factoryId ?? original.factoryId,
        recipeCode: newRecipeCode,
        name: options?.newName ?? `${original.name} (Clone)`,
        version: 1,
        productType: original.productType,
        isActive: true,
        notes: original.notes,
        userId: options?.userId,
      });

      // 4. Create initial version snapshot via Engine
      const engineRecipe = RecipeManagementEngine.addVersion(
        RecipeManagementEngine.createRecipe({
          recipeCode: newRecipeCode,
          productName: recipe.name,
        }),
        {
          versionNumber: 1,
          effectiveDate: new Date().toISOString(),
          notes: `Cloned from ${original.recipeCode}`,
          isActive: true,
        },
      );

      const snapshotJson = JSON.parse(JSON.stringify(engineRecipe));

      await this.db
        .insert(recipeVersions)
        .values({
          id: cloneId,
          recipeId: cloneId,
          versionNumber: 1,
          snapshotJson,
        })
        .execute();

      const event: RecipeClonedEvent = {
        eventType: "recipe.cloned",
        recipeId: cloneId,
        sourceRecipeId: id,
        newRecipeCode,
        createdAt: new Date(),
      };

      return { recipe, events: [event] };
    });

    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }
}
