import { describe, expect, it } from "vitest";
import {
  createDatabaseClient,
  createDatabaseContext,
  createQueryState,
  defaultQueryState,
  mapDatabaseError,
  withTransaction,
  withTenantSession,
} from "../src/db/index.js";
import { relations } from "../src/db/relations.js";

describe("database infrastructure", () => {
  it("creates a database client from environment configuration", () => {
    const client = createDatabaseClient("postgres://postgres:postgres@localhost:5432/glassos");

    expect(client).toBeDefined();
  });

  it("exposes relation definitions for the implemented aggregates", () => {
    expect(relations).toBeDefined();
    expect(relations.tenants).toBeDefined();
    expect(relations.factories).toBeDefined();
    expect(relations.orders).toBeDefined();
    expect(relations.productionOrders).toBeDefined();
    expect(relations.reworkOrders).toBeDefined();
    expect(relations.auditLogs).toBeDefined();
  });

  it("supports transaction helpers with a shared context", async () => {
    const result = await withTransaction(async (tx) => {
      return await withTenantSession(
        async (sessionTx, context) => {
          expect(context.tenantId).toBe("tenant-1");
          expect(context.factoryId).toBe("factory-1");
          return { txReady: Boolean(sessionTx), tenant: context.tenantId };
        },
        { tenantId: "tenant-1", factoryId: "factory-1", userId: "user-1" },
        { db: { transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({}) } as never }
      );
    }, { db: { transaction: async (callback: (tx: unknown) => Promise<unknown>) => callback({}) } as never });

    expect(result).toEqual({ txReady: true, tenant: "tenant-1" });
  });

  it("creates a lightweight database context", () => {
    const context = createDatabaseContext({
      tenantId: "tenant-1",
      factoryId: "factory-1",
      userId: "user-1",
      requestId: "req-1",
    });

    expect(context).toEqual(
      expect.objectContaining({
        tenantId: "tenant-1",
        factoryId: "factory-1",
        userId: "user-1",
        requestId: "req-1",
      })
    );
  });

  it("builds normalized query state for pagination, sorting, and filtering", () => {
    const state = createQueryState({
      page: 2,
      pageSize: 25,
      sortBy: "created_at",
      sortOrder: "desc",
      tenantId: "tenant-1",
      factoryId: "factory-2",
      includeDeleted: false,
      search: "order",
    });

    expect(state).toEqual(
      expect.objectContaining({
        page: 2,
        pageSize: 25,
        offset: 25,
        sortBy: "created_at",
        sortOrder: "desc",
        tenantId: "tenant-1",
        factoryId: "factory-2",
        includeDeleted: false,
        search: "order",
      })
    );
  });

  it("returns the default query state when no options are supplied", () => {
    expect(defaultQueryState).toEqual(
      expect.objectContaining({
        page: 1,
        pageSize: 50,
        offset: 0,
        sortOrder: "asc",
        includeDeleted: false,
      })
    );
  });

  it("maps database errors to typed infrastructure errors", () => {
    const uniqueError = mapDatabaseError({ code: "23505", message: "duplicate key" });
    const fkError = mapDatabaseError({ code: "23503", message: "foreign key" });
    const timeoutError = mapDatabaseError({ code: "57014", message: "timeout" });

    expect(uniqueError).toBeInstanceOf(Error);
    expect(fkError).toBeInstanceOf(Error);
    expect(timeoutError).toBeInstanceOf(Error);
    expect(uniqueError.name).toBe("UniqueConstraintDatabaseError");
    expect(fkError.name).toBe("ForeignKeyDatabaseError");
    expect(timeoutError.name).toBe("TimeoutDatabaseError");
  });
});
