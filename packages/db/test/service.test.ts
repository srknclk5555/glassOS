import { describe, expect, it, beforeEach } from "vitest";
import { is, Param, SQL } from "drizzle-orm";
import { CustomerService } from "../src/services/customer.service.js";
import { OrderService } from "../src/services/order.service.js";
import { ProductionService } from "../src/services/production.service.js";
import { ProductionQueueService } from "../src/services/production-queue.service.js";
import { ReworkService } from "../src/services/rework.service.js";
import { InMemoryEventPublisher } from "../src/events/index.js";
import { CuttingExecutionService } from "../src/services/cutting-execution.service.js";
import { ProductionTransferService } from "../src/services/production-transfer.service.js";
import { StationOperationService } from "../src/services/station-operation.service.js";
import { QualityControlService } from "../src/services/quality-control.service.js";
import { DispatchService } from "../src/services/dispatch.service.js";
import { CustomerRepository } from "../src/repositories/customer.repository.js";
import { OrderRepository } from "../src/repositories/order.repository.js";
import { OrderLineRepository } from "../src/repositories/order-line.repository.js";
import { ProductionRepository } from "../src/repositories/production.repository.js";
import { ProductionQueueRepository } from "../src/repositories/production-queue.repository.js";
import { ReworkRepository } from "../src/repositories/rework.repository.js";

// ─── In-Memory Fake Database ─────────────────────────────────────────────────
// Supports both repository-style access (table objects) and service-style
// direct access (table name strings for production_queue_items).

class FakeDb {
  // Per-table storage using Drizzle's table name (Symbol.for('drizzle:Name'))
  private tables: Map<string, Array<Record<string, unknown>>> = new Map();
  // Separate array for queue items (accessed via string "production_queue_items")
  public queueItems: Array<Record<string, unknown>> = [];

  private getTableRef(table: any): string {
    if (typeof table === "string") return table;
    if (table && typeof table === "object") {
      const drizzleName = table[Symbol.for("drizzle:Name")];
      if (typeof drizzleName === "string") return drizzleName;
    }
    return "__default__";
  }

  private getTable(table: any): Array<Record<string, unknown>> {
    const name = this.getTableRef(table);
    if (!this.tables.has(name)) {
      this.tables.set(name, []);
    }
    return this.tables.get(name)!;
  }

  select() {
    const self = this;
    const query: any = {
      from: (table?: any) => {
        const data = typeof table === "string" && table === "production_queue_items"
          ? self.queueItems
          : self.getTable(table);
        const q: any = {
          where: (condition: unknown) => {
            const predicate = self.extractWherePredicate(condition);
            // Mutate the current query's execute to filter data,
            // since selectMany calls query.where() then query.execute()
            // on the SAME query object (Drizzle mutates in-place).
            q.execute = async () => data.filter(predicate);
            // Also return a new builder to support method chaining
            const qq: any = {
              orderBy: () => {
                const qqq: any = {
                  limit: () => {
                    const qqqq: any = {
                      offset: () => {
                        const qqqqq: any = {
                          execute: async () => data.filter(predicate),
                        };
                        return qqqqq;
                      },
                      execute: async () => data.filter(predicate),
                    };
                    return qqqq;
                  },
                  execute: async () => data.filter(predicate),
                };
                return qqq;
              },
              execute: async () => data.filter(predicate),
            };
            return qq;
          },
          execute: async () => [...data],
        };
        return q;
      },
    };
    return query;
  }

  private extractWherePredicate(
    condition: unknown
  ): (row: Record<string, unknown>) => boolean {
    const params = this.collectParams(condition);
    const primitiveParams = params.filter(
      (p): p is string | number | boolean =>
        typeof p === "string" || typeof p === "number" || typeof p === "boolean"
    );
    if (primitiveParams.length === 0) return () => true;
    return (row: Record<string, unknown>) =>
      primitiveParams.every((param) =>
        Object.values(row).some((v) => String(v) === String(param))
      );
  }

  private collectParams(
    chunk: unknown,
    collected: unknown[] = []
  ): unknown[] {
    if (!chunk || typeof chunk !== "object") return collected;
    if (is(chunk, Param)) {
      collected.push((chunk as any).value);
    } else if (is(chunk, SQL)) {
      const sql = chunk as any;
      if (Array.isArray(sql.queryChunks)) {
        for (const subChunk of sql.queryChunks) {
          this.collectParams(subChunk, collected);
        }
      }
    }
    return collected;
  }

  insert(table: any) {
    const self = this;
    return {
      values: (values: Record<string, unknown>) => ({
        returning: () => ({
          execute: async () => {
            const row = {
              ...values,
              id: (values.id as string) ?? `gen-${Math.random().toString(36).slice(2, 10)}`,
            };
            if (typeof table === "string" && table === "production_queue_items") {
              self.queueItems.push(row);
            } else {
              self.getTable(table).push(row);
            }
            return [row];
          },
        }),
      }),
    };
  }

  update(table: any) {
    const self = this;
    const isQueueItems = typeof table === "string" && table === "production_queue_items";

    return {
      set: (values: Record<string, unknown>) => {
        const exec = async (filterId?: string) => {
          const id = (values.id as string) ?? filterId ?? "";
          const arr = isQueueItems ? self.queueItems : self.getTable(table);
          const index = arr.findIndex((row) => row.id === id);
          if (index >= 0) {
            arr[index] = { ...arr[index], ...values };
            return [arr[index]];
          }
          if (isQueueItems) {
            for (let i = 0; i < self.queueItems.length; i++) {
              if (filterId && self.queueItems[i].id === filterId) {
                self.queueItems[i] = { ...self.queueItems[i], ...values };
                return [self.queueItems[i]];
              }
            }
          }
          return [];
        };

        const builder: any = {
          where: (filter?: Record<string, unknown>) => {
            const filterId = (filter?.id as string) ?? "";
            const execFn = async () => exec(filterId || undefined);
            return {
              execute: execFn,
              returning: () => ({ execute: execFn }),
            };
          },
          returning: () => ({
            execute: async () => exec(),
          }),
        };
        return builder;
      },
    };
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createServices() {
  const db = new FakeDb();
  const customerRepository = new CustomerRepository(db as never);
  const orderRepository = new OrderRepository(db as never);
  const orderLineRepository = new OrderLineRepository(db as never);
  const productionRepository = new ProductionRepository(db as never);
  const productionQueueRepository = new ProductionQueueRepository(db as never);
  const reworkRepository = new ReworkRepository(db as never);
  const eventPublisher = new InMemoryEventPublisher();

  const customerService = new CustomerService(customerRepository, eventPublisher, db as never);
  const orderService = new OrderService(
    orderRepository,
    orderLineRepository,
    customerRepository,
    productionRepository,
    eventPublisher,
    db as never
  );
  const productionService = new ProductionService(productionRepository, eventPublisher, db as never);
  const productionQueueService = new ProductionQueueService(
    productionQueueRepository,
    productionRepository,
    orderRepository,
    orderLineRepository,
    eventPublisher,
    db as never
  );
  const reworkService = new ReworkService(
    reworkRepository,
    productionRepository,
    orderLineRepository,
    orderRepository,
    eventPublisher,
    db as never
  );
  const cuttingExecutionService = new CuttingExecutionService(
    productionRepository,
    orderLineRepository,
    orderRepository,
    productionQueueService,
    reworkService,
    eventPublisher,
    db as never
  );
  const productionTransferService = new ProductionTransferService(
    productionRepository,
    orderLineRepository,
    orderRepository,
    eventPublisher,
    db as never
  );
  const stationOperationService = new StationOperationService(
    productionRepository,
    orderLineRepository,
    orderRepository,
    eventPublisher,
    db as never
  );
  const qualityControlService = new QualityControlService(
    productionRepository,
    orderLineRepository,
    orderRepository,
    reworkRepository,
    eventPublisher,
    db as never
  );
  const dispatchService = new DispatchService(
    productionRepository,
    orderLineRepository,
    orderRepository,
    qualityControlService,
    eventPublisher,
    db as never
  );

  return {
    db,
    customerService,
    orderService,
    productionService,
    productionQueueService,
    reworkService,
    cuttingExecutionService,
    productionTransferService,
    stationOperationService,
    qualityControlService,
    dispatchService,
    customerRepository,
    orderRepository,
    orderLineRepository,
    productionRepository,
    productionQueueRepository,
    reworkRepository,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Sprint 2.5.0 — Core Production Service Layer", () => {
  let svc: ReturnType<typeof createServices>;

  beforeEach(() => {
    svc = createServices();
  });

  // ─── Customer Lifecycle ──────────────────────────────────────────────────

  describe("CustomerService", () => {
    it("creates a customer", async () => {
      const { customer } = await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        factoryId: "01FACTORY0000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        email: "contact@northglass.com",
        isActive: true,
      });

      expect(customer.name).toBe("North Glass Co");
      expect(customer.isActive).toBe(true);
    });

    it("updates a customer", async () => {
      const { customer: c } = await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
      });

      const { customer: updated } = await svc.customerService.update(c.id, { name: "North Glass Co Updated" });
      expect(updated.name).toBe("North Glass Co Updated");
    });

    it("deactivates a customer", async () => {
      const { customer: c } = await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      const { customer: deactivated } = await svc.customerService.deactivate(c.id);
      expect(deactivated.isActive).toBe(false);
    });

    it("validates customer existence", async () => {
      const exists = await svc.customerService.validateExists("nonexistent");
      expect(exists).toBe(false);

      const { customer: c } = await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      const valid = await svc.customerService.validateExists(c.id);
      expect(valid).toBe(true);
    });

    it("returns false for inactive customer on validateExists", async () => {
      const { customer: c } = await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await svc.customerService.deactivate(c.id);
      const valid = await svc.customerService.validateExists(c.id);
      expect(valid).toBe(false);
    });

    it("finds customer by id", async () => {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
      });

      const found = await svc.customerService.findById("01CUST000000000000000001");
      expect(found?.name).toBe("North Glass Co");
    });
  });

  // ─── Order Lifecycle ─────────────────────────────────────────────────────

  describe("OrderService", () => {
    it("creates an order in draft status", async () => {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      const order = await svc.orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        factoryId: "01FACTORY0000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });

      expect(order.status).toBe("draft");
      expect(order.orderNumber).toBe("ORD-2026-001");
    });

    it("rejects order creation with inactive customer", async () => {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await svc.customerService.deactivate("01CUST000000000000000001");

      await expect(
        svc.orderService.create({
          id: "01ORDER000000000000000001",
          tenantId: "01TENANT000000000000000001",
          customerId: "01CUST000000000000000001",
          orderNumber: "ORD-2026-001",
          orderDate: new Date("2026-07-16"),
        })
      ).rejects.toThrow(/customer is inactive/i);
    });

    it("approves an order with lines and creates production records", async () => {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await svc.orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        factoryId: "01FACTORY0000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });

      // Add order lines
      await svc.orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
        productType: "float",
      });

      // Approve
      const result = await svc.orderService.approveOrder("01ORDER000000000000000001");
      expect(result.order.status).toBe("confirmed");
      expect(result.lines).toHaveLength(1);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].eventType).toBe("order.approved");

      // Verify production records created
      const prods = await svc.productionRepository.findByOrderLine("01ORDLINE00000000000001");
      expect(prods).toHaveLength(1);
      expect(prods[0].currentOperation).toBe("cutting");
      expect(prods[0].currentStatus).toBe("pending");
    });

    it("rejects approving empty order", async () => {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await svc.orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });

      await expect(
        svc.orderService.approveOrder("01ORDER000000000000000001")
      ).rejects.toThrow(/empty order/i);
    });

    it("rejects approving cancelled order", async () => {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await svc.orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });

      await svc.orderService.cancelOrder("01ORDER000000000000000001");

      await expect(
        svc.orderService.approveOrder("01ORDER000000000000000001")
      ).rejects.toThrow(/cancelled/i);
    });

    it("rejects approving order with inactive customer", async () => {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await svc.orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });

      await svc.orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
      });

      // Deactivate customer
      await svc.customerService.deactivate("01CUST000000000000000001");

      await expect(
        svc.orderService.approveOrder("01ORDER000000000000000001")
      ).rejects.toThrow(/inactive/i);
    });

    it("cancels a draft order", async () => {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await svc.orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });

      const cancelled = await svc.orderService.cancelOrder("01ORDER000000000000000001");
      expect(cancelled.status).toBe("cancelled");
    });

    it("loads order lines", async () => {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await svc.orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });

      await svc.orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
      });

      const lines = await svc.orderService.loadOrderLines("01ORDER000000000000000001");
      expect(lines).toHaveLength(1);
    });

    it("validates an order", async () => {
      const result = await svc.orderService.validateOrder("nonexistent");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Order not found");
    });
  });

  // ─── Production Queue Lifecycle ──────────────────────────────────────────

  describe("ProductionQueueService", () => {
    it("creates a work queue", async () => {
      const result = await svc.productionQueueService.createWorkQueue({
        id: "01QUEUE00000000000000001",
        tenantId: "01TENANT000000000000000001",
        factoryId: "01FACTORY0000000000000001",
        stationId: "01STAT000000000000000001",
        operationCode: "cutting",
      });

      expect(result.queue.operationCode).toBe("cutting");
      expect(result.queue.isActive).toBe(true);
      expect(result.events).toHaveLength(1);
      expect(result.events[0].eventType).toBe("queue.created");
    });

    it("loads approved orders", async () => {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await svc.orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });

      await svc.orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
      });

      // Before approval — no approved orders
      let approved = await svc.productionQueueService.loadApprovedOrders({
        tenantId: "01TENANT000000000000000001",
      });
      expect(approved).toHaveLength(0);

      // Approve the order
      await svc.orderService.approveOrder("01ORDER000000000000000001");

      // After approval — order appears
      approved = await svc.productionQueueService.loadApprovedOrders({
        tenantId: "01TENANT000000000000000001",
      });
      expect(approved).toHaveLength(1);
    });

    it("filters order lines by material type", async () => {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await svc.orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });

      // Add lines with different product types
      await svc.orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
        productType: "float",
      });

      await svc.orderLineRepository.create({
        id: "01ORDLINE00000000000002",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000002",
        widthMm: 800,
        heightMm: 1600,
        quantity: 5,
        productType: "low_e",
      });

      await svc.orderService.approveOrder("01ORDER000000000000000001");

      const floatLines = await svc.productionQueueService.filterOrderLinesByMaterial("float", {
        tenantId: "01TENANT000000000000000001",
      });
      expect(floatLines).toHaveLength(1);
      expect(floatLines[0].id).toBe("01ORDLINE00000000000001");

      const lowELines = await svc.productionQueueService.filterOrderLinesByMaterial("low_e", {
        tenantId: "01TENANT000000000000000001",
      });
      expect(lowELines).toHaveLength(1);
    });

    it("adds order line (production order) to basket", async () => {
      const { db, customerService, orderService, orderLineRepository, productionRepository, productionQueueService } = svc;

      // Setup: customer, order, lines, approve
      await customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });

      await orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
        productType: "float",
      });

      await orderService.approveOrder("01ORDER000000000000000001");

      // Get production order created during approval
      const prods = await productionRepository.findByOrderLine("01ORDLINE00000000000001");
      expect(prods).toHaveLength(1);

      // Create queue
      const { queue } = await productionQueueService.createWorkQueue({
        id: "01QUEUE00000000000000001",
        tenantId: "01TENANT000000000000000001",
        stationId: "01STAT000000000000000001",
        operationCode: "cutting",
      });

      // Add production order to basket
      const item = await productionQueueService.addOrderLineToBasket(
        queue.id,
        prods[0].id
      );
      expect(item.queueId).toBe(queue.id);
      expect(item.productionOrderId).toBe(prods[0].id);
      expect(item.status).toBe("waiting");
    });

    it("prevents duplicate order line additions to basket", async () => {
      const { customerService, orderService, orderLineRepository, productionRepository, productionQueueService } = svc;

      await customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });

      await orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
      });

      await orderService.approveOrder("01ORDER000000000000000001");

      const prods = await productionRepository.findByOrderLine("01ORDLINE00000000000001");

      const { queue } = await productionQueueService.createWorkQueue({
        id: "01QUEUE00000000000000001",
        tenantId: "01TENANT000000000000000001",
        stationId: "01STAT000000000000000001",
        operationCode: "cutting",
      });

      // Add to basket — should succeed
      await productionQueueService.addOrderLineToBasket(queue.id, prods[0].id);

      // Add again — should fail (duplicate)
      await expect(
        productionQueueService.addOrderLineToBasket(queue.id, prods[0].id)
      ).rejects.toThrow(/duplicate|already in queue/i);
    });

    it("starts a queue with items", async () => {
      const { customerService, orderService, orderLineRepository, productionRepository, productionQueueService } = svc;

      await customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });

      await orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
      });

      await orderService.approveOrder("01ORDER000000000000000001");

      const prods = await productionRepository.findByOrderLine("01ORDLINE00000000000001");

      const { queue } = await productionQueueService.createWorkQueue({
        id: "01QUEUE00000000000000001",
        tenantId: "01TENANT000000000000000001",
        stationId: "01STAT000000000000000001",
        operationCode: "cutting",
      });

      await productionQueueService.addOrderLineToBasket(queue.id, prods[0].id);

      // Start queue
      const startResult = await productionQueueService.startQueue(queue.id);
      expect(startResult.events).toHaveLength(1);
      expect(startResult.events[0].eventType).toBe("queue.started");
      expect(startResult.events[0].itemCount).toBe(1);

      // Verify stats
      const stats = await productionQueueService.getQueueStatistics(queue.id);
      expect(stats.waiting).toBe(0);
      expect(stats.inProgress).toBe(1);
    });

    it("rejects starting empty queue", async () => {
      const { queue } = await svc.productionQueueService.createWorkQueue({
        id: "01QUEUE00000000000000001",
        tenantId: "01TENANT000000000000000001",
        stationId: "01STAT000000000000000001",
        operationCode: "cutting",
      });

      await expect(
        svc.productionQueueService.startQueue(queue.id)
      ).rejects.toThrow(/empty queue/i);
    });

    it("completes a started queue", async () => {
      const { customerService, orderService, orderLineRepository, productionRepository, productionQueueService } = svc;

      await customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });

      await orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
      });

      await orderService.approveOrder("01ORDER000000000000000001");

      const prods = await productionRepository.findByOrderLine("01ORDLINE00000000000001");

      const { queue } = await productionQueueService.createWorkQueue({
        id: "01QUEUE00000000000000001",
        tenantId: "01TENANT000000000000000001",
        stationId: "01STAT000000000000000001",
        operationCode: "cutting",
      });

      await productionQueueService.addOrderLineToBasket(queue.id, prods[0].id);
      await productionQueueService.startQueue(queue.id);

      // Complete queue
      const completeResult = await productionQueueService.completeQueue(queue.id);
      expect(completeResult.events).toHaveLength(1);
      expect(completeResult.events[0].eventType).toBe("queue.completed");

      // Verify production order status updated
      const updatedProd = await productionRepository.findById(prods[0].id);
      expect(updatedProd.currentStatus).toBe("completed");
      expect(updatedProd.completedAt).toBeDefined();
    });

    it("rejects completing queue that hasn't been started", async () => {
      const { customerService, orderService, orderLineRepository, productionRepository, productionQueueService } = svc;

      await customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });

      await orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });

      await orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
      });

      await orderService.approveOrder("01ORDER000000000000000001");

      const prods = await productionRepository.findByOrderLine("01ORDLINE00000000000001");

      const { queue } = await productionQueueService.createWorkQueue({
        id: "01QUEUE00000000000000001",
        tenantId: "01TENANT000000000000000001",
        stationId: "01STAT000000000000000001",
        operationCode: "cutting",
      });

      await productionQueueService.addOrderLineToBasket(queue.id, prods[0].id);

      // Try to complete without starting — should fail
      await expect(
        productionQueueService.completeQueue(queue.id)
      ).rejects.toThrow(/hasn't been started/i);
    });

    it("calculates queue statistics", async () => {
      const { queue } = await svc.productionQueueService.createWorkQueue({
        id: "01QUEUE00000000000000001",
        tenantId: "01TENANT000000000000000001",
        stationId: "01STAT000000000000000001",
        operationCode: "cutting",
      });

      const stats = await svc.productionQueueService.getQueueStatistics(queue.id);
      expect(stats.totalItems).toBe(0);
      expect(stats.waiting).toBe(0);
      expect(stats.inProgress).toBe(0);
      expect(stats.done).toBe(0);
    });
  });

  // ─── Production Service ──────────────────────────────────────────────────

  describe("ProductionService", () => {
    it("creates a production order", async () => {
      const prod = await svc.productionService.createProductionOrder({
        id: "01PROD000000000000000001",
        tenantId: "01TENANT000000000000000001",
        orderLineId: "01ORDLINE00000000000001",
        glassBarcode: "G-2026-001-1",
        widthMm: 1000,
        heightMm: 2000,
      });

      expect(prod.currentOperation).toBe("cutting");
      expect(prod.currentStatus).toBe("pending");
      expect(prod.isRework).toBe(false);
    });

    it("assigns production to station", async () => {
      await svc.productionService.createProductionOrder({
        id: "01PROD000000000000000001",
        tenantId: "01TENANT000000000000000001",
        orderLineId: "01ORDLINE00000000000001",
        glassBarcode: "G-2026-001-1",
        widthMm: 1000,
        heightMm: 2000,
      });

      const assigned = await svc.productionService.assignToStation(
        "01PROD000000000000000001",
        "01STAT000000000000000001"
      );

      expect(assigned.currentStationId).toBe("01STAT000000000000000001");
    });

    it("transfers production to another station", async () => {
      await svc.productionService.createProductionOrder({
        id: "01PROD000000000000000001",
        tenantId: "01TENANT000000000000000001",
        orderLineId: "01ORDLINE00000000000001",
        glassBarcode: "G-2026-001-1",
        widthMm: 1000,
        heightMm: 2000,
        currentStationId: "01STAT000000000000000001",
      });

      const result = await svc.productionService.transferProduction(
        "01PROD000000000000000001",
        "01STAT000000000000000002",
        "grinding"
      );

      expect(result.production.currentStationId).toBe("01STAT000000000000000002");
      expect(result.production.currentOperation).toBe("grinding");
      expect(result.events).toHaveLength(1);
      expect(result.events[0].eventType).toBe("production.transferred");
    });

    it("updates production status", async () => {
      await svc.productionService.createProductionOrder({
        id: "01PROD000000000000000001",
        tenantId: "01TENANT000000000000000001",
        orderLineId: "01ORDLINE00000000000001",
        glassBarcode: "G-2026-001-1",
        widthMm: 1000,
        heightMm: 2000,
      });

      const updated = await svc.productionService.updateStatus(
        "01PROD000000000000000001",
        "in_progress"
      );
      expect(updated.currentStatus).toBe("in_progress");

      const completed = await svc.productionService.updateStatus(
        "01PROD000000000000000001",
        "completed"
      );
      expect(completed.currentStatus).toBe("completed");
    });

    it("rejects invalid status transition", async () => {
      await svc.productionService.createProductionOrder({
        id: "01PROD000000000000000001",
        tenantId: "01TENANT000000000000000001",
        orderLineId: "01ORDLINE00000000000001",
        glassBarcode: "G-2026-001-1",
        widthMm: 1000,
        heightMm: 2000,
      });

      // pending → completed is invalid (must go through in_progress)
      await expect(
        svc.productionService.updateStatus("01PROD000000000000000001", "completed")
      ).rejects.toThrow(/invalid status transition/i);
    });

    it("validates production exists", async () => {
      const result = await svc.productionService.validateProduction("nonexistent");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Production order not found");
    });
  });

  // ─── Rework Service ─────────────────────────────────────────────────────

  describe("ReworkService", () => {
    it("creates rework order (foundation)", async () => {
      // First create a production order that will be the parent
      await svc.productionService.createProductionOrder({
        id: "01PROD000000000000000001",
        tenantId: "01TENANT000000000000000001",
        orderLineId: "01ORDLINE00000000000001",
        glassBarcode: "G-2026-001-1",
        widthMm: 1000,
        heightMm: 2000,
      });

      const result = await svc.reworkService.createReworkOrder({
        id: "01REWORK0000000000000001",
        tenantId: "01TENANT000000000000000001",
        parentProductionOrderId: "01PROD000000000000000001",
        reworkReason: "Breakage during grinding",
      });

      expect(result.reworkOrder.reworkStatus).toBe("pending");
      expect(result.events).toHaveLength(1);
      expect(result.events[0].eventType).toBe("rework.created");
    });

    it("rejects creating rework for missing parent", async () => {
      await expect(
        svc.reworkService.createReworkOrder({
          id: "01REWORK0000000000000001",
          tenantId: "01TENANT000000000000000001",
          parentProductionOrderId: "nonexistent",
          reworkReason: "Test",
        })
      ).rejects.toThrow(/parent production order not found/i);
    });
  });

  // ─── Vertical Slice — End-to-End Workflow ────────────────────────────────

  describe("Vertical Slice #1: Customer → Order → Approval → Cutting Queue", () => {
    it("executes the complete production workflow", async () => {
      const {
        customerService,
        orderService,
        orderLineRepository,
        productionRepository,
        productionQueueService,
      } = svc;

      // Step 1: Create Customer
      const { customer } = await customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        factoryId: "01FACTORY0000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });
      expect(customer.name).toBe("North Glass Co");

      // Step 2: Create Order
      const order = await orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        factoryId: "01FACTORY0000000000000001",
        customerId: customer.id,
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
        dueDate: new Date("2026-07-30"),
      });
      expect(order.status).toBe("draft");

      // Step 3: Add Order Lines
      await orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: order.id,
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
        productType: "float",
      });

      await orderLineRepository.create({
        id: "01ORDLINE00000000000002",
        orderId: order.id,
        productId: "01PROD000000000000000002",
        widthMm: 800,
        heightMm: 1600,
        quantity: 5,
        productType: "low_e",
      });

      const lines = await orderLineRepository.findByOrder(order.id);
      expect(lines).toHaveLength(2);

      // Step 4: Approve Order
      const approvalResult = await orderService.approveOrder(order.id, {
        userId: "01USER000000000000000001",
      });
      expect(approvalResult.order.status).toBe("confirmed");
      expect(approvalResult.events).toHaveLength(1);
      expect(approvalResult.lines).toHaveLength(2); // Two production orders created

      // Step 5: Order becomes available for Cutting
      const approvedOrders = await productionQueueService.loadApprovedOrders({
        tenantId: "01TENANT000000000000000001",
      });
      expect(approvedOrders).toHaveLength(1);
      expect(approvedOrders[0].id).toBe(order.id);

      // Step 6: Operator selects material
      const materialSelection = await productionQueueService.selectMaterial("float");
      expect(materialSelection.materialId).toBe("float");

      // Step 7: Matching order lines appear
      const floatLines = await productionQueueService.filterOrderLinesByMaterial("float", {
        tenantId: "01TENANT000000000000000001",
      });
      expect(floatLines).toHaveLength(1);
      expect(floatLines[0].id).toBe("01ORDLINE00000000000001");

      // Step 8: Operator creates work queue for Cutting station
      const { queue } = await productionQueueService.createWorkQueue({
        id: "01QUEUE00000000000000001",
        tenantId: "01TENANT000000000000000001",
        factoryId: "01FACTORY0000000000000001",
        stationId: "01STAT000000000000000001",
        operationCode: "cutting",
      });
      expect(queue.operationCode).toBe("cutting");

      // Step 9: Add production orders (from matching order line) to basket
      // Note: FakeDb doesn't apply orderLineId filter in BaseRepository,
      // so we filter in-memory to work around that limitation
      const allProds = await productionRepository.list();
      const prods = allProds.filter((p: any) => p.orderLineId === floatLines[0].id);
      expect(prods).toHaveLength(1);

      const basketItem = await productionQueueService.addOrderLineToBasket(
        queue.id,
        prods[0].id
      );
      expect(basketItem.status).toBe("waiting");

      // Step 10: Queue started
      const startResult = await productionQueueService.startQueue(queue.id);
      expect(startResult.events[0].eventType).toBe("queue.started");
      expect(startResult.events[0].itemCount).toBe(1);

      // Step 11: Queue completed
      const completeResult = await productionQueueService.completeQueue(queue.id);
      expect(completeResult.events[0].eventType).toBe("queue.completed");

      // Verify final state
      const stats = await productionQueueService.getQueueStatistics(queue.id);
      expect(stats.done).toBe(1);

      const updatedProd = await productionRepository.findById(prods[0].id);
      expect(updatedProd.currentStatus).toBe("completed");
    });
  });

  // ─── Sprint 2.5.1 — Cutting Execution & Breakage Workflow ────────────────

  describe("Sprint 2.5.1 — Cutting Execution & Breakage Workflow", () => {
    // ═══════════════════════════════════════════════════════════════════════
    // 1. Cutting Session Lifecycle
    // ═══════════════════════════════════════════════════════════════════════

    describe("CuttingExecutionService — Session Lifecycle", () => {
      it("creates a cutting session in CREATED status", async () => {
        const { session, events } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
          machineId: "01MACH000000000000000001",
          operatorId: "01USER000000000000000001",
          shift: "day",
        });

        expect(session.status).toBe("CREATED");
        expect(session.materialType).toBe("float");
        expect(session.basketItems).toEqual([]);
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe("cutting.session.created");
      });

      it("starts a cutting session (CREATED → CUTTING)", async () => {
        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });

        // Add an item to the basket first (required before start)
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
        });
        await svc.cuttingExecutionService.addItemToBasket(session.id, "01PROD0000000000000001");

        const { events } = await svc.cuttingExecutionService.startSession(session.id);
        expect(events[0].eventType).toBe("cutting.started");
        expect(events[0].itemCount).toBe(1);

        const stats = await svc.cuttingExecutionService.getSessionStatistics(session.id);
        expect(stats.status).toBe("CUTTING");
      });

      it("rejects starting an empty session", async () => {
        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });

        await expect(
          svc.cuttingExecutionService.startSession(session.id)
        ).rejects.toThrow(/empty cutting session/i);
      });

      it("completes a cutting session (CUTTING → COMPLETED)", async () => {
        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });

        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
        });
        await svc.cuttingExecutionService.addItemToBasket(session.id, "01PROD0000000000000001");
        await svc.cuttingExecutionService.startSession(session.id);

        const { events } = await svc.cuttingExecutionService.completeSession(session.id);
        expect(events[0].eventType).toBe("cutting.completed");
        expect(events[0].itemCount).toBe(1);

        const stats = await svc.cuttingExecutionService.getSessionStatistics(session.id);
        expect(stats.status).toBe("COMPLETED");
      });

      it("rejects completing a session that hasn't been started", async () => {
        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });

        await expect(
          svc.cuttingExecutionService.completeSession(session.id)
        ).rejects.toThrow(/Cannot complete session in status CREATED/i);
      });

      it("pauses and resumes a cutting session", async () => {
        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });

        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
        });
        await svc.cuttingExecutionService.addItemToBasket(session.id, "01PROD0000000000000001");
        await svc.cuttingExecutionService.startSession(session.id);

        // Pause
        const pauseResult = await svc.cuttingExecutionService.pauseSession(session.id);
        expect(pauseResult.events[0].eventType).toBe("cutting.paused");

        let stats = await svc.cuttingExecutionService.getSessionStatistics(session.id);
        expect(stats.status).toBe("PAUSED");

        // Resume
        const resumeResult = await svc.cuttingExecutionService.resumeSession(session.id);
        expect(resumeResult.events[0].eventType).toBe("cutting.resumed");

        stats = await svc.cuttingExecutionService.getSessionStatistics(session.id);
        expect(stats.status).toBe("CUTTING");
      });

      it("rejects pausing a completed session", async () => {
        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
        });
        await svc.cuttingExecutionService.addItemToBasket(session.id, "01PROD0000000000000001");
        await svc.cuttingExecutionService.startSession(session.id);
        await svc.cuttingExecutionService.completeSession(session.id);

        await expect(
          svc.cuttingExecutionService.pauseSession(session.id)
        ).rejects.toThrow(/Cannot pause completed session/i);
      });

      it("cancels a cutting session", async () => {
        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });

        const { events } = await svc.cuttingExecutionService.cancelSession(
          session.id,
          "Machine maintenance"
        );
        expect(events[0].eventType).toBe("cutting.cancelled");
        expect(events[0].reason).toBe("Machine maintenance");

        const stats = await svc.cuttingExecutionService.getSessionStatistics(session.id);
        expect(stats.status).toBe("CANCELLED");
      });

      it("rejects cancelling a completed session", async () => {
        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
        });
        await svc.cuttingExecutionService.addItemToBasket(session.id, "01PROD0000000000000001");
        await svc.cuttingExecutionService.startSession(session.id);
        await svc.cuttingExecutionService.completeSession(session.id);

        await expect(
          svc.cuttingExecutionService.cancelSession(session.id)
        ).rejects.toThrow(/Cannot cancel completed session/i);
      });

      it("lists sessions with optional filters", async () => {
        await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });
        await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000002",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000002",
          stationId: "01STAT000000000000000002",
          materialType: "low_e",
        });

        const all = await svc.cuttingExecutionService.listSessions();
        expect(all).toHaveLength(2);

        const filtered = await svc.cuttingExecutionService.listSessions({
          tenantId: "01TENANT000000000000000001",
        });
        expect(filtered).toHaveLength(2);

        const created = await svc.cuttingExecutionService.listSessions({
          status: "CREATED",
        });
        expect(created).toHaveLength(2);
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 2. Work Basket
    // ═══════════════════════════════════════════════════════════════════════

    describe("CuttingExecutionService — Work Basket", () => {
      it("adds a production order to the basket", async () => {
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
        });

        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });

        const result = await svc.cuttingExecutionService.addItemToBasket(
          session.id,
          "01PROD0000000000000001"
        );
        expect(result.status).toBe("added");

        const stats = await svc.cuttingExecutionService.getSessionStatistics(session.id);
        expect(stats.basketSize).toBe(1);
      });

      it("removes a production order from the basket", async () => {
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
        });

        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });

        await svc.cuttingExecutionService.addItemToBasket(session.id, "01PROD0000000000000001");
        let stats = await svc.cuttingExecutionService.getSessionStatistics(session.id);
        expect(stats.basketSize).toBe(1);

        await svc.cuttingExecutionService.removeItemFromBasket(session.id, "01PROD0000000000000001");
        stats = await svc.cuttingExecutionService.getSessionStatistics(session.id);
        expect(stats.basketSize).toBe(0);
      });

      it("rejects adding duplicate production order", async () => {
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
        });

        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });

        await svc.cuttingExecutionService.addItemToBasket(session.id, "01PROD0000000000000001");
        await expect(
          svc.cuttingExecutionService.addItemToBasket(session.id, "01PROD0000000000000001")
        ).rejects.toThrow(/already in basket/i);
      });

      it("rejects adding item after cutting starts", async () => {
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
        });
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000002",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-002",
          widthMm: 800,
          heightMm: 1600,
          productType: "float",
        });

        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });

        await svc.cuttingExecutionService.addItemToBasket(session.id, "01PROD0000000000000001");
        await svc.cuttingExecutionService.startSession(session.id);

        await expect(
          svc.cuttingExecutionService.addItemToBasket(session.id, "01PROD0000000000000002")
        ).rejects.toThrow(/Cannot add items after cutting has started/i);
      });

      it("rejects adding wrong material type to basket", async () => {
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "low_e",
        });

        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });

        await expect(
          svc.cuttingExecutionService.addItemToBasket(session.id, "01PROD0000000000000001")
        ).rejects.toThrow(/Material mismatch/i);
      });

      it("rejects adding different material type after first item", async () => {
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
        });
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000002",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000002",
          glassBarcode: "G-002",
          widthMm: 800,
          heightMm: 1600,
          productType: "low_e",
        });

        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });

        await svc.cuttingExecutionService.addItemToBasket(session.id, "01PROD0000000000000001");
        await expect(
          svc.cuttingExecutionService.addItemToBasket(session.id, "01PROD0000000000000002")
        ).rejects.toThrow(/Material mismatch/i);
      });

      it("loads work queue filtered by material type", async () => {
        // Setup: customer, order, lines, approve
        await svc.customerService.create({
          id: "01CUST000000000000000001",
          tenantId: "01TENANT000000000000000001",
          customerCode: "CUST-001",
          name: "North Glass Co",
          isActive: true,
        });
        await svc.orderService.create({
          id: "01ORDER000000000000000001",
          tenantId: "01TENANT000000000000000001",
          customerId: "01CUST000000000000000001",
          orderNumber: "ORD-2026-001",
          orderDate: new Date("2026-07-16"),
        });
        await svc.orderLineRepository.create({
          id: "01ORDLINE00000000000001",
          orderId: "01ORDER000000000000000001",
          productId: "01PROD000000000000000001",
          widthMm: 1000,
          heightMm: 2000,
          quantity: 10,
          productType: "float",
        });
        await svc.orderLineRepository.create({
          id: "01ORDLINE00000000000002",
          orderId: "01ORDER000000000000000001",
          productId: "01PROD000000000000000002",
          widthMm: 800,
          heightMm: 1600,
          quantity: 5,
          productType: "low_e",
        });
        await svc.orderService.approveOrder("01ORDER000000000000000001");

        const { session } = await svc.cuttingExecutionService.createSession({
          id: "01CUTSESSION0000000001",
          tenantId: "01TENANT000000000000000001",
          queueId: "01QUEUE00000000000000001",
          stationId: "01STAT000000000000000001",
          materialType: "float",
        });

        const workQueue = await svc.cuttingExecutionService.loadWorkQueue(session.id);
        expect(workQueue).toHaveLength(1);
        expect(workQueue[0].productType).toBe("float");
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 3. Breakage Registration
    // ═══════════════════════════════════════════════════════════════════════

    describe("CuttingExecutionService — Breakage Registration", () => {
      it("registers breakage and creates auto-rework with Fire Depot ownership", async () => {
        // Setup: create customer, order, order line, production order
        await svc.customerService.create({
          id: "01CUST000000000000000001",
          tenantId: "01TENANT000000000000000001",
          customerCode: "CUST-001",
          name: "North Glass Co",
          isActive: true,
        });
        await svc.orderService.create({
          id: "01ORDER000000000000000001",
          tenantId: "01TENANT000000000000000001",
          customerId: "01CUST000000000000000001",
          orderNumber: "ORD-2026-001",
          orderDate: new Date("2026-07-16"),
        });
        await svc.orderLineRepository.create({
          id: "01ORDLINE00000000000001",
          orderId: "01ORDER000000000000000001",
          productId: "01PROD000000000000000001",
          widthMm: 1000,
          heightMm: 2000,
          quantity: 10,
          completedQuantity: 5,
          productType: "float",
        });
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
          currentOperation: "cutting",
          currentStatus: "in_progress",
        });

        // Register breakage
        const result = await svc.cuttingExecutionService.registerBreakage({
          breakageId: "01BRK000000000000000001",
          tenantId: "01TENANT000000000000000001",
          productionOrderId: "01PROD0000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          orderId: "01ORDER000000000000000001",
          customerId: "01CUST000000000000000001",
          brokenQuantity: 2,
          reason: "Edge chipping during cutting",
          stationId: "01STAT000000000000000001",
          machineId: "01MACH000000000000000001",
          operatorId: "01USER000000000000000001",
          shift: "day",
          notes: "Operator reported chipping on bottom edge",
        });

        // Verify breakage event
        expect(result.breakageEvent.eventType).toBe("breakage.registered");
        expect(result.breakageEvent.brokenQuantity).toBe(2);
        expect(result.breakageEvent.reason).toBe("Edge chipping during cutting");

        // Verify rework creation
        expect(result.reworkResult.reworkOrder).toBeDefined();
        expect(result.reworkResult.reworkOrder.internalCustomer).toBe("fire_depot");
        expect(result.reworkResult.events).toHaveLength(2);
        expect(result.reworkResult.events[0].eventType).toBe("rework.created");
        expect(result.reworkResult.events[1].eventType).toBe("firedepot.assigned");

        // Verify production order status updated to broken
        const updatedProd = await svc.productionRepository.findById("01PROD0000000000000001");
        expect(updatedProd.currentStatus).toBe("broken");
      });

      it("updates order line counters on breakage", async () => {
        await svc.customerService.create({
          id: "01CUST000000000000000001",
          tenantId: "01TENANT000000000000000001",
          customerCode: "CUST-001",
          name: "North Glass Co",
          isActive: true,
        });
        await svc.orderService.create({
          id: "01ORDER000000000000000001",
          tenantId: "01TENANT000000000000000001",
          customerId: "01CUST000000000000000001",
          orderNumber: "ORD-2026-001",
          orderDate: new Date("2026-07-16"),
        });
        await svc.orderLineRepository.create({
          id: "01ORDLINE00000000000001",
          orderId: "01ORDER000000000000000001",
          productId: "01PROD000000000000000001",
          widthMm: 1000,
          heightMm: 2000,
          quantity: 10,
          completedQuantity: 5,
          brokenQuantity: 1,
          missingQuantity: 1,
          productType: "float",
        });
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
          currentStatus: "in_progress",
        });

        await svc.cuttingExecutionService.registerBreakage({
          breakageId: "01BRK000000000000000001",
          tenantId: "01TENANT000000000000000001",
          productionOrderId: "01PROD0000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          orderId: "01ORDER000000000000000001",
          customerId: "01CUST000000000000000001",
          brokenQuantity: 2,
          reason: "Test breakage",
          stationId: "01STAT000000000000000001",
        });

        // Verify counters updated correctly
        const counters = await svc.cuttingExecutionService.getOrderLineCounters("01ORDLINE00000000000001");
        expect(counters.brokenHistory).toBe(3); // 1 + 2
        expect(counters.missing).toBe(3); // 1 + 2
      });

      it("rejects breakage greater than completed quantity", async () => {
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
          currentStatus: "in_progress",
        });

        // Order line with completedQuantity = 0
        await svc.orderLineRepository.create({
          id: "01ORDLINE00000000000001",
          orderId: "01ORDER000000000000000001",
          productId: "01PROD000000000000000001",
          widthMm: 1000,
          heightMm: 2000,
          quantity: 10,
          completedQuantity: 0,
          productType: "float",
        });

        await expect(
          svc.cuttingExecutionService.registerBreakage({
            breakageId: "01BRK000000000000000001",
            tenantId: "01TENANT000000000000000001",
            productionOrderId: "01PROD0000000000000001",
            orderLineId: "01ORDLINE00000000000001",
            orderId: "01ORDER000000000000000001",
            customerId: "01CUST000000000000000001",
            brokenQuantity: 5,
            reason: "Test",
            stationId: "01STAT000000000000000001",
          })
        ).rejects.toThrow(/greater than completed quantity/i);
      });

      it("rejects duplicate active rework for same production order", async () => {
        await svc.customerService.create({
          id: "01CUST000000000000000001",
          tenantId: "01TENANT000000000000000001",
          customerCode: "CUST-001",
          name: "North Glass Co",
          isActive: true,
        });
        await svc.orderService.create({
          id: "01ORDER000000000000000001",
          tenantId: "01TENANT000000000000000001",
          customerId: "01CUST000000000000000001",
          orderNumber: "ORD-2026-001",
          orderDate: new Date("2026-07-16"),
        });
        await svc.orderLineRepository.create({
          id: "01ORDLINE00000000000001",
          orderId: "01ORDER000000000000000001",
          productId: "01PROD000000000000000001",
          widthMm: 1000,
          heightMm: 2000,
          quantity: 10,
          completedQuantity: 5,
          productType: "float",
        });
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
          currentStatus: "in_progress",
        });

        // First breakage — should succeed
        await svc.cuttingExecutionService.registerBreakage({
          breakageId: "01BRK000000000000000001",
          tenantId: "01TENANT000000000000000001",
          productionOrderId: "01PROD0000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          orderId: "01ORDER000000000000000001",
          customerId: "01CUST000000000000000001",
          brokenQuantity: 2,
          reason: "First breakage",
          stationId: "01STAT000000000000000001",
        });

        // Second breakage on same production order — should fail (duplicate active rework)
        await expect(
          svc.cuttingExecutionService.registerBreakage({
            breakageId: "01BRK000000000000000002",
            tenantId: "01TENANT000000000000000001",
            productionOrderId: "01PROD0000000000000001",
            orderLineId: "01ORDLINE00000000000001",
            orderId: "01ORDER000000000000000001",
            customerId: "01CUST000000000000000001",
            brokenQuantity: 1,
            reason: "Second breakage",
            stationId: "01STAT000000000000000001",
          })
        ).rejects.toThrow(/Active rework already exists/i);
      });

      it("rejects breakage on completed rework production order", async () => {
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
          currentStatus: "completed",
          isRework: true,
        });
        await svc.orderLineRepository.create({
          id: "01ORDLINE00000000000001",
          orderId: "01ORDER000000000000000001",
          productId: "01PROD000000000000000001",
          widthMm: 1000,
          heightMm: 2000,
          quantity: 10,
          completedQuantity: 5,
          productType: "float",
        });

        await expect(
          svc.cuttingExecutionService.registerBreakage({
            breakageId: "01BRK000000000000000001",
            tenantId: "01TENANT000000000000000001",
            productionOrderId: "01PROD0000000000000001",
            orderLineId: "01ORDLINE00000000000001",
            orderId: "01ORDER000000000000000001",
            customerId: "01CUST000000000000000001",
            brokenQuantity: 1,
            reason: "Test",
            stationId: "01STAT000000000000000001",
          })
        ).rejects.toThrow(/Cannot register breakage for completed rework/i);
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 4. Order Line Counters
    // ═══════════════════════════════════════════════════════════════════════

    describe("CuttingExecutionService — Order Line Counters", () => {
      it("returns accurate counters for an order line", async () => {
        await svc.orderLineRepository.create({
          id: "01ORDLINE00000000000001",
          orderId: "01ORDER000000000000000001",
          productId: "01PROD000000000000000001",
          widthMm: 1000,
          heightMm: 2000,
          quantity: 10,
          completedQuantity: 7,
          brokenQuantity: 2,
          missingQuantity: 2,
          deliveredQuantity: 5,
          productType: "float",
        });

        const counters = await svc.cuttingExecutionService.getOrderLineCounters(
          "01ORDLINE00000000000001"
        );

        expect(counters.requested).toBe(10);
        expect(counters.completed).toBe(7);
        expect(counters.brokenHistory).toBe(2);
        expect(counters.missing).toBe(2);
        expect(counters.delivered).toBe(5);
        expect(counters.progress).toBe(70); // 7/10 = 70%
      });

      it("returns zero counters for untouched order line", async () => {
        await svc.orderLineRepository.create({
          id: "01ORDLINE00000000000001",
          orderId: "01ORDER000000000000000001",
          productId: "01PROD000000000000000001",
          widthMm: 1000,
          heightMm: 2000,
          quantity: 10,
          productType: "float",
        });

        const counters = await svc.cuttingExecutionService.getOrderLineCounters(
          "01ORDLINE00000000000001"
        );

        expect(counters.requested).toBe(10);
        expect(counters.completed).toBe(0);
        expect(counters.brokenHistory).toBe(0);
        expect(counters.missing).toBe(0);
        expect(counters.delivered).toBe(0);
        expect(counters.progress).toBe(0);
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 5. Merge Preparation
    // ═══════════════════════════════════════════════════════════════════════

    describe("ReworkService — Merge Preparation", () => {
      it("returns merge preparation metadata for rework order", async () => {
        // Create customer (needed for order creation)
        await svc.customerService.create({
          id: "01CUST000000000000000001",
          tenantId: "01TENANT000000000000000001",
          customerCode: "CUST-001",
          name: "North Glass Co",
          isActive: true,
        });

        // Create order
        await svc.orderService.create({
          id: "01ORDER000000000000000001",
          tenantId: "01TENANT000000000000000001",
          customerId: "01CUST000000000000000001",
          orderNumber: "ORD-2026-001",
          orderDate: new Date("2026-07-16"),
        });

        // Create parent production order
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-001",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
          currentStatus: "in_progress",
        });

        // Create order line
        await svc.orderLineRepository.create({
          id: "01ORDLINE00000000000001",
          orderId: "01ORDER000000000000000001",
          productId: "01PROD000000000000000001",
          widthMm: 1000,
          heightMm: 2000,
          quantity: 10,
          completedQuantity: 5,
          productType: "float",
        });

        // Use createBreakageRework directly
        const { reworkOrder } = await svc.reworkService.createBreakageRework({
          id: "01REWORK0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          parentProductionOrderId: "01PROD0000000000000001",
          parentOrderId: "01ORDER000000000000000001",
          originalCustomerId: "01CUST000000000000000001",
          breakageEventId: "01BRK000000000000000001",
          brokenQuantity: 2,
          reason: "Edge chipping",
          stationId: "01STAT000000000000000001",
        });

        const mergePrep = await svc.reworkService.getMergePreparation(reworkOrder.id);
        expect(mergePrep).not.toBeNull();
        expect(mergePrep!.reworkOrderId).toBe("01REWORK0000000000000001");
        expect(mergePrep!.targetStationId).toBe("01STAT000000000000000001");
        expect(mergePrep!.isReadyToMerge).toBe(false);
      });

      it("returns null for non-existent rework order", async () => {
        const mergePrep = await svc.reworkService.getMergePreparation("nonexistent");
        expect(mergePrep).toBeNull();
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 6. Vertical Slice — Complete Breakage → Rework → Fire Depot
    // ═══════════════════════════════════════════════════════════════════════

    describe("Vertical Slice — Breakage → Rework → Fire Depot", () => {
      it("executes complete breakage workflow end-to-end", async () => {
        // Step 1: Create Customer
        await svc.customerService.create({
          id: "01CUST000000000000000001",
          tenantId: "01TENANT000000000000000001",
          factoryId: "01FACTORY0000000000000001",
          customerCode: "CUST-001",
          name: "North Glass Co",
          isActive: true,
        });

        // Step 2: Create Order
        await svc.orderService.create({
          id: "01ORDER000000000000000001",
          tenantId: "01TENANT000000000000000001",
          factoryId: "01FACTORY0000000000000001",
          customerId: "01CUST000000000000000001",
          orderNumber: "ORD-2026-001",
          orderDate: new Date("2026-07-16"),
        });

        // Step 3: Add Order Line with completed quantity
        await svc.orderLineRepository.create({
          id: "01ORDLINE00000000000001",
          orderId: "01ORDER000000000000000001",
          productId: "01PROD000000000000000001",
          widthMm: 1000,
          heightMm: 2000,
          quantity: 10,
          completedQuantity: 8,
          productType: "float",
        });

        // Step 4: Create Production Order (in progress)
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000001",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-2026-001-1",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
          currentOperation: "cutting",
          currentStationId: "01STAT000000000000000001",
          currentStatus: "in_progress",
        });

        // Step 5: Verify initial counters
        let counters = await svc.cuttingExecutionService.getOrderLineCounters("01ORDLINE00000000000001");
        expect(counters.requested).toBe(10);
        expect(counters.completed).toBe(8);
        expect(counters.brokenHistory).toBe(0);

        // Step 6: Register Breakage
        const breakageResult = await svc.cuttingExecutionService.registerBreakage({
          breakageId: "01BRK000000000000000001",
          tenantId: "01TENANT000000000000000001",
          productionOrderId: "01PROD0000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          orderId: "01ORDER000000000000000001",
          customerId: "01CUST000000000000000001",
          brokenQuantity: 3,
          reason: "Crack detected during cutting",
          stationId: "01STAT000000000000000001",
          shift: "day",
        });

        // Step 7: Verify breakage event
        expect(breakageResult.breakageEvent.eventType).toBe("breakage.registered");
        expect(breakageResult.breakageEvent.brokenQuantity).toBe(3);

        // Step 8: Verify rework created
        const reworkOrder = breakageResult.reworkResult.reworkOrder;
        expect(reworkOrder.internalCustomer).toBe("fire_depot");
        expect(reworkOrder.reworkStatus).toBe("pending");
        expect(reworkOrder.parentProductionOrderId).toBe("01PROD0000000000000001");
        expect(reworkOrder.orderLineId).toBe("01ORDLINE00000000000001");
        expect(reworkOrder.parentOrderId).toBe("01ORDER000000000000000001");
        expect(reworkOrder.originalCustomerId).toBe("01CUST000000000000000001");

        // Step 9: Verify events emitted
        const reworkEvents = breakageResult.reworkResult.events;
        expect(reworkEvents).toHaveLength(2);
        expect(reworkEvents[0].eventType).toBe("rework.created");
        expect(reworkEvents[1].eventType).toBe("firedepot.assigned");

        // Step 10: Verify Fire Depot assignment
        expect(reworkEvents[1].orderLineId).toBe("01ORDLINE00000000000001");
        expect(reworkEvents[1].brokenQuantity).toBe(3);

        // Step 11: Verify production order marked as broken
        const brokenProd = await svc.productionRepository.findById("01PROD0000000000000001");
        expect(brokenProd.currentStatus).toBe("broken");

        // Step 12: Verify counters updated
        counters = await svc.cuttingExecutionService.getOrderLineCounters("01ORDLINE00000000000001");
        expect(counters.brokenHistory).toBe(3);
        expect(counters.missing).toBe(3);
        expect(counters.completed).toBe(8); // Unchanged
        expect(counters.requested).toBe(10); // Unchanged

        // Step 13: Merge preparation available
        const mergePrep = await svc.reworkService.getMergePreparation(reworkOrder.id);
        expect(mergePrep).not.toBeNull();
        expect(mergePrep!.parentOrderId).toBe("01ORDER000000000000000001");
        expect(mergePrep!.parentOrderLineId).toBe("01ORDLINE00000000000001");
        expect(mergePrep!.originalCustomerId).toBe("01CUST000000000000000001");
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Sprint 2.5.2 — Production Transfer & Merge Workflow
  // ═══════════════════════════════════════════════════════════════════════════

  describe("Sprint 2.5.2 — Production Transfer & Merge Workflow", () => {
    // ─── Setup Helpers ──────────────────────────────────────────────────────

    async function createBaseOrderAndProduction() {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });
      await svc.orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });
      await svc.orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
        completedQuantity: 5,
        productType: "float",
      });
      await svc.productionService.createProductionOrder({
        id: "01PROD0000000000000001",
        tenantId: "01TENANT000000000000000001",
        orderLineId: "01ORDLINE00000000000001",
        glassBarcode: "G-001",
        widthMm: 1000,
        heightMm: 2000,
        productType: "float",
        currentStationId: "01STAT0000000000000001",
        currentStatus: "in_progress",
      });
    }

    // ═══════════════════════════════════════════════════════════════════════
    // 1. Transfer Initiation
    // ═══════════════════════════════════════════════════════════════════════

    describe("ProductionTransferService — Initiation", () => {
      it("initiates an automatic transfer between stations", async () => {
        await createBaseOrderAndProduction();

        const result = await svc.cuttingExecutionService; // Access via any for new service
        const { transfer, production, events } = await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000001",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "02STAT0000000000000002",
          transferType: "automatic",
        });

        expect(transfer.status).toBe("initiated");
        expect(transfer.fromStationId).toBe("01STAT0000000000000001");
        expect(transfer.toStationId).toBe("02STAT0000000000000002");
        expect(transfer.transferType).toBe("automatic");
        expect(production.currentStationId).toBe("02STAT0000000000000002");
        expect(events).toHaveLength(2);
        expect(events[0].eventType).toBe("transfer.initiated");
        expect(events[1].eventType).toBe("production.transferred");
      });

      it("initiates a manual transfer with operator context", async () => {
        await createBaseOrderAndProduction();
        const { transfer, events } = await svc.productionTransferService.manualTransfer({
          id: "01TRANSFER000000000002",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "02STAT0000000000000002",
          operatorId: "01OP000000000000000001",
          machineId: "01MACHINE00000000001",
          shift: "day",
          reason: "Production flow",
          notes: "Manual move",
        });

        expect(transfer.transferType).toBe("manual");
        expect(transfer.operatorId).toBe("01OP000000000000000001");
        expect(transfer.machineId).toBe("01MACHINE00000000001");
        expect(transfer.shift).toBe("day");
        expect(transfer.reason).toBe("Production flow");
        expect(transfer.notes).toBe("Manual move");
        expect(events[0].eventType).toBe("transfer.initiated");
      });

      it("initiates a return to previous station", async () => {
        await createBaseOrderAndProduction();
        const { transfer } = await svc.productionTransferService.returnToPreviousStation({
          id: "01TRANSFER000000000003",
          productionOrderId: "01PROD0000000000000001",
          targetStationId: "01STAT0000000000000001",
          reason: "Quality check failed",
        });

        expect(transfer.transferType).toBe("return_to_previous");
        expect(transfer.toStationId).toBe("01STAT0000000000000001");
      });

      it("assigns ready station", async () => {
        await createBaseOrderAndProduction();
        const { transfer, events } = await svc.productionTransferService.assignReadyStation({
          id: "01TRANSFER000000000004",
          productionOrderId: "01PROD0000000000000001",
          stationId: "01STAT0000000000000001",
        });

        expect(transfer.toStationId).toBe("01STAT0000000000000001");
        expect(events).toHaveLength(3);
        expect(events[2].eventType).toBe("ready.station.assigned");
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 2. Transfer Lifecycle
    // ═══════════════════════════════════════════════════════════════════════

    describe("ProductionTransferService — Lifecycle", () => {
      it("completes an initiated transfer", async () => {
        await createBaseOrderAndProduction();
        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000010",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "02STAT0000000000000002",
          transferType: "automatic",
        });

        const { transfer, events } = await svc.productionTransferService.completeTransfer("01TRANSFER000000000010");
        expect(transfer.status).toBe("completed");
        expect(transfer.completedAt).toBeInstanceOf(Date);
        expect(events[0].eventType).toBe("transfer.completed");
      });

      it("cancels an initiated transfer", async () => {
        await createBaseOrderAndProduction();
        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000011",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "02STAT0000000000000002",
          transferType: "manual",
        });

        const { transfer, events } = await svc.productionTransferService.cancelTransfer(
          "01TRANSFER000000000011",
          "Route changed"
        );
        expect(transfer.status).toBe("cancelled");
        expect(transfer.cancelReason).toBe("Route changed");
        expect(transfer.cancelledAt).toBeInstanceOf(Date);
        expect(events[0].eventType).toBe("transfer.cancelled");
      });

      it("rejects an initiated transfer", async () => {
        await createBaseOrderAndProduction();
        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000012",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "02STAT0000000000000002",
          transferType: "manual",
        });

        const { transfer, events } = await svc.productionTransferService.rejectTransfer(
          "01TRANSFER000000000012",
          "Station not ready"
        );
        expect(transfer.status).toBe("rejected");
        expect(transfer.rejectReason).toBe("Station not ready");
        expect(events[0].eventType).toBe("transfer.rejected");
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 3. Transfer Validation
    // ═══════════════════════════════════════════════════════════════════════

    describe("ProductionTransferService — Validation", () => {
      it("rejects transfer for non-existent production order", async () => {
        await expect(
          svc.productionTransferService.initiateTransfer({
            id: "01TRANSFER000000000020",
            productionOrderId: "nonexistent",
            toStationId: "02STAT0000000000000002",
            transferType: "automatic",
          })
        ).rejects.toThrow(/Production order not found/i);
      });

      it("rejects transfer with invalid target station", async () => {
        await createBaseOrderAndProduction();
        await expect(
          svc.productionTransferService.initiateTransfer({
            id: "01TRANSFER000000000021",
            productionOrderId: "01PROD0000000000000001",
            toStationId: "",
            transferType: "automatic",
          })
        ).rejects.toThrow(/Invalid target station/i);
      });

      it("rejects transfer for completed production order", async () => {
        await createBaseOrderAndProduction();
        await svc.productionService.updateStatus("01PROD0000000000000001", "completed");

        await expect(
          svc.productionTransferService.initiateTransfer({
            id: "01TRANSFER000000000022",
            productionOrderId: "01PROD0000000000000001",
            toStationId: "02STAT0000000000000002",
            transferType: "automatic",
          })
        ).rejects.toThrow(/Cannot transfer completed/i);
      });

      it("rejects transfer for cancelled production order", async () => {
        await createBaseOrderAndProduction();
        // Use repository directly to bypass status transition validation
        await svc.productionRepository.update("01PROD0000000000000001", {
          currentStatus: "cancelled",
        });

        await expect(
          svc.productionTransferService.initiateTransfer({
            id: "01TRANSFER000000000023",
            productionOrderId: "01PROD0000000000000001",
            toStationId: "02STAT0000000000000002",
            transferType: "automatic",
          })
        ).rejects.toThrow(/Cannot transfer cancelled/i);
      });

      it("rejects completing non-existent transfer", async () => {
        await expect(
          svc.productionTransferService.completeTransfer("nonexistent")
        ).rejects.toThrow(/Transfer not found/i);
      });

      it("rejects cancelling already completed transfer", async () => {
        await createBaseOrderAndProduction();
        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000024",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "02STAT0000000000000002",
          transferType: "automatic",
        });
        await svc.productionTransferService.completeTransfer("01TRANSFER000000000024");

        await expect(
          svc.productionTransferService.cancelTransfer("01TRANSFER000000000024")
        ).rejects.toThrow(/Cannot cancel transfer in status/i);
      });

      it("rejects rejecting already cancelled transfer", async () => {
        await createBaseOrderAndProduction();
        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000025",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "02STAT0000000000000002",
          transferType: "automatic",
        });
        await svc.productionTransferService.cancelTransfer("01TRANSFER000000000025");

        await expect(
          svc.productionTransferService.rejectTransfer("01TRANSFER000000000025")
        ).rejects.toThrow(/Cannot reject transfer in status/i);
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 4. Transfer History & Statistics
    // ═══════════════════════════════════════════════════════════════════════

    describe("ProductionTransferService — History & Statistics", () => {
      it("returns transfer history for a production order", async () => {
        await createBaseOrderAndProduction();
        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000030",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "02STAT0000000000000002",
          transferType: "automatic",
        });

        const history = svc.productionTransferService.getTransferHistory("01PROD0000000000000001");
        expect(history).toHaveLength(1);
        expect(history[0].id).toBe("01TRANSFER000000000030");
      });

      it("returns empty history for production without transfers", async () => {
        const history = svc.productionTransferService.getTransferHistory("nonexistent");
        expect(history).toHaveLength(0);
      });

      it("returns immutable transfer records", async () => {
        await createBaseOrderAndProduction();
        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000031",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "02STAT0000000000000002",
          transferType: "automatic",
        });

        const history = svc.productionTransferService.getTransferHistory("01PROD0000000000000001");
        const originalStatus = history[0].status;

        // Try to mutate the returned record (should not affect internal state)
        (history[0] as any).status = "completed";

        const historyAgain = svc.productionTransferService.getTransferHistory("01PROD0000000000000001");
        expect(historyAgain[0].status).toBe(originalStatus);
      });

      it("returns transfer statistics", async () => {
        await createBaseOrderAndProduction();

        // Create multiple transfers
        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000032",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "02STAT0000000000000002",
          transferType: "automatic",
        });
        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000033",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "03STAT0000000000000003",
          transferType: "manual",
        });

        const stats = svc.productionTransferService.getTransferStats();
        expect(stats.totalTransfers).toBe(2);
        expect(stats.byType.automatic).toBe(1);
        expect(stats.byType.manual).toBe(1);
        expect(stats.byStatus.initiated).toBe(2);
        expect(stats.byStation["02STAT0000000000000002"]).toBe(1);
        expect(stats.byStation["03STAT0000000000000003"]).toBe(1);
      });

      it("finds transfer by ID", async () => {
        await createBaseOrderAndProduction();

        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000034",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "02STAT0000000000000002",
          transferType: "manual",
        });

        const found = svc.productionTransferService.findTransferById("01TRANSFER000000000034");
        expect(found).toBeDefined();
        expect(found!.productionOrderId).toBe("01PROD0000000000000001");
      });

      it("returns undefined for non-existent transfer ID", async () => {
        const found = svc.productionTransferService.findTransferById("nonexistent");
        expect(found).toBeUndefined();
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 5. Rework Merge — Successful Merge
    // ═══════════════════════════════════════════════════════════════════════

    describe("ReworkService — Merge Workflow", () => {
      it("merges completed rework back to parent successfully", async () => {
        await createBaseOrderAndProduction();

        // Set explicit broken quantity on the order line
        await svc.orderLineRepository.update("01ORDLINE00000000000001", {
          brokenQuantity: 0,
        });

        // Create a breakage-driven rework
        const { reworkOrder } = await svc.reworkService.createBreakageRework({
          id: "01REWORK0000000000001",
          tenantId: "01TENANT000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          parentProductionOrderId: "01PROD0000000000000001",
          parentOrderId: "01ORDER000000000000000001",
          originalCustomerId: "01CUST000000000000000001",
          breakageEventId: "01BRK000000000000000001",
          brokenQuantity: 2,
          reason: "Edge chipping",
          stationId: "01STAT0000000000000001",
        });

        // Verify order line counters before merge
        let orderLine = await svc.orderLineRepository.findById("01ORDLINE00000000000001");
        expect(orderLine.completedQuantity).toBe(5);
        expect(orderLine.brokenQuantity).toBe(0);

        // Merge the rework
        const { reworkOrder: mergedOrder, events } = await svc.reworkService.mergeRework(
          reworkOrder.id
        );

        // Check rework status
        expect(mergedOrder.reworkStatus).toBe("completed");

        // Check events
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe("rework.merged");
        expect(events[0].reworkOrderId).toBe(reworkOrder.id);
        expect(events[0].completedIncrease).toBe(1); // default 1

        // Check counters updated
        orderLine = await svc.orderLineRepository.findById("01ORDLINE00000000000001");
        expect(orderLine.completedQuantity).toBe(6); // 5 + 1

        // brokenQuantity must remain unchanged
        expect(orderLine.brokenQuantity).toBe(0);
      });

      it("merges with custom completed quantity", async () => {
        await createBaseOrderAndProduction();

        const { reworkOrder } = await svc.reworkService.createBreakageRework({
          id: "01REWORK0000000000002",
          tenantId: "01TENANT000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          parentProductionOrderId: "01PROD0000000000000001",
          parentOrderId: "01ORDER000000000000000001",
          originalCustomerId: "01CUST000000000000000001",
          breakageEventId: "01BRK000000000000000002",
          brokenQuantity: 3,
          reason: "Scratch",
          stationId: "01STAT0000000000000001",
        });

        const { events } = await svc.reworkService.mergeRework(reworkOrder.id, {
          completedQuantity: 3,
        });

        expect(events[0].completedIncrease).toBe(3);

        const orderLine = await svc.orderLineRepository.findById("01ORDLINE00000000000001");
        expect(orderLine.completedQuantity).toBe(8); // 5 + 3
      });

      it("caps completed quantity at remaining missing quantity", async () => {
        await createBaseOrderAndProduction();

        const { reworkOrder } = await svc.reworkService.createBreakageRework({
          id: "01REWORK0000000000003",
          tenantId: "01TENANT000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          parentProductionOrderId: "01PROD0000000000000001",
          parentOrderId: "01ORDER000000000000000001",
          originalCustomerId: "01CUST000000000000000001",
          breakageEventId: "01BRK000000000000000003",
          brokenQuantity: 2,
          reason: "Chipping",
          stationId: "01STAT0000000000000001",
        });

        // Try to merge with quantity larger than missing (missing = 10 - 5 = 5)
        const { events } = await svc.reworkService.mergeRework(reworkOrder.id, {
          completedQuantity: 10,
        });

        // Should cap at 5 (remaining missing)
        expect(events[0].completedIncrease).toBe(5);

        const orderLine = await svc.orderLineRepository.findById("01ORDLINE00000000000001");
        expect(orderLine.completedQuantity).toBe(10); // 5 + 5 (capped)
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 6. Merge Validation — 6 Prevent Rules
    // ═══════════════════════════════════════════════════════════════════════

    describe("ReworkService — Merge Validation", () => {
      it("rejects merge for non-existent rework order", async () => {
        await expect(
          svc.reworkService.mergeRework("nonexistent")
        ).rejects.toThrow(/Rework order not found/i);
      });

      it("rejects merge when parent production not found", async () => {
        // Create a rework that references a non-existent production
        await svc.customerService.create({
          id: "01CUST000000000000000001",
          tenantId: "01TENANT000000000000001",
          customerCode: "CUST-001",
          name: "North Glass Co",
          isActive: true,
        });
        await svc.orderService.create({
          id: "01ORDER000000000000000001",
          tenantId: "01TENANT000000000000001",
          customerId: "01CUST000000000000000001",
          orderNumber: "ORD-2026-001",
          orderDate: new Date("2026-07-16"),
        });

        // Directly create a rework via repository to bypass validation
        await svc.reworkRepository.create({
          id: "01REWORK0000000000010",
          tenantId: "01TENANT000000000000001",
          parentProductionOrderId: "nonexistent-prod",
          breakageEventId: "01BRK0000000000000010",
          reworkReason: "Test",
          reworkStatus: "pending",
        });

        await expect(
          svc.reworkService.mergeRework("01REWORK0000000000010")
        ).rejects.toThrow(/Parent production order not found/i);
      });

      it("rejects merge when order line not found", async () => {
        await createBaseOrderAndProduction();

        // Create a rework with non-existent order line reference
        const rework = await svc.reworkRepository.create({
          id: "01REWORK0000000000011",
          tenantId: "01TENANT000000000000001",
          parentProductionOrderId: "01PROD0000000000000001",
          orderLineId: "nonexistent-line",
          breakageEventId: "01BRK0000000000000011",
          reworkReason: "Test",
          reworkStatus: "pending",
        });

        await expect(
          svc.reworkService.mergeRework(rework.id)
        ).rejects.toThrow(/Order line not found/i);
      });

      it("rejects merge for already completed rework (no duplicate merge)", async () => {
        await createBaseOrderAndProduction();

        const { reworkOrder } = await svc.reworkService.createBreakageRework({
          id: "01REWORK0000000000012",
          tenantId: "01TENANT000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          parentProductionOrderId: "01PROD0000000000000001",
          parentOrderId: "01ORDER000000000000000001",
          originalCustomerId: "01CUST000000000000000001",
          breakageEventId: "01BRK0000000000000012",
          brokenQuantity: 2,
          reason: "Edge chip",
          stationId: "01STAT0000000000000001",
        });

        // First merge succeeds
        await svc.reworkService.mergeRework(reworkOrder.id);

        // Second merge should fail (duplicate)
        await expect(
          svc.reworkService.mergeRework(reworkOrder.id)
        ).rejects.toThrow(/already completed/i);
      });

      it("rejects merge when parent production is cancelled", async () => {
        await createBaseOrderAndProduction();

        const { reworkOrder } = await svc.reworkService.createBreakageRework({
          id: "01REWORK0000000000013",
          tenantId: "01TENANT000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          parentProductionOrderId: "01PROD0000000000000001",
          parentOrderId: "01ORDER000000000000000001",
          originalCustomerId: "01CUST000000000000000001",
          breakageEventId: "01BRK0000000000000013",
          brokenQuantity: 2,
          reason: "Defect",
          stationId: "01STAT0000000000000001",
        });

        // Cancel parent production via repository to bypass status validation
        await svc.productionRepository.update("01PROD0000000000000001", {
          currentStatus: "cancelled",
        });

        await expect(
          svc.reworkService.mergeRework(reworkOrder.id)
        ).rejects.toThrow(/parent production is cancelled/i);
      });

      it("rejects merge when order line is fully completed (missing = 0)", async () => {
        await createBaseOrderAndProduction();

        // Create an order line that is already fully completed
        // We need a separate line for this
        await svc.orderLineRepository.create({
          id: "01ORDLINE00000000000002",
          orderId: "01ORDER000000000000000001",
          productId: "01PROD000000000000000001",
          widthMm: 500,
          heightMm: 1000,
          quantity: 10,
          completedQuantity: 10, // Fully completed
          productType: "float",
        });

        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000002",
          tenantId: "01TENANT000000000000001",
          orderLineId: "01ORDLINE00000000000002",
          glassBarcode: "G-002",
          widthMm: 500,
          heightMm: 1000,
          productType: "float",
          currentStationId: "01STAT0000000000000001",
          currentStatus: "in_progress",
        });

        const { reworkOrder } = await svc.reworkService.createBreakageRework({
          id: "01REWORK0000000000014",
          tenantId: "01TENANT000000000000001",
          orderLineId: "01ORDLINE00000000000002",
          parentProductionOrderId: "01PROD0000000000000002",
          parentOrderId: "01ORDER000000000000000001",
          originalCustomerId: "01CUST000000000000000001",
          breakageEventId: "01BRK0000000000000014",
          brokenQuantity: 2,
          reason: "Broken",
          stationId: "01STAT0000000000000001",
        });

        await expect(
          svc.reworkService.mergeRework(reworkOrder.id)
        ).rejects.toThrow(/already fully completed/i);
      });

      it("rejects merge when unresolved active rework exists", async () => {
        await createBaseOrderAndProduction();

        // Create first rework via repository (bypass duplicate validation)
        await svc.reworkRepository.create({
          id: "01REWORK0000000000015",
          tenantId: "01TENANT000000000000001",
          parentProductionOrderId: "01PROD0000000000000001",
          breakageEventId: "01BRK0000000000000015",
          reworkReason: "First break",
          reworkStatus: "pending",
          parentOrderId: "01ORDER000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          originalCustomerId: "01CUST000000000000000001",
          stationId: "01STAT0000000000000001",
        });

        // Create second rework via repository
        await svc.reworkRepository.create({
          id: "01REWORK0000000000016",
          tenantId: "01TENANT000000000000001",
          parentProductionOrderId: "01PROD0000000000000001",
          breakageEventId: "01BRK0000000000000016",
          reworkReason: "Second break",
          reworkStatus: "pending",
          parentOrderId: "01ORDER000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          originalCustomerId: "01CUST000000000000000001",
          stationId: "01STAT0000000000000001",
        });

        // Try to merge second rework while first is still pending
        await expect(
          svc.reworkService.mergeRework("01REWORK0000000000016")
        ).rejects.toThrow(/unresolved active rework/i);
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 7. Counter Invariants After Merge
    // ═══════════════════════════════════════════════════════════════════════

    describe("ReworkService — Counter Invariants", () => {
      it("preserves broken quantity unchanged after merge", async () => {
        await createBaseOrderAndProduction();

        // Set broken quantity on order line
        await svc.orderLineRepository.update("01ORDLINE00000000000001", {
          brokenQuantity: 3,
        });

        const { reworkOrder } = await svc.reworkService.createBreakageRework({
          id: "01REWORK0000000000020",
          tenantId: "01TENANT000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          parentProductionOrderId: "01PROD0000000000000001",
          parentOrderId: "01ORDER000000000000000001",
          originalCustomerId: "01CUST000000000000000001",
          breakageEventId: "01BRK0000000000000020",
          brokenQuantity: 2,
          reason: "Test",
          stationId: "01STAT0000000000000001",
        });

        await svc.reworkService.mergeRework(reworkOrder.id);

        const orderLine = await svc.orderLineRepository.findById("01ORDLINE00000000000001");
        expect(orderLine.brokenQuantity).toBe(3); // Unchanged
      });

      it("correctly calculates missing after merge (missing = quantity - completed)", async () => {
        await createBaseOrderAndProduction();

        const { reworkOrder } = await svc.reworkService.createBreakageRework({
          id: "01REWORK0000000000021",
          tenantId: "01TENANT000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          parentProductionOrderId: "01PROD0000000000000001",
          parentOrderId: "01ORDER000000000000000001",
          originalCustomerId: "01CUST000000000000000001",
          breakageEventId: "01BRK0000000000000021",
          brokenQuantity: 2,
          reason: "Test",
          stationId: "01STAT0000000000000001",
        });

        await svc.reworkService.mergeRework(reworkOrder.id, { completedQuantity: 3 });

        const orderLine = await svc.orderLineRepository.findById("01ORDLINE00000000000001");
        // completed: 5 + 3 = 8, missing: 10 - 8 = 2
        expect(orderLine.completedQuantity).toBe(8);
        const missing = Number(orderLine.quantity) - Number(orderLine.completedQuantity);
        expect(missing).toBe(2);
      });
    });

    // ═══════════════════════════════════════════════════════════════════════
    // 8. Transfer Statistics After Lifecycle Changes
    // ═══════════════════════════════════════════════════════════════════════

    describe("ProductionTransferService — Statistics After Lifecycle", () => {
      it("updates statistics correctly after completing transfers", async () => {
        await createBaseOrderAndProduction();

        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000040",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "02STAT0000000000000002",
          transferType: "automatic",
        });
        await svc.productionTransferService.completeTransfer("01TRANSFER000000000040");

        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000041",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "03STAT0000000000000003",
          transferType: "manual",
        });
        await svc.productionTransferService.cancelTransfer("01TRANSFER000000000041");

        const stats = svc.productionTransferService.getTransferStats();
        expect(stats.totalTransfers).toBe(2);
        expect(stats.byStatus.completed).toBe(1);
        expect(stats.byStatus.cancelled).toBe(1);
        expect(stats.byStatus.initiated).toBe(0);
      });

      it("filters transfers by type", async () => {
        await createBaseOrderAndProduction();

        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000042",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "02STAT0000000000000002",
          transferType: "automatic",
        });
        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000043",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "03STAT0000000000000003",
          transferType: "manual",
        });

        const manualTransfers = svc.productionTransferService.getAllTransfers({ transferType: "manual" });
        expect(manualTransfers).toHaveLength(1);
        expect(manualTransfers[0].id).toBe("01TRANSFER000000000043");
      });

      it("filters transfers by status", async () => {
        await createBaseOrderAndProduction();

        await svc.productionTransferService.initiateTransfer({
          id: "01TRANSFER000000000044",
          productionOrderId: "01PROD0000000000000001",
          toStationId: "02STAT0000000000000002",
          transferType: "automatic",
        });
        await svc.productionTransferService.completeTransfer("01TRANSFER000000000044");

        const initiatedTransfers = svc.productionTransferService.getAllTransfers({ status: "initiated" });
        expect(initiatedTransfers).toHaveLength(0);

        const completedTransfers = svc.productionTransferService.getAllTransfers({ status: "completed" });
        expect(completedTransfers).toHaveLength(1);
      });
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Sprint 2.5.3 — Station Operation Engine
  // ═════════════════════════════════════════════════════════════════════════

  describe("Sprint 2.5.3 — Station Operation Engine", () => {
    // ─── Helpers ───────────────────────────────────────────────────────────
    async function createBaseOrderAndProduction() {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });
      await svc.orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });
      await svc.orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
        completedQuantity: 5,
        productType: "float",
      });
      await svc.productionService.createProductionOrder({
        id: "01PROD0000000000000001",
        tenantId: "01TENANT000000000000000001",
        orderLineId: "01ORDLINE00000000000001",
        glassBarcode: "G-001",
        widthMm: 1000,
        heightMm: 2000,
        productType: "float",
        currentStationId: "STATION_CUTTING",
        currentStatus: "in_progress",
      });
    }

    async function createProductionAtCutting() {
      await createBaseOrderAndProduction();
      // Transfer from cutting to have proper chain
      await svc.productionTransferService.initiateTransfer({
        id: "01TRANSFER000000000100",
        productionOrderId: "01PROD0000000000000001",
        toStationId: "STATION_CUTTING",
        transferType: "automatic",
      });
    }

    // 1. Grinding Lifecycle
    // ═══════════════════════════════════════════════════════════════════════

    describe("Grinding — Lifecycle", () => {
      it("starts a grinding operation", async () => {
        await createProductionAtCutting();

        const { operation, production, events } = await svc.stationOperationService.startOperation({
          id: "01OP_GRIND_001",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
          operatorId: "01OP000000000000000001",
          machineId: "01MACHINE00000000001",
          shift: "day",
        });

        expect(operation.operationType).toBe("started");
        expect(operation.stationId).toBe("STATION_GRINDING");
        expect(operation.productionOrderId).toBe("01PROD0000000000000001");
        expect(operation.operatorId).toBe("01OP000000000000000001");
        expect(production.currentStationId).toBe("STATION_GRINDING");
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe("grinding.started");
      });

      it("completes a grinding operation", async () => {
        await createProductionAtCutting();
        await svc.stationOperationService.startOperation({
          id: "01OP_GRIND_002",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });

        const { operation, events } = await svc.stationOperationService.completeOperation({
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });

        expect(operation.operationType).toBe("completed");
        expect(operation.stationId).toBe("STATION_GRINDING");
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe("grinding.completed");
      });

      it("cancels a grinding operation", async () => {
        await createProductionAtCutting();
        await svc.stationOperationService.startOperation({
          id: "01OP_GRIND_003",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });

        const { operation } = await svc.stationOperationService.cancelOperation(
          "01PROD0000000000000001",
          "STATION_GRINDING",
          "Machine malfunction"
        );

        expect(operation.operationType).toBe("cancelled");
        expect(operation.reason).toBe("Machine malfunction");
      });

      it("rejects a grinding operation", async () => {
        await createProductionAtCutting();
        await svc.stationOperationService.startOperation({
          id: "01OP_GRIND_004",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });

        const { operation } = await svc.stationOperationService.rejectOperation({
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
          reason: "Quality check failed during grinding",
        });

        expect(operation.operationType).toBe("rejected");
        expect(operation.reason).toContain("Quality check failed");
      });
    });

    // 2. Temper Lifecycle
    // ═══════════════════════════════════════════════════════════════════════

    describe("Temper — Lifecycle", () => {
      it("starts a temper operation after grinding completed", async () => {
        await createProductionAtCutting();
        // Complete grinding first
        await svc.stationOperationService.startOperation({
          id: "01OP_GRIND_010",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });
        await svc.stationOperationService.completeOperation({
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });

        const { operation, production, events } = await svc.stationOperationService.startOperation({
          id: "01OP_TEMPER_001",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_TEMPER",
          operatorId: "01OP000000000000000002",
          machineId: "01MACHINE00000000002",
          shift: "night",
        });

        expect(operation.operationType).toBe("started");
        expect(operation.stationId).toBe("STATION_TEMPER");
        expect(production.currentStationId).toBe("STATION_TEMPER");
        expect(events).toHaveLength(2); // temper.started + furnace.capacity.calculated
        expect(events[0].eventType).toBe("temper.started");
        expect(events[1].eventType).toBe("furnace.capacity.calculated");
      });

      it("rejects temper start when grinding not completed", async () => {
        await createProductionAtCutting();
        // Skip grinding — go directly to temper

        await expect(
          svc.stationOperationService.startOperation({
            id: "01OP_TEMPER_002",
            productionOrderId: "01PROD0000000000000001",
            stationId: "STATION_TEMPER",
          })
        ).rejects.toThrow(/Grinding must be completed before entering Temper/i);
      });

      it("completes a temper operation", async () => {
        await createProductionAtCutting();
        await svc.stationOperationService.startOperation({
          id: "01OP_GRIND_011",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });
        await svc.stationOperationService.completeOperation({
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });
        await svc.stationOperationService.startOperation({
          id: "01OP_TEMPER_003",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_TEMPER",
        });

        const { operation, events } = await svc.stationOperationService.completeOperation({
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_TEMPER",
        });

        expect(operation.operationType).toBe("completed");
        expect(events[0].eventType).toBe("temper.completed");
      });
    });

    // 3. Furnace Capacity
    // ═══════════════════════════════════════════════════════════════════════

    describe("Temper — Furnace Capacity", () => {
      it("calculates normal glass furnace capacity as actual area", async () => {
        await createProductionAtCutting();
        await svc.stationOperationService.startOperation({
          id: "01OP_GRIND_020",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });
        await svc.stationOperationService.completeOperation({
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });

        const { events } = await svc.stationOperationService.startOperation({
          id: "01OP_TEMPER_010",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_TEMPER",
          isTemperedIG: false,
        });

        const capacityEvent = events.find((e: any) => e.eventType === "furnace.capacity.calculated");
        expect(capacityEvent).toBeDefined();
        // 1000mm * 2000mm = 2,000,000 mm² = 2 m²
        expect(capacityEvent.actualArea).toBe(2);
        expect(capacityEvent.effectiveArea).toBe(2); // Normal: 1× multiplier
        expect(capacityEvent.isTemperedIG).toBe(false);
      });

      it("doubles furnace capacity for tempered insulating glass", async () => {
        await createProductionAtCutting();
        await svc.stationOperationService.startOperation({
          id: "01OP_GRIND_021",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });
        await svc.stationOperationService.completeOperation({
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });

        const { events } = await svc.stationOperationService.startOperation({
          id: "01OP_TEMPER_011",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_TEMPER",
          isTemperedIG: true,
        });

        const capacityEvent = events.find((e: any) => e.eventType === "furnace.capacity.calculated");
        expect(capacityEvent).toBeDefined();
        expect(capacityEvent.actualArea).toBe(2);
        expect(capacityEvent.effectiveArea).toBe(4); // Tempered IG: 2× multiplier
        expect(capacityEvent.isTemperedIG).toBe(true);
      });

      it("calculates furnace capacity as pure function (no side effects)", () => {
        const normal = svc.stationOperationService.calculateFurnaceCapacity(1.5, false);
        expect(normal.actualAreaM2).toBe(1.5);
        expect(normal.effectiveAreaM2).toBe(1.5);
        expect(normal.capacityMultiplier).toBe(1);

        const temperedIG = svc.stationOperationService.calculateFurnaceCapacity(1.5, true);
        expect(temperedIG.actualAreaM2).toBe(1.5);
        expect(temperedIG.effectiveAreaM2).toBe(3);
        expect(temperedIG.capacityMultiplier).toBe(2);
      });
    });

    // 4. Insulating Glass Lifecycle
    // ═══════════════════════════════════════════════════════════════════════

    describe("Insulating Glass — Lifecycle", () => {
      it("starts an insulating glass operation", async () => {
        await createProductionAtCutting();

        const { operation, events } = await svc.stationOperationService.startOperation({
          id: "01OP_IG_001",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_INSULATING_GLASS",
          glassType: "normal",
        });

        expect(operation.operationType).toBe("started");
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe("insulating_glass.started");
        expect(events[0].glassType).toBe("normal");
      });

      it("starts IG with tempered glass type", async () => {
        await createProductionAtCutting();

        const { events } = await svc.stationOperationService.startOperation({
          id: "01OP_IG_002",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_INSULATING_GLASS",
          glassType: "tempered",
        });

        expect(events[0].glassType).toBe("tempered");
      });

      it("completes an insulating glass operation", async () => {
        await createProductionAtCutting();
        await svc.stationOperationService.startOperation({
          id: "01OP_IG_003",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_INSULATING_GLASS",
          glassType: "normal",
        });

        const { operation, events } = await svc.stationOperationService.completeOperation({
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_INSULATING_GLASS",
        });

        expect(operation.operationType).toBe("completed");
        expect(events[0].eventType).toBe("insulating_glass.completed");
      });
    });

    // 5. Low-E Validation
    // ═══════════════════════════════════════════════════════════════════════

    describe("Low-E Validation", () => {
      it("allows temperable Low-E to enter Temper", async () => {
        const result = await svc.stationOperationService.validateLowE(
          "01PROD0000000000000001",
          "temperable",
          "STATION_TEMPER"
        );
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it("blocks non-temperable Low-E from entering Temper", async () => {
        const result = await svc.stationOperationService.validateLowE(
          "01PROD0000000000000001",
          "non_temperable",
          "STATION_TEMPER"
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("Non-temperable Low-E");
        expect(result.event).toBeDefined();
        expect(result.event!.eventType).toBe("low_e.validation.failed");
      });

      it("rejects temper operation with non-temperable Low-E glass", async () => {
        await createProductionAtCutting();
        await svc.stationOperationService.startOperation({
          id: "01OP_GRIND_030",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });
        await svc.stationOperationService.completeOperation({
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });

        await expect(
          svc.stationOperationService.startOperation({
            id: "01OP_TEMPER_020",
            productionOrderId: "01PROD0000000000000001",
            stationId: "STATION_TEMPER",
            lowEType: "non_temperable",
          })
        ).rejects.toThrow(/Non-temperable Low-E glass cannot enter Temper/i);
      });
    });

    // 6. Entry Validation
    // ═══════════════════════════════════════════════════════════════════════

    describe("Station Entry Validation", () => {
      it("allows grinding entry from cutting", async () => {
        await createProductionAtCutting();

        const result = await svc.stationOperationService.validateOperation(
          "01PROD0000000000000001",
          "STATION_GRINDING"
        );
        expect(result.valid).toBe(true);
      });

      it("blocks temper entry without grinding completed", async () => {
        await createProductionAtCutting();

        const result = await svc.stationOperationService.validateOperation(
          "01PROD0000000000000001",
          "STATION_TEMPER"
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("Grinding must be completed");
      });

      it("allows hol/vent/cnc as flexible intermediate operations", async () => {
        await createProductionAtCutting();

        const holeResult = await svc.stationOperationService.validateOperation(
          "01PROD0000000000000001",
          "STATION_HOLE"
        );
        expect(holeResult.valid).toBe(true);

        const ventResult = await svc.stationOperationService.validateOperation(
          "01PROD0000000000000001",
          "STATION_VENT"
        );
        expect(ventResult.valid).toBe(true);

        const cncResult = await svc.stationOperationService.validateOperation(
          "01PROD0000000000000001",
          "STATION_CNC"
        );
        expect(cncResult.valid).toBe(true);
      });

      it("rejects operation on completed production order", async () => {
        await createBaseOrderAndProduction();
        // Complete the production order
        await svc.productionRepository.update("01PROD0000000000000001", {
          currentStatus: "completed",
        });

        await expect(
          svc.stationOperationService.startOperation({
            id: "01OP_FAIL_001",
            productionOrderId: "01PROD0000000000000001",
            stationId: "STATION_GRINDING",
          })
        ).rejects.toThrow(/Cannot start operation on completed production order/i);
      });

      it("rejects operation on cancelled production order", async () => {
        await createBaseOrderAndProduction();
        await svc.productionRepository.update("01PROD0000000000000001", {
          currentStatus: "cancelled",
        });

        await expect(
          svc.stationOperationService.startOperation({
            id: "01OP_FAIL_002",
            productionOrderId: "01PROD0000000000000001",
            stationId: "STATION_GRINDING",
          })
        ).rejects.toThrow(/Cannot start operation on cancelled production order/i);
      });
    });

    // 7. Waiting Pools
    // ═══════════════════════════════════════════════════════════════════════

    describe("Waiting Pools", () => {
      it("adds production order to waiting pool", async () => {
        await createBaseOrderAndProduction();

        await svc.stationOperationService.addToWaitingPool(
          "01PROD0000000000000001",
          "STATION_GRINDING",
          1,
          "Priority order"
        );

        const pool = await svc.stationOperationService.getWaitingPool("STATION_GRINDING");
        expect(pool).toHaveLength(1);
        expect(pool[0].productionOrderId).toBe("01PROD0000000000000001");
        expect(pool[0].priority).toBe(1);
      });

      it("removes production order from waiting pool", async () => {
        await createBaseOrderAndProduction();
        await svc.stationOperationService.addToWaitingPool(
          "01PROD0000000000000001",
          "STATION_GRINDING"
        );

        const removed = await svc.stationOperationService.removeFromWaitingPool(
          "01PROD0000000000000001",
          "STATION_GRINDING"
        );
        expect(removed).toBe(true);

        const pool = await svc.stationOperationService.getWaitingPool("STATION_GRINDING");
        expect(pool).toHaveLength(0);
      });

      it("returns waiting pool statistics across all stations", async () => {
        await createBaseOrderAndProduction();

        await svc.stationOperationService.addToWaitingPool(
          "01PROD0000000000000001",
          "STATION_GRINDING"
        );
        await svc.stationOperationService.addToWaitingPool(
          "01PROD0000000000000001",
          "STATION_TEMPER"
        );

        const stats = await svc.stationOperationService.getWaitingPoolStatistics();
        expect(stats.totalWaiting).toBe(2);
        expect(stats.byStation["STATION_GRINDING"]).toBe(1);
        expect(stats.byStation["STATION_TEMPER"]).toBe(1);
      });

      it("loads waiting production orders", async () => {
        await createBaseOrderAndProduction();
        await svc.stationOperationService.addToWaitingPool(
          "01PROD0000000000000001",
          "STATION_GRINDING"
        );

        const waiting = await svc.stationOperationService.loadWaitingProduction("STATION_GRINDING");
        expect(waiting).toHaveLength(1);
        expect(waiting[0].id).toBe("01PROD0000000000000001");
        expect(waiting[0]._waitingSince).toBeInstanceOf(Date);
      });
    });

    // 8. Operation History
    // ═══════════════════════════════════════════════════════════════════════

    describe("Operation History", () => {
      it("records history for grinding lifecycle", async () => {
        await createProductionAtCutting();
        await svc.stationOperationService.startOperation({
          id: "01OP_HIST_001",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });
        await svc.stationOperationService.completeOperation({
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });

        const history = await svc.stationOperationService.getOperationHistory("01PROD0000000000000001");
        expect(history).toHaveLength(2);
        expect(history[0].operationType).toBe("started");
        expect(history[1].operationType).toBe("completed");
      });

      it("filters history by station", async () => {
        await createProductionAtCutting();
        await svc.stationOperationService.startOperation({
          id: "01OP_HIST_002",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });

        const stationOps = await svc.stationOperationService.getStationOperationHistory("STATION_GRINDING");
        expect(stationOps).toHaveLength(1);
        expect(stationOps[0].stationId).toBe("STATION_GRINDING");
      });
    });

    // 9. Station Statistics
    // ═══════════════════════════════════════════════════════════════════════

    describe("Station Statistics", () => {
      it("returns correct statistics for grinding station", async () => {
        await createProductionAtCutting();
        await svc.stationOperationService.startOperation({
          id: "01OP_STAT_001",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });
        await svc.stationOperationService.completeOperation({
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });

        const stats = await svc.stationOperationService.getStationStatistics("STATION_GRINDING");
        expect(stats.stationId).toBe("STATION_GRINDING");
        expect(stats.totalOperations).toBe(2);
        expect(stats.completedOperations).toBe(1);
        expect(stats.activeOperations).toBe(0); // started - completed = 0
      });

      it("tracks active operations correctly", async () => {
        await createProductionAtCutting();
        // Start grinding but don't complete
        await svc.stationOperationService.startOperation({
          id: "01OP_STAT_002",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });

        const stats = await svc.stationOperationService.getStationStatistics("STATION_GRINDING");
        expect(stats.totalOperations).toBe(1);
        expect(stats.activeOperations).toBe(1);
        expect(stats.completedOperations).toBe(0);
      });

      it("includes cancelled and rejected operations in stats", async () => {
        await createProductionAtCutting();
        await svc.stationOperationService.startOperation({
          id: "01OP_STAT_003",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });
        await svc.stationOperationService.cancelOperation(
          "01PROD0000000000000001",
          "STATION_GRINDING"
        );

        const stats = await svc.stationOperationService.getStationStatistics("STATION_GRINDING");
        expect(stats.totalOperations).toBe(2);
        expect(stats.cancelledOperations).toBe(1);
      });

      it("returns statistics for all stations", async () => {
        await createProductionAtCutting();
        await svc.stationOperationService.startOperation({
          id: "01OP_STAT_004",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_GRINDING",
        });

        const allStats = await svc.stationOperationService.getAllStationStatistics();
        expect(allStats.length).toBeGreaterThanOrEqual(1);
        expect(allStats.some((s) => s.stationId === "STATION_GRINDING")).toBe(true);
      });
    });

    // 10. Validation Operation
    // ═══════════════════════════════════════════════════════════════════════

    describe("Operation Validation", () => {
      it("validates operation for non-existent production order", async () => {
        const result = await svc.stationOperationService.validateOperation(
          "nonexistent",
          "STATION_GRINDING"
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toBe("Production order not found");
      });

      it("rejects start with empty reason for rejection", async () => {
        await createProductionAtCutting();

        await expect(
          svc.stationOperationService.rejectOperation({
            productionOrderId: "01PROD0000000000000001",
            stationId: "STATION_GRINDING",
            reason: "",
          })
        ).rejects.toThrow(/Rejection reason is required/i);
      });
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Sprint 2.5.4 — Production Quality Control Engine
  // ═════════════════════════════════════════════════════════════════════════

  describe("Sprint 2.5.4 — Quality Control Engine", () => {
    // ─── Helpers ───────────────────────────────────────────────────────────
    async function createBaseProduction() {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });
      await svc.orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });
      await svc.orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
        completedQuantity: 5,
        productType: "float",
      });
      await svc.productionService.createProductionOrder({
        id: "01PROD0000000000000001",
        tenantId: "01TENANT000000000000000001",
        orderLineId: "01ORDLINE00000000000001",
        glassBarcode: "G-001",
        widthMm: 1000,
        heightMm: 2000,
        productType: "float",
        currentStationId: "STATION_QUALITY",
        currentStatus: "in_progress",
      });
    }

    // 1. Inspection Lifecycle
    // ═══════════════════════════════════════════════════════════════════════

    describe("Inspection Lifecycle", () => {
      it("starts an inspection", async () => {
        await createBaseProduction();

        const { record, events } = await svc.qualityControlService.startInspection({
          id: "01INSPECT_001",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "visual",
          inspectorId: "01INSPECTOR_001",
          shift: "day",
        });

        expect(record.id).toBe("01INSPECT_001");
        expect(record.result).toBe("in_progress");
        expect(record.inspectionType).toBe("visual");
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe("inspection.started");
      });

      it("completes an inspection with PASS result", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_002",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "dimension",
          inspectorId: "01INSPECTOR_001",
        });

        const { record, events } = await svc.qualityControlService.completeInspection(
          "01INSPECT_002",
          "pass",
          "01INSPECTOR_001"
        );

        expect(record.result).toBe("pass");
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe("inspection.passed");
      });

      it("completes an inspection with FAIL result", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_003",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "edge",
          inspectorId: "01INSPECTOR_001",
          notes: "Edge chipping detected",
        });

        const { record, events } = await svc.qualityControlService.completeInspection(
          "01INSPECT_003",
          "fail"
        );

        expect(record.result).toBe("fail");
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe("inspection.failed");
      });

      it("rejects an inspection", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_004",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "visual",
          inspectorId: "01INSPECTOR_001",
        });

        const { record, events } = await svc.qualityControlService.rejectInspection(
          "01INSPECT_004",
          "Inspection data invalid — retake required"
        );

        expect(record.result).toBe("fail");
        expect(record.rejectionReason).toBe("Inspection data invalid — retake required");
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe("inspection.rejected");
      });

      it("cannot complete already completed inspection", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_005",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "visual",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.completeInspection("01INSPECT_005", "pass");

        await expect(
          svc.qualityControlService.completeInspection("01INSPECT_005", "fail")
        ).rejects.toThrow(/Inspection already completed/i);
      });
    });

    // 2. Measurements
    // ═══════════════════════════════════════════════════════════════════════

    describe("Measurements", () => {
      it("records measurements for an inspection", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_010",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "dimension",
          inspectorId: "01INSPECTOR_001",
        });

        const { record } = await svc.qualityControlService.recordMeasurements(
          "01INSPECT_010",
          {
            widthMm: 1000,
            heightMm: 2000,
            diagonalMm: 2236.07,
            thicknessMm: 6,
            areaM2: 2.0,
            toleranceMm: 0.5,
            measuredBy: "01INSPECTOR_001",
            measuredAt: new Date(),
            notes: "Within tolerance",
          }
        );

        expect(record.measurements?.widthMm).toBe(1000);
        expect(record.measurements?.heightMm).toBe(2000);
        expect(record.measurements?.toleranceMm).toBe(0.5);
      });

      it("cannot record measurements on completed inspection", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_011",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "dimension",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.completeInspection("01INSPECT_011", "pass");

        await expect(
          svc.qualityControlService.recordMeasurements("01INSPECT_011", {
            widthMm: 1000,
            heightMm: 2000,
            measuredAt: new Date(),
          })
        ).rejects.toThrow(/Cannot record measurements on completed inspection/i);
      });
    });

    // 3. Temper Inspection
    // ═══════════════════════════════════════════════════════════════════════

    describe("Temper Inspection", () => {
      it("records visual inspection with temper details", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_020",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_TEMPER",
          inspectionType: "temper",
          inspectorId: "01INSPECTOR_001",
        });

        const { record } = await svc.qualityControlService.recordVisualInspection(
          "01INSPECT_020",
          {
            appearance: "Clear",
            scratches: "None",
            chips: "None",
            cleanliness: "Good",
            coating: "Uncoated",
            inspectionNotes: "Visual OK",
          }
        );

        expect(record.visualDetails?.appearance).toBe("Clear");
        expect(record.visualDetails?.scratches).toBe("None");
      });

      it("completes temper inspection with PASS", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_021",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_TEMPER",
          inspectionType: "temper",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.recordVisualInspection("01INSPECT_021", {
          appearance: "Clear",
          scratches: "None",
        });

        const { record, events } = await svc.qualityControlService.completeInspection(
          "01INSPECT_021",
          "pass"
        );

        expect(record.result).toBe("pass");
        expect(events[0].eventType).toBe("inspection.passed");
      });
    });

    // 4. Insulating Glass Inspection
    // ═══════════════════════════════════════════════════════════════════════

    describe("Insulating Glass Inspection", () => {
      it("completes IG inspection with PASS", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_030",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_INSULATING_GLASS",
          inspectionType: "insulating_glass",
          inspectorId: "01INSPECTOR_001",
        });

        const { record, events } = await svc.qualityControlService.completeInspection(
          "01INSPECT_030",
          "pass"
        );

        expect(record.result).toBe("pass");
        expect(events[0].eventType).toBe("inspection.passed");
      });

      it("records IG-specific inspection notes", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_031",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_INSULATING_GLASS",
          inspectionType: "insulating_glass",
          inspectorId: "01INSPECTOR_001",
        });

        await svc.qualityControlService.recordNotes(
          "01INSPECT_031",
          "Spacer: 12mm, Seal: Good, Low-E Orientation: Correct"
        );

        const { record } = await svc.qualityControlService.completeInspection(
          "01INSPECT_031",
          "pass"
        );

        expect(record.notes).toContain("Spacer");
        expect(record.result).toBe("pass");
      });
    });

    // 5. READY Validation
    // ═══════════════════════════════════════════════════════════════════════

    describe("READY Validation", () => {
      it("allows READY when inspection passes", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_040",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "final",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.completeInspection("01INSPECT_040", "pass");

        const result = await svc.qualityControlService.canProceedToReady(
          "01PROD0000000000000001"
        );
        expect(result.eligible).toBe(true);
      });

      it("allows READY when conditional pass is approved", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_041",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "final",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.completeInspection(
          "01INSPECT_041",
          "conditional_pass"
        );
        await svc.qualityControlService.approveInspection(
          "01INSPECT_041",
          "MANAGER_001"
        );

        const result = await svc.qualityControlService.canProceedToReady(
          "01PROD0000000000000001"
        );
        expect(result.eligible).toBe(true);
      });

      it("blocks READY when conditional pass is not approved", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_042",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "final",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.completeInspection(
          "01INSPECT_042",
          "conditional_pass"
        );

        const result = await svc.qualityControlService.canProceedToReady(
          "01PROD0000000000000001"
        );
        expect(result.eligible).toBe(false);
        expect(result.reason).toContain("not yet approved");
      });

      it("blocks READY when no inspection exists", async () => {
        const result = await svc.qualityControlService.canProceedToReady(
          "01PROD0000000000000001"
        );
        expect(result.eligible).toBe(false);
        expect(result.reason).toContain("No inspection records found");
      });
    });

    // 6. Conditional Pass → Approval
    // ═══════════════════════════════════════════════════════════════════════

    describe("Conditional Pass Approval", () => {
      it("approves a conditional pass inspection", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_050",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "visual",
          inspectorId: "01INSPECTOR_001",
          notes: "Minor coating irregularity — acceptable",
        });
        await svc.qualityControlService.completeInspection(
          "01INSPECT_050",
          "conditional_pass"
        );

        const { record, events } = await svc.qualityControlService.approveInspection(
          "01INSPECT_050",
          "MANAGER_001"
        );

        expect(record.approvedBy).toBe("MANAGER_001");
        expect(record.approvedAt).toBeDefined();
        expect(events).toHaveLength(1);
        expect(events[0].eventType).toBe("ready.approved");
      });

      it("rejects approval for non-conditional inspection", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_051",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "visual",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.completeInspection("01INSPECT_051", "pass");

        await expect(
          svc.qualityControlService.approveInspection("01INSPECT_051", "MANAGER_001")
        ).rejects.toThrow(/Only conditional pass inspections can be approved/i);
      });

      it("cannot approve non-existent inspection", async () => {
        await expect(
          svc.qualityControlService.approveInspection("nonexistent", "MANAGER_001")
        ).rejects.toThrow(/Inspection record not found/i);
      });
    });

    // 7. Rework Creation from Inspection
    // ═══════════════════════════════════════════════════════════════════════

    describe("Rework Creation", () => {
      it("creates rework when inspection result is rework_required", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_060",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "edge",
          inspectorId: "01INSPECTOR_001",
          notes: "Edge chipping — rework required",
        });

        const { record, events, reworkOrder } =
          await svc.qualityControlService.completeInspection(
            "01INSPECT_060",
            "rework_required"
          );

        expect(record.result).toBe("rework_required");
        expect(record.reworkOrderId).toBeDefined();
        expect(reworkOrder).toBeDefined();
        expect(events.some((e: any) => e.eventType === "rework.requested")).toBe(true);
      });

      it("prevents duplicate rework for same production order", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_061",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "edge",
          inspectorId: "01INSPECTOR_001",
          notes: "Edge chipping",
        });
        await svc.qualityControlService.completeInspection(
          "01INSPECT_061",
          "rework_required"
        );

        // Second inspection requesting rework on same production
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_062",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "edge",
          inspectorId: "01INSPECTOR_001",
          notes: "Second inspection",
        });

        await expect(
          svc.qualityControlService.completeInspection("01INSPECT_062", "rework_required")
        ).rejects.toThrow(/Unresolved rework already exists/i);
      });
    });

    // 8. Scrap Handling
    // ═══════════════════════════════════════════════════════════════════════

    describe("Scrap Handling", () => {
      it("marks production as scrapped when inspection result is scrap", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_070",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "final",
          inspectorId: "01INSPECTOR_001",
          notes: "Glass cracked — scrap",
        });

        const { record, events } = await svc.qualityControlService.completeInspection(
          "01INSPECT_070",
          "scrap"
        );

        expect(record.result).toBe("scrap");
        expect(record.rejectionReason).toBe("Glass cracked — scrap");
        expect(events.some((e: any) => e.eventType === "inspection.failed")).toBe(true);

        // Verify production is marked as scrapped via repository
        const prod = await svc.productionRepository.findById("01PROD0000000000000001");
        expect((prod as any)?.currentStatus).toBe("scrapped");
      });
    });

    // 9. Notes
    // ═══════════════════════════════════════════════════════════════════════

    describe("Notes", () => {
      it("records notes on an inspection", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_080",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "visual",
          inspectorId: "01INSPECTOR_001",
        });

        const { record } = await svc.qualityControlService.recordNotes(
          "01INSPECT_080",
          "Surface has minor scratches"
        );

        expect(record.notes).toBe("Surface has minor scratches");
      });

      it("appends notes to existing notes", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_081",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "visual",
          inspectorId: "01INSPECTOR_001",
          notes: "First observation",
        });

        await svc.qualityControlService.recordNotes(
          "01INSPECT_081",
          "Second observation"
        );

        const history = await svc.qualityControlService.getHistory("01PROD0000000000000001");
        const record = history.find((r) => r.id === "01INSPECT_081");
        expect(record?.notes).toContain("First observation");
        expect(record?.notes).toContain("Second observation");
      });
    });

    // 10. History
    // ═══════════════════════════════════════════════════════════════════════

    describe("History", () => {
      it("returns immutable history entries", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_090",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "visual",
          inspectorId: "01INSPECTOR_001",
        });

        const history = await svc.qualityControlService.getHistory();
        expect(history).toHaveLength(1);

        // Verify immutability
        history[0] = { ...history[0], id: "MUTATED" };
        const history2 = await svc.qualityControlService.getHistory();
        expect(history2[0].id).toBe("01INSPECT_090");
      });

      it("filters history by production order", async () => {
        await createBaseProduction();
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000002",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-002",
          widthMm: 500,
          heightMm: 1000,
          productType: "float",
          currentStationId: "STATION_QUALITY",
          currentStatus: "in_progress",
        });

        await svc.qualityControlService.startInspection({
          id: "01INSPECT_091",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "visual",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_092",
          productionOrderId: "01PROD0000000000002",
          stationId: "STATION_QUALITY",
          inspectionType: "dimension",
          inspectorId: "01INSPECTOR_001",
        });

        const prod1History = await svc.qualityControlService.getHistory(
          "01PROD0000000000000001"
        );
        expect(prod1History).toHaveLength(1);
        expect(prod1History[0].inspectionType).toBe("visual");
      });
    });

    // 11. Statistics
    // ═══════════════════════════════════════════════════════════════════════

    describe("Statistics", () => {
      it("returns correct statistics for passed inspections", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_100",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "visual",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.completeInspection("01INSPECT_100", "pass");

        const stats = await svc.qualityControlService.getStatistics();
        expect(stats.totalInspections).toBe(1);
        expect(stats.passedInspections).toBe(1);
        expect(stats.failedInspections).toBe(0);
      });

      it("returns correct statistics for failed inspections", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_101",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "edge",
          inspectorId: "01INSPECTOR_001",
          notes: "Failed",
        });
        await svc.qualityControlService.completeInspection("01INSPECT_101", "fail");

        const stats = await svc.qualityControlService.getStatistics();
        expect(stats.totalInspections).toBe(1);
        expect(stats.failedInspections).toBe(1);
      });

      it("tracks statistics across multiple inspection types", async () => {
        await createBaseProduction();
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_102",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "visual",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.completeInspection("01INSPECT_102", "pass");

        await svc.qualityControlService.startInspection({
          id: "01INSPECT_103",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "dimension",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.completeInspection("01INSPECT_103", "conditional_pass");

        await svc.qualityControlService.startInspection({
          id: "01INSPECT_104",
          productionOrderId: "01PROD0000000000000001",
          stationId: "STATION_QUALITY",
          inspectionType: "temper",
          inspectorId: "01INSPECTOR_001",
          notes: "Rework needed",
        });
        await svc.qualityControlService.completeInspection("01INSPECT_104", "rework_required");

        const stats = await svc.qualityControlService.getStatistics();
        expect(stats.totalInspections).toBe(3);
        expect(stats.passedInspections).toBe(1);
        expect(stats.conditionalPassInspections).toBe(1);
        expect(stats.reworkRequiredInspections).toBe(1);
        expect(stats.byType["visual"]).toBe(1);
        expect(stats.byType["dimension"]).toBe(1);
        expect(stats.byType["temper"]).toBe(1);
      });
    });

    // 12. Edge Cases
    // ═══════════════════════════════════════════════════════════════════════

    describe("Edge Cases", () => {
      it("rejects starting inspection for non-existent production order", async () => {
        await expect(
          svc.qualityControlService.startInspection({
            id: "01INSPECT_999",
            productionOrderId: "nonexistent",
            stationId: "STATION_QUALITY",
            inspectionType: "visual",
            inspectorId: "01INSPECTOR_001",
          })
        ).rejects.toThrow(/Production order not found/i);
      });

      it("rejects starting inspection for completed production order", async () => {
        await createBaseProduction();
        await svc.productionRepository.update("01PROD0000000000000001", {
          currentStatus: "completed",
        } as any);

        await expect(
          svc.qualityControlService.startInspection({
            id: "01INSPECT_998",
            productionOrderId: "01PROD0000000000000001",
            stationId: "STATION_QUALITY",
            inspectionType: "visual",
            inspectorId: "01INSPECTOR_001",
          })
        ).rejects.toThrow(/Cannot inspect completed production order/i);
      });

      it("rejects completion on non-existent inspection record", async () => {
        await expect(
          svc.qualityControlService.completeInspection("nonexistent", "pass")
        ).rejects.toThrow(/Inspection record not found/i);
      });
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  // Sprint 2.5.5 — Dispatch & Delivery Engine
  // ═════════════════════════════════════════════════════════════════════════

  describe("Sprint 2.5.5 — Dispatch & Delivery Engine", () => {
    // Helper: creates a production that has passed quality control (READY for dispatch)
    async function createBaseReadyProduction(prodId = "01PROD0000000000000001") {
      await svc.customerService.create({
        id: "01CUST000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerCode: "CUST-001",
        name: "North Glass Co",
        isActive: true,
      });
      await svc.orderService.create({
        id: "01ORDER000000000000000001",
        tenantId: "01TENANT000000000000000001",
        customerId: "01CUST000000000000000001",
        orderNumber: "ORD-2026-001",
        orderDate: new Date("2026-07-16"),
      });
      await svc.orderLineRepository.create({
        id: "01ORDLINE00000000000001",
        orderId: "01ORDER000000000000000001",
        productId: "01PROD000000000000000001",
        widthMm: 1000,
        heightMm: 2000,
        quantity: 10,
        completedQuantity: 5,
        productType: "float",
      });
      await svc.productionService.createProductionOrder({
        id: prodId,
        tenantId: "01TENANT000000000000000001",
        orderLineId: "01ORDLINE00000000000001",
        glassBarcode: `G-${prodId.slice(-3)}`,
        widthMm: 1000,
        heightMm: 2000,
        productType: "float",
        currentStationId: "STATION_QUALITY",
        currentStatus: "in_progress",
      });
      // Pass quality control
      await svc.qualityControlService.startInspection({
        id: `01INSPECT_DISP_${prodId.slice(-3)}`,
        productionOrderId: prodId,
        stationId: "STATION_QUALITY",
        inspectionType: "final",
        inspectorId: "01INSPECTOR_001",
      });
      await svc.qualityControlService.completeInspection(
        `01INSPECT_DISP_${prodId.slice(-3)}`,
        "pass"
      );
    }

    // ─── 1. READY Pool ─────────────────────────────────────────────────────

    describe("READY Pool", () => {
      it("returns READY productions", async () => {
        await createBaseReadyProduction();

        const ready = await svc.dispatchService.getReadyProductions();
        expect(ready.length).toBeGreaterThanOrEqual(1);
        expect(ready[0].productionOrderId).toBe("01PROD0000000000000001");
        expect(ready[0].glassBarcode).toBe("G-001");
      });

      it("returns empty when no READY productions", async () => {
        const ready = await svc.dispatchService.getReadyProductions();
        expect(ready).toHaveLength(0);
      });

      it("filters by product type", async () => {
        await createBaseReadyProduction();
        // Create another production with different type
        await svc.customerService.create({
          id: "01CUST000000000000000002",
          tenantId: "01TENANT000000000000000001",
          customerCode: "CUST-002",
          name: "South Glass Co",
          isActive: true,
        });
        await svc.orderService.create({
          id: "01ORDER000000000000000002",
          tenantId: "01TENANT000000000000000001",
          customerId: "01CUST000000000000000002",
          orderNumber: "ORD-2026-002",
          orderDate: new Date("2026-07-16"),
        });
        await svc.orderLineRepository.create({
          id: "01ORDLINE00000000000002",
          orderId: "01ORDER000000000000000002",
          productId: "01PROD000000000000000001",
          widthMm: 500,
          heightMm: 1000,
          quantity: 5,
          completedQuantity: 0,
          productType: "laminated",
        });
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000002",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000002",
          glassBarcode: "G-002",
          widthMm: 500,
          heightMm: 1000,
          productType: "laminated",
          currentStationId: "STATION_QUALITY",
          currentStatus: "in_progress",
        });
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_DISP_002",
          productionOrderId: "01PROD0000000000000002",
          stationId: "STATION_QUALITY",
          inspectionType: "final",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.completeInspection(
          "01INSPECT_DISP_002",
          "pass"
        );

        const floatReady = await svc.dispatchService.getReadyProductions({
          productType: "float",
        });
        expect(floatReady).toHaveLength(1);
        expect(floatReady[0].productType).toBe("float");

        const laminatedReady = await svc.dispatchService.getReadyProductions({
          productType: "laminated",
        });
        expect(laminatedReady).toHaveLength(1);
        expect(laminatedReady[0].productType).toBe("laminated");
      });
    });

    // ─── 2. Dispatch Basket ────────────────────────────────────────────────

    describe("Dispatch Basket", () => {
      it("adds a production to the basket", async () => {
        await createBaseReadyProduction();

        const { entry } = await svc.dispatchService.addToBasket("01PROD0000000000000001");
        expect(entry.productionOrderId).toBe("01PROD0000000000000001");
        expect(entry.orderLineId).toBe("01ORDLINE00000000000001");

        const basket = svc.dispatchService.getBasket();
        expect(basket).toHaveLength(1);
      });

      it("prevents duplicate additions", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.addToBasket("01PROD0000000000000001");

        await expect(
          svc.dispatchService.addToBasket("01PROD0000000000000001")
        ).rejects.toThrow(/already in dispatch basket/i);
      });

      it("rejects non-READY production", async () => {
        await createBaseReadyProduction();
        // Remove quality approval by creating a production without inspection
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000003",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-003",
          widthMm: 600,
          heightMm: 1200,
          productType: "float",
          currentStationId: "STATION_CUTTING",
          currentStatus: "in_progress",
        });

        await expect(
          svc.dispatchService.addToBasket("01PROD0000000000000003")
        ).rejects.toThrow(/not READY for dispatch/i);
      });

      it("removes a production from the basket", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.addToBasket("01PROD0000000000000001");

        await svc.dispatchService.removeFromBasket("01PROD0000000000000001");
        const basket = svc.dispatchService.getBasket();
        expect(basket).toHaveLength(0);
      });

      it("shows basket statistics", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.addToBasket("01PROD0000000000000001");

        const stats = svc.dispatchService.getBasketStatistics();
        expect(stats.totalItems).toBe(1);
        expect(stats.uniqueCustomers).toBe(1);
        expect(stats.uniqueOrders).toBe(1);
      });
    });

    // ─── 3. Create Delivery ────────────────────────────────────────────────

    describe("Create Delivery", () => {
      it("creates a delivery from READY productions", async () => {
        await createBaseReadyProduction();

        const { delivery, events } = await svc.dispatchService.createDelivery({
          id: "01DELIVERY_001",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });

        expect(delivery.id).toBe("01DELIVERY_001");
        expect(delivery.status).toBe("created");
        expect(delivery.productionOrderIds).toContain("01PROD0000000000000001");
        expect(events.length).toBeGreaterThanOrEqual(1);
        expect(events[0].eventType).toBe("dispatch.created");
      });

      it("rejects non-existent production", async () => {
        await expect(
          svc.dispatchService.createDelivery({
            id: "01DELIVERY_002",
            productionOrderIds: ["NONEXISTENT"],
            orderLineIds: ["01ORDLINE00000000000001"],
            customerId: "01CUST000000000000000001",
            orderId: "01ORDER000000000000000001",
          })
        ).rejects.toThrow(/not found/i);
      });
    });

    // ─── 4. Vehicle Assignment ─────────────────────────────────────────────

    describe("Vehicle Assignment", () => {
      it("assigns a vehicle to a delivery", async () => {
        await createBaseReadyProduction();
        const { delivery: created } = await svc.dispatchService.createDelivery({
          id: "01DELIVERY_010",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });

        const { delivery, events } = await svc.dispatchService.assignVehicle(
          "01DELIVERY_010",
          "VEHICLE_001",
          "DRIVER_001",
          "DISPATCHER_001"
        );

        expect(delivery.vehicleId).toBe("VEHICLE_001");
        expect(delivery.driverId).toBe("DRIVER_001");
        expect(delivery.dispatcherId).toBe("DISPATCHER_001");
        expect(events[0].eventType).toBe("vehicle.assigned");
      });

      it("assigns a driver separately", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_011",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });

        const { delivery } = await svc.dispatchService.assignDriver(
          "01DELIVERY_011",
          "DRIVER_002"
        );
        expect(delivery.driverId).toBe("DRIVER_002");
      });

      it("assigns a dispatcher separately", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_012",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });

        const { delivery } = await svc.dispatchService.assignDispatcher(
          "01DELIVERY_012",
          "DISPATCHER_002"
        );
        expect(delivery.dispatcherId).toBe("DISPATCHER_002");
      });

      it("rejects vehicle assignment on non-existent delivery", async () => {
        await expect(
          svc.dispatchService.assignVehicle("NONEXISTENT", "VEHICLE_001")
        ).rejects.toThrow(/Delivery not found/i);
      });
    });

    // ─── 5. Loading Lifecycle ─────────────────────────────────────────────

    describe("Loading Lifecycle", () => {
      it("starts loading a vehicle", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_020",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });

        const { delivery, events } = await svc.dispatchService.loadVehicle(
          "01DELIVERY_020",
          "LOADER_001"
        );

        expect(delivery.status).toBe("loading");
        expect(delivery.loadedBy).toBe("LOADER_001");
        expect(events[0].eventType).toBe("loading.started");
      });

      it("completes loading", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_021",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });
        await svc.dispatchService.loadVehicle("01DELIVERY_021", "LOADER_001");

        const { delivery, events } = await svc.dispatchService.unloadVehicle(
          "01DELIVERY_021"
        );

        expect(delivery.status).toBe("ready_to_ship");
        expect(events[0].eventType).toBe("loading.completed");
      });

      it("rejects loading on wrong status", async () => {
        await createBaseReadyProduction();

        await expect(
          svc.dispatchService.loadVehicle("NONEXISTENT")
        ).rejects.toThrow(/Delivery not found/i);
      });
    });

    // ─── 6. Shipment & Delivery ────────────────────────────────────────────

    describe("Shipment & Delivery", () => {
      it("starts shipment", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_030",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });
        await svc.dispatchService.loadVehicle("01DELIVERY_030");
        await svc.dispatchService.unloadVehicle("01DELIVERY_030");

        const { delivery, events } = await svc.dispatchService.startShipment(
          "01DELIVERY_030"
        );

        expect(delivery.status).toBe("in_transit");
        expect(events[0].eventType).toBe("shipment.started");
      });

      it("completes delivery", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_031",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });
        await svc.dispatchService.loadVehicle("01DELIVERY_031");
        await svc.dispatchService.unloadVehicle("01DELIVERY_031");
        await svc.dispatchService.startShipment("01DELIVERY_031");

        const { delivery, events } = await svc.dispatchService.completeDelivery(
          "01DELIVERY_031",
          "DRIVER_001"
        );

        expect(delivery.status).toBe("delivered");
        expect(delivery.deliveredBy).toBe("DRIVER_001");
        expect(events[0].eventType).toBe("delivery.completed");

        // Verify order line counter updated
        const line = await svc.orderLineRepository.findById("01ORDLINE00000000000001");
        expect(line?.deliveredQuantity).toBe(1);
      });

      it("completes partial delivery", async () => {
        await createBaseReadyProduction();
        // Create second production on same order line
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000004",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-004",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
          currentStationId: "STATION_QUALITY",
          currentStatus: "in_progress",
        });
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_DISP_004",
          productionOrderId: "01PROD0000000000000004",
          stationId: "STATION_QUALITY",
          inspectionType: "final",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.completeInspection(
          "01INSPECT_DISP_004",
          "pass"
        );

        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_032",
          productionOrderIds: [
            "01PROD0000000000000001",
            "01PROD0000000000000004",
          ],
          orderLineIds: [
            "01ORDLINE00000000000001",
            "01ORDLINE00000000000001",
          ],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });
        await svc.dispatchService.loadVehicle("01DELIVERY_032");
        await svc.dispatchService.unloadVehicle("01DELIVERY_032");
        await svc.dispatchService.startShipment("01DELIVERY_032");

        const { delivery, events } =
          await svc.dispatchService.completePartialDelivery(
            "01DELIVERY_032",
            ["01ORDLINE00000000000001"],
            "DRIVER_001"
          );

        expect(delivery.status).toBe("partially_delivered");
        expect(events[0].eventType).toBe("delivery.partial");
        expect(events[0].pendingOrderLineIds).toHaveLength(0);

        // Verify counter updated
        const line = await svc.orderLineRepository.findById("01ORDLINE00000000000001");
        expect(line?.deliveredQuantity).toBe(1);
      });
    });

    // ─── 7. Cancellation ───────────────────────────────────────────────────

    describe("Cancellation", () => {
      it("cancels a delivery", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_040",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });

        const { delivery, events } = await svc.dispatchService.cancelDispatch(
          "01DELIVERY_040",
          "Customer requested delay"
        );

        expect(delivery.status).toBe("cancelled");
        expect(delivery.cancelReason).toBe("Customer requested delay");
        expect(events[0].eventType).toBe("dispatch.cancelled");
      });

      it("rejects cancellation on delivered delivery", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_041",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });
        await svc.dispatchService.loadVehicle("01DELIVERY_041");
        await svc.dispatchService.unloadVehicle("01DELIVERY_041");
        await svc.dispatchService.startShipment("01DELIVERY_041");
        await svc.dispatchService.completeDelivery("01DELIVERY_041");

        await expect(
          svc.dispatchService.cancelDispatch("01DELIVERY_041")
        ).rejects.toThrow(/already delivered/i);
      });

      it("rejects cancellation on already cancelled delivery", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_042",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });
        await svc.dispatchService.cancelDispatch("01DELIVERY_042");

        await expect(
          svc.dispatchService.cancelDispatch("01DELIVERY_042")
        ).rejects.toThrow(/already cancelled/i);
      });
    });

    // ─── 8. Delivery Counters ──────────────────────────────────────────────

    describe("Delivery Counters", () => {
      it("shows correct counters per order line", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_050",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });
        await svc.dispatchService.loadVehicle("01DELIVERY_050");
        await svc.dispatchService.unloadVehicle("01DELIVERY_050");
        await svc.dispatchService.startShipment("01DELIVERY_050");
        await svc.dispatchService.completeDelivery("01DELIVERY_050");

        const counters = await svc.dispatchService.getOrderLineDeliveryCounters(
          "01ORDLINE00000000000001"
        );
        expect(counters.requested).toBe(10);
        expect(counters.delivered).toBe(1);
        expect(counters.remaining).toBe(9);
      });
    });

    // ─── 9. History ────────────────────────────────────────────────────────

    describe("History", () => {
      it("returns immutable history entries", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_060",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });

        const history = svc.dispatchService.getDeliveryHistory();
        expect(history).toHaveLength(1);

        // Verify immutability
        history[0] = { ...history[0], id: "MUTATED" };
        const history2 = svc.dispatchService.getDeliveryHistory();
        expect(history2[0].id).toBe("01DELIVERY_060");
      });

      it("filters history by production order", async () => {
        await createBaseReadyProduction();
        // Create a second production on a different order line
        await svc.customerService.create({
          id: "01CUST000000000000000003",
          tenantId: "01TENANT000000000000000001",
          customerCode: "CUST-003",
          name: "West Glass Co",
          isActive: true,
        });
        await svc.orderService.create({
          id: "01ORDER000000000000000003",
          tenantId: "01TENANT000000000000000001",
          customerId: "01CUST000000000000000003",
          orderNumber: "ORD-2026-003",
          orderDate: new Date("2026-07-16"),
        });
        await svc.orderLineRepository.create({
          id: "01ORDLINE00000000000003",
          orderId: "01ORDER000000000000000003",
          productId: "01PROD000000000000000001",
          widthMm: 800,
          heightMm: 1600,
          quantity: 5,
          completedQuantity: 0,
          productType: "float",
        });
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000005",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000003",
          glassBarcode: "G-005",
          widthMm: 800,
          heightMm: 1600,
          productType: "float",
          currentStationId: "STATION_QUALITY",
          currentStatus: "in_progress",
        });
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_DISP_005",
          productionOrderId: "01PROD0000000000000005",
          stationId: "STATION_QUALITY",
          inspectionType: "final",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.completeInspection(
          "01INSPECT_DISP_005",
          "pass"
        );

        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_061",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_062",
          productionOrderIds: ["01PROD0000000000000005"],
          orderLineIds: ["01ORDLINE00000000000003"],
          customerId: "01CUST000000000000000003",
          orderId: "01ORDER000000000000000003",
        });

        const prod1History = svc.dispatchService.getDeliveryHistory(
          "01PROD0000000000000001"
        );
        expect(prod1History).toHaveLength(1);
        expect(prod1History[0].id).toBe("01DELIVERY_061");

        const prod5History = svc.dispatchService.getDeliveryHistory(
          "01PROD0000000000000005"
        );
        expect(prod5History).toHaveLength(1);
        expect(prod5History[0].id).toBe("01DELIVERY_062");
      });
    });

    // ─── 10. Statistics ───────────────────────────────────────────────────

    describe("Statistics", () => {
      it("returns delivery statistics", async () => {
        await createBaseReadyProduction();
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_070",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });

        const stats = svc.dispatchService.getDeliveryStatistics();
        expect(stats.totalDeliveries).toBe(1);
        expect(stats.byStatus["created"]).toBe(1);
      });

      it("tracks counts across statuses", async () => {
        await createBaseReadyProduction();

        // Create a second production
        await svc.productionService.createProductionOrder({
          id: "01PROD0000000000000006",
          tenantId: "01TENANT000000000000000001",
          orderLineId: "01ORDLINE00000000000001",
          glassBarcode: "G-006",
          widthMm: 1000,
          heightMm: 2000,
          productType: "float",
          currentStationId: "STATION_QUALITY",
          currentStatus: "in_progress",
        });
        await svc.qualityControlService.startInspection({
          id: "01INSPECT_DISP_006",
          productionOrderId: "01PROD0000000000000006",
          stationId: "STATION_QUALITY",
          inspectionType: "final",
          inspectorId: "01INSPECTOR_001",
        });
        await svc.qualityControlService.completeInspection(
          "01INSPECT_DISP_006",
          "pass"
        );

        // First delivery — delivered
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_071",
          productionOrderIds: ["01PROD0000000000000001"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });
        await svc.dispatchService.loadVehicle("01DELIVERY_071");
        await svc.dispatchService.unloadVehicle("01DELIVERY_071");
        await svc.dispatchService.startShipment("01DELIVERY_071");
        await svc.dispatchService.completeDelivery("01DELIVERY_071");

        // Second delivery — cancelled
        await svc.dispatchService.createDelivery({
          id: "01DELIVERY_072",
          productionOrderIds: ["01PROD0000000000000006"],
          orderLineIds: ["01ORDLINE00000000000001"],
          customerId: "01CUST000000000000000001",
          orderId: "01ORDER000000000000000001",
        });
        await svc.dispatchService.cancelDispatch("01DELIVERY_072");

        const stats = svc.dispatchService.getDeliveryStatistics();
        expect(stats.totalDeliveries).toBe(2);
        expect(stats.byStatus["delivered"]).toBe(1);
        expect(stats.byStatus["cancelled"]).toBe(1);
        expect(stats.totalDelivered).toBe(1);
        expect(stats.totalCancelled).toBe(1);
      });
    });
  });
});
