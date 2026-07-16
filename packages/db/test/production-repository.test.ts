import { describe, expect, it } from "vitest";
import { CustomerRepository } from "../src/repositories/customer.repository.js";
import { OrderRepository } from "../src/repositories/order.repository.js";
import { OrderLineRepository } from "../src/repositories/order-line.repository.js";
import { ProductionRepository } from "../src/repositories/production.repository.js";
import { ProductionQueueRepository } from "../src/repositories/production-queue.repository.js";
import { ReworkRepository } from "../src/repositories/rework.repository.js";

class FakeDb {
  public state: Array<Record<string, unknown>> = [];

  select() {
    const query = {
      from: () => query,
      where: () => query,
      orderBy: () => query,
      limit: () => query,
      offset: () => query,
      execute: async () => this.state,
    };
    return query;
  }

  insert(table: { name?: string }) {
    return {
      values: (values: Record<string, unknown>) => ({
        returning: () => ({
          execute: async () => {
            const row = { ...values, id: (values.id as string) ?? "01ARZ3NDEKTSV4RRFFQ69G5FAV" };
            this.state.push(row);
            return [row];
          },
        }),
      }),
    };
  }

  update(table: { name?: string }) {
    return {
      set: (values: Record<string, unknown>) => {
        const builder = {
          where: () => builder,
          returning: () => ({
            execute: async () => {
              const id = (values.id as string) ?? "";
              const index = this.state.findIndex((row) => row.id === id);
              if (index >= 0) {
                this.state[index] = { ...this.state[index], ...values };
              }
              return index >= 0 ? [this.state[index]] : [];
            },
          }),
        };
        return builder;
      },
    };
  }
}

describe("core production repository layer", () => {
  it("CustomerRepository: create, find, and filter customers", async () => {
    const db = new FakeDb();
    const repository = new CustomerRepository(db as never);

    const c1 = await repository.create({
      id: "01CUST000000000000000001",
      tenantId: "01TENANT000000000000000001",
      factoryId: "01FACTORY0000000000000001",
      customerCode: "CUST-001",
      name: "North Glass Co",
      email: "contact@northglass.com",
      phone: "+905551234567",
      isActive: true,
    });

    expect(c1.name).toBe("North Glass Co");

    const foundByCode = await repository.findByCode("CUST-001", { tenantId: "01TENANT000000000000000001" });
    expect(foundByCode?.customerCode).toBe("CUST-001");

    const foundByName = await repository.findByName("North Glass Co");
    expect(foundByName).toHaveLength(1);

    const foundByPhone = await repository.findByPhone("+905551234567");
    expect(foundByPhone).toHaveLength(1);

    const active = await repository.findActiveCustomers({ tenantId: "01TENANT000000000000000001" });
    expect(active.length).toBeGreaterThan(0);

    const exists = await repository.exists(c1.id);
    expect(exists).toBe(true);

    const count = await repository.count({ tenantId: "01TENANT000000000000000001" });
    expect(count).toBeGreaterThan(0);
  });

  it("OrderRepository: create, find by status, and filter by customer", async () => {
    const db = new FakeDb();
    const repository = new OrderRepository(db as never);

    const o1 = await repository.create({
      id: "01ORDER000000000000000001",
      tenantId: "01TENANT000000000000000001",
      factoryId: "01FACTORY0000000000000001",
      customerId: "01CUST000000000000000001",
      orderNumber: "ORD-2026-001",
      orderDate: new Date("2026-07-16"),
      dueDate: new Date("2026-07-30"),
      status: "draft",
    });

    expect(o1.status).toBe("draft");

    const pending = await repository.findPendingApproval({ tenantId: "01TENANT000000000000000001" });
    expect(pending).toHaveLength(1);

    const byCustomer = await repository.findByCustomer("01CUST000000000000000001");
    expect(byCustomer).toHaveLength(1);

    const byNumber = await repository.findByOrderNumber("ORD-2026-001");
    expect(byNumber?.id).toBe(o1.id);

    const exists = await repository.exists(o1.id);
    expect(exists).toBe(true);

    const count = await repository.count({ tenantId: "01TENANT000000000000000001" });
    expect(count).toBeGreaterThan(0);
  });

  it("OrderLineRepository: find by order and incomplete lines", async () => {
    const db = new FakeDb();
    const repository = new OrderLineRepository(db as never);

    const line1 = await repository.create({
      id: "01ORDLINE00000000000001",
      orderId: "01ORDER000000000000000001",
      productId: "01PROD000000000000000001",
      widthMm: 1000,
      heightMm: 2000,
      quantity: 10,
      completedQuantity: 5,
      brokenQuantity: 0,
    });

    const line2 = await repository.create({
      id: "01ORDLINE00000000000002",
      orderId: "01ORDER000000000000000001",
      productId: "01PROD000000000000000002",
      widthMm: 800,
      heightMm: 1600,
      quantity: 20,
      completedQuantity: 20,
      brokenQuantity: 1,
    });

    const byOrder = await repository.findByOrder("01ORDER000000000000000001");
    expect(byOrder).toHaveLength(2);

    const incomplete = await repository.findIncompleteLines("01ORDER000000000000000001");
    expect(incomplete).toHaveLength(1);
    expect(incomplete[0]?.id).toBe(line1.id);

    const broken = await repository.findBrokenLines("01ORDER000000000000000001");
    expect(broken).toHaveLength(1);
    expect(broken[0]?.id).toBe(line2.id);

    const count = await repository.countByOrder("01ORDER000000000000000001");
    expect(count).toBe(2);

    const exists = await repository.exists(line1.id);
    expect(exists).toBe(true);
  });

  it("ProductionRepository: find by status, station, and barcode", async () => {
    const db = new FakeDb();
    const repository = new ProductionRepository(db as never);

    const prod1 = await repository.create({
      id: "01PROD000000000000000001",
      tenantId: "01TENANT000000000000000001",
      factoryId: "01FACTORY0000000000000001",
      orderLineId: "01ORDLINE00000000000001",
      glassBarcode: "G-2026-001-1",
      widthMm: 1000,
      heightMm: 2000,
      currentOperation: "cutting",
      currentStationId: "01STAT000000000000000001",
      currentStatus: "pending",
      isRework: false,
      revisionNumber: 0,
    });

    const all = await repository.list({ tenantId: "01TENANT000000000000000001" });
    expect(all).toHaveLength(1);

    const byStation = await repository.findByStation("01STAT000000000000000001", { tenantId: "01TENANT000000000000000001" });
    expect(byStation).toHaveLength(1);

    const byBarcode = await repository.findByBarcode("G-2026-001-1", { tenantId: "01TENANT000000000000000001" });
    expect(byBarcode?.id).toBe(prod1.id);

    const active = await repository.findActiveProduction({ tenantId: "01TENANT000000000000000001" });
    expect(active).toHaveLength(0);

    const exists = await repository.exists(prod1.id);
    expect(exists).toBe(true);

    const count = await repository.count({ tenantId: "01TENANT000000000000000001" });
    expect(count).toBeGreaterThan(0);
  });

  it("ProductionQueueRepository: find by station and operation", async () => {
    const db = new FakeDb();
    const repository = new ProductionQueueRepository(db as never);

    const q1 = await repository.create({
      id: "01QUEUE00000000000000001",
      tenantId: "01TENANT000000000000000001",
      factoryId: "01FACTORY0000000000000001",
      stationId: "01STAT000000000000000001",
      operationCode: "cutting",
      isActive: true,
    });

    expect(q1.operationCode).toBe("cutting");

    const byStation = await repository.findQueueByStation("01STAT000000000000000001", { tenantId: "01TENANT000000000000000001" });
    expect(byStation).toHaveLength(1);

    const byOp = await repository.findQueueByOperation("cutting", { tenantId: "01TENANT000000000000000001" });
    expect(byOp).toHaveLength(1);

    const stationOp = await repository.findStationOperationQueue("01STAT000000000000000001", "cutting", { tenantId: "01TENANT000000000000000001" });
    expect(stationOp?.id).toBe(q1.id);

    const active = await repository.findActiveQueues({ tenantId: "01TENANT000000000000000001" });
    expect(active).toHaveLength(1);

    const exists = await repository.exists(q1.id);
    expect(exists).toBe(true);

    const count = await repository.count({ tenantId: "01TENANT000000000000000001" });
    expect(count).toBeGreaterThan(0);
  });

  it("ReworkRepository: find by status and parent order", async () => {
    const db = new FakeDb();
    const repository = new ReworkRepository(db as never);

    const rework = await repository.create({
      id: "01REWORK0000000000000001",
      tenantId: "01TENANT000000000000000001",
      factoryId: "01FACTORY0000000000000001",
      parentProductionOrderId: "01PROD000000000000000001",
      reworkReason: "Breakage during grinding",
      reworkStatus: "pending",
      internalCustomer: "fire_depot",
    });

    expect(rework.reworkStatus).toBe("pending");

    const openReworks = await repository.findOpenReworks({ tenantId: "01TENANT000000000000000001" });
    expect(openReworks).toHaveLength(1);

    const byParent = await repository.findByParentOrder("01PROD000000000000000001", { tenantId: "01TENANT000000000000000001" });
    expect(byParent).toHaveLength(1);

    const fireDepot = await repository.findFireDepotItems({ tenantId: "01TENANT000000000000000001" });
    expect(fireDepot).toHaveLength(1);

    const exists = await repository.exists(rework.id);
    expect(exists).toBe(true);

    const count = await repository.count({ tenantId: "01TENANT000000000000000001" });
    expect(count).toBeGreaterThan(0);
  });

  it("All repositories support pagination and soft delete", async () => {
    const db = new FakeDb();
    const orderRepo = new OrderRepository(db as never);

    await orderRepo.create({
      id: "01ORDER000000000000000001",
      tenantId: "01TENANT000000000000000001",
      factoryId: "01FACTORY0000000000000001",
      customerId: "01CUST000000000000000001",
      orderNumber: "ORD-2026-001",
      orderDate: new Date("2026-07-16"),
      status: "draft",
    });

    const paged = await orderRepo.paginate({
      tenantId: "01TENANT000000000000000001",
      page: 1,
      pageSize: 50,
    });

    expect(paged.items).toHaveLength(1);
    expect(paged.total).toBe(1);

    const deleted = await orderRepo.softDelete("01ORDER000000000000000001", { userId: "01USER000000000000000001" });
    expect(deleted.deletedAt).toBeDefined();

    const restored = await orderRepo.restore("01ORDER000000000000000001", { userId: "01USER000000000000000001" });
    expect(restored.deletedAt).toBeNull();
  });
});
