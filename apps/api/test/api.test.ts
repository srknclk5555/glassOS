import { describe, it, expect } from "vitest";
import { Hono } from "hono";

// ─── Smoke Tests ────────────────────────────────────────────────────────────
// These tests verify the API modules exist and export the expected symbols.

describe("API Module Structure", () => {
  it("should create Hono router without errors", () => {
    const router = new Hono();
    expect(router).toBeDefined();
    expect(typeof router.fetch).toBe("function");
  });

  it("should export controller factory functions", async () => {
    const mod = await import("../src/controllers/customer.controller.js");
    expect(typeof mod.createCustomerRouter).toBe("function");
  });

  it("should export all DTO modules", async () => {
    const customer = await import("../src/dto/customer.dto.js");
    const order = await import("../src/dto/order.dto.js");
    const production = await import("../src/dto/production.dto.js");
    const queue = await import("../src/dto/queue.dto.js");
    const transfer = await import("../src/dto/transfer.dto.js");
    const quality = await import("../src/dto/quality.dto.js");
    const dispatch = await import("../src/dto/dispatch.dto.js");
    const rework = await import("../src/dto/rework.dto.js");
    const cutting = await import("../src/dto/cutting.dto.js");
    const station = await import("../src/dto/station.dto.js");
    const common = await import("../src/dto/common.dto.js");

    expect(customer.createCustomerSchema).toBeDefined();
    expect(order.createOrderSchema).toBeDefined();
    expect(production.createProductionSchema).toBeDefined();
    expect(queue.createWorkQueueSchema).toBeDefined();
    expect(transfer.initiateTransferSchema).toBeDefined();
    expect(quality.startInspectionSchema).toBeDefined();
    expect(dispatch.createDispatchSchema).toBeDefined();
    expect(rework.createReworkSchema).toBeDefined();
    expect(cutting.createCuttingSessionSchema).toBeDefined();
    expect(station.startOperationSchema).toBeDefined();
    expect(common.ulid).toBeDefined();
  });

  it("should export library modules", async () => {
    const errors = await import("../src/lib/errors.js");
    const response = await import("../src/lib/response.js");
    const auth = await import("../src/lib/auth.js");

    expect(errors.AppError).toBeDefined();
    expect(errors.NotFoundError).toBeDefined();
    expect(response.success).toBeDefined();
    expect(response.sendError).toBeDefined();
    expect(auth.authMiddleware).toBeDefined();
  });

  it("should export router function", async () => {
    const mod = await import("../src/router.js");
    expect(typeof mod.createRouter).toBe("function");
  });
});
