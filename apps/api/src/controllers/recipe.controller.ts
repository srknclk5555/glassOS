import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { success, created, sendError } from "../lib/response.js";
import { NotFoundError, ConflictError } from "../lib/errors.js";
import { getCurrentUser } from "../lib/auth.js";
import { paginated } from "../dto/common.dto.js";
import {
  createRecipeSchema,
  updateRecipeSchema,
  cloneRecipeSchema,
  createVersionSchema,
  recipeListQuerySchema,
  recipeSearchQuerySchema,
} from "../dto/recipe.dto.js";
import type { RecipeService } from "@repo/db";

export function createRecipeRouter(services: { recipe: RecipeService }) {
  const router = new Hono();

  /* ══════════════════════════════════════════════════════════════════════════
     LIST / SEARCH (must be before /:id to avoid route conflicts)
     ══════════════════════════════════════════════════════════════════════════ */

  /* GET /recipes — list with filtering and pagination */
  router.get("/", async (c) => {
    try {
      const query = recipeListQuerySchema.parse(c.req.query());
      const user = getCurrentUser(c);
      const result = await services.recipe.listRecipes(user.tenantId, {
        search: query.search,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        activeOnly: query.activeOnly,
        productType: query.productType,
        page: query.page,
        pageSize: query.limit,
      });
      return success(
        c,
        paginated(result.items, result.total, result.page, result.pageSize),
      );
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /recipes/search — search recipes by name/code (for selectors) */
  router.get("/search", async (c) => {
    try {
      const query = recipeSearchQuerySchema.parse(c.req.query());
      const user = getCurrentUser(c);
      const results = await services.recipe.searchRecipes(
        user.tenantId,
        query.q,
        {
          activeOnly: query.activeOnly,
          limit: query.limit,
        },
      );
      return success(c, results);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* ══════════════════════════════════════════════════════════════════════════
     READ OPERATIONS
     ══════════════════════════════════════════════════════════════════════════ */

  /* GET /recipes/:id — get recipe root fields */
  router.get("/:id", async (c) => {
    try {
      const id = c.req.param("id");
      const recipe = await services.recipe.getRecipe(id);
      if (!recipe) throw new NotFoundError("Recipe", id);
      return success(c, recipe);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /recipes/:id/detail — get recipe with all children */
  router.get("/:id/detail", async (c) => {
    try {
      const id = c.req.param("id");
      const user = getCurrentUser(c);
      const recipe = await services.recipe.getRecipeDetail(id, user.tenantId);
      if (!recipe) throw new NotFoundError("Recipe", id);
      return success(c, recipe);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /recipes/:id/versions — list version snapshots */
  router.get("/:id/versions", async (c) => {
    try {
      const id = c.req.param("id");
      const versions = await services.recipe.listVersions(id);
      return success(c, versions);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* GET /recipes/:id/versions/:version — get specific version snapshot */
  router.get("/:id/versions/:version", async (c) => {
    try {
      const id = c.req.param("id");
      const versionNumber = parseInt(c.req.param("version"), 10);
      if (isNaN(versionNumber) || versionNumber < 1) {
        throw new NotFoundError("Recipe version", c.req.param("version"));
      }
      const version = await services.recipe.getVersion(id, versionNumber);
      if (!version) {
        throw new NotFoundError(
          `Recipe ${id} version`,
          String(versionNumber),
        );
      }
      return success(c, version);
    } catch (err) {
      return sendError(c, err);
    }
  });

  /* ══════════════════════════════════════════════════════════════════════════
     WRITE OPERATIONS
     ══════════════════════════════════════════════════════════════════════════ */

  /* POST /recipes — create a new recipe */
  router.post(
    "/",
    zValidator("json", createRecipeSchema),
    async (c) => {
      try {
        const user = getCurrentUser(c);
        const data = c.req.valid("json");
        const { recipe } = await services.recipe.create({
          id: data.id,
          tenantId: user.tenantId,
          factoryId: user.factoryId,
          recipeCode: data.recipeCode,
          name: data.name,
          productType: data.productType,
          notes: data.notes,
          userId: user.sub,
        });
        return created(c, recipe);
      } catch (err) {
        if (err instanceof Error && err.message.includes("already exists")) {
          return sendError(c, new ConflictError(err.message));
        }
        return sendError(c, err);
      }
    },
  );

  /* PUT /recipes/:id — update recipe root fields */
  router.put(
    "/:id",
    zValidator("json", updateRecipeSchema),
    async (c) => {
      const id = c.req.param("id");
      try {
        const user = getCurrentUser(c);
        const data = c.req.valid("json");
        const { recipe } = await services.recipe.update(id, {
          ...data,
          userId: user.sub,
        });
        return success(c, recipe);
      } catch (err) {
        if (err instanceof Error && err.message.includes("not found")) {
          return sendError(c, new NotFoundError("Recipe", id));
        }
        if (err instanceof Error && err.message.includes("already exists")) {
          return sendError(c, new ConflictError(err.message));
        }
        return sendError(c, err);
      }
    },
  );

  /* POST /recipes/:id/clone — clone a recipe with a new code */
  router.post(
    "/:id/clone",
    zValidator("json", cloneRecipeSchema),
    async (c) => {
      const id = c.req.param("id");
      try {
        const user = getCurrentUser(c);
        const data = c.req.valid("json");
        const { recipe } = await services.recipe.cloneRecipe(
          id,
          data.newRecipeCode,
          {
            newId: data.newId,
            newName: data.newName,
            tenantId: user.tenantId,
            factoryId: user.factoryId,
            userId: user.sub,
          },
        );
        return created(c, recipe);
      } catch (err) {
        if (err instanceof Error && err.message.includes("not found")) {
          return sendError(c, new NotFoundError("Recipe", id));
        }
        if (err instanceof Error && err.message.includes("already exists")) {
          return sendError(c, new ConflictError(err.message));
        }
        return sendError(c, err);
      }
    },
  );

  /* POST /recipes/:id/version — create a new version */
  router.post(
    "/:id/version",
    zValidator("json", createVersionSchema),
    async (c) => {
      const id = c.req.param("id");
      try {
        const user = getCurrentUser(c);
        const data = c.req.valid("json");
        const { recipe } = await services.recipe.createNewVersion(id, {
          notes: data.notes,
          isActive: data.isActive,
          userId: user.sub,
        });
        return success(c, recipe);
      } catch (err) {
        if (err instanceof Error && err.message.includes("not found")) {
          return sendError(c, new NotFoundError("Recipe", id));
        }
        return sendError(c, err);
      }
    },
  );

  /* POST /recipes/:id/archive — archive (soft-deactivate) a recipe */
  router.post("/:id/archive", async (c) => {
    const id = c.req.param("id");
    try {
      const user = getCurrentUser(c);
      const { recipe } = await services.recipe.archive(id, user.sub);
      return success(c, recipe);
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return sendError(c, new NotFoundError("Recipe", id));
      }
      return sendError(c, err);
    }
  });

  /* POST /recipes/:id/restore — restore an archived recipe */
  router.post("/:id/restore", async (c) => {
    const id = c.req.param("id");
    try {
      const user = getCurrentUser(c);
      const { recipe } = await services.recipe.restore(id, user.sub);
      return success(c, recipe);
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return sendError(c, new NotFoundError("Recipe", id));
      }
      return sendError(c, err);
    }
  });

  return router;
}
