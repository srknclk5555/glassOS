import { CustomerRepository } from "../repositories/customer.repository.js";
import { OrderRepository } from "../repositories/order.repository.js";
import { OrderLineRepository } from "../repositories/order-line.repository.js";
import { ProductionRepository } from "../repositories/production.repository.js";
import { withTenantSession } from "../db/transactions.js";

import type { OrderApprovedEvent, EventPublisher } from "./events.js";

export class OrderService {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly orderLineRepository: OrderLineRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly productionRepository: ProductionRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly db: any
  ) {}

  async create(input: {
    id: string;
    tenantId: string;
    factoryId?: string;
    customerId: string;
    orderNumber: string;
    orderDate: Date;
    dueDate?: Date;
    notes?: string;
  }): Promise<any> {
    return withTenantSession(async (tx, ctx) => {
      // Validate customer existence and active status
      const customer = await this.customerRepository.findById(input.customerId);
      if (!customer) {
        throw new Error(`Customer not found: ${input.customerId}`);
      }
      if (customer.isActive === false) {
        throw new Error(`Cannot create order: customer is inactive: ${input.customerId}`);
      }

      return this.orderRepository.create({
        ...input,
        status: "draft",
      });
    });
  }

  async update(
    id: string,
    changes: Partial<{
      dueDate: Date;
      notes: string;
      userId: string;
    }>
  ): Promise<any> {
    return withTenantSession(async (tx, ctx) => {
      const existing = await this.orderRepository.findById(id);
      if (!existing) {
        throw new Error(`Order not found: ${id}`);
      }

      return this.orderRepository.update(id, changes);
    });
  }

  async approveOrder(
    id: string,
    options: { userId?: string } = {}
  ): Promise<{ order: any; lines: any[]; events: OrderApprovedEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const order = await this.orderRepository.findById(id);
      if (!order) {
        throw new Error(`Order not found: ${id}`);
      }

      // Rule: Cannot approve cancelled order
      if (order.status === "cancelled") {
        throw new Error(`Cannot approve cancelled order: ${id}`);
      }

      // Rule: Cannot approve already approved order
      if (order.status === "confirmed") {
        throw new Error(`Order already approved: ${id}`);
      }

      // Rule: Verify customer exists and is active
      const customer = await this.customerRepository.findById(order.customerId);
      if (!customer) {
        throw new Error(`Customer not found for order: ${order.customerId}`);
      }
      if (customer.isActive === false) {
        throw new Error(`Cannot approve order: customer is inactive: ${order.customerId}`);
      }

      // Rule: Verify order contains at least one order line
      const lines = await this.orderLineRepository.findByOrder(id);
      if (lines.length === 0) {
        throw new Error(`Cannot approve empty order: ${id}`);
      }

      // Rule: Verify required product/material references exist
      for (const line of lines) {
        if (!line.productId) {
          throw new Error(`Order line ${line.id} is missing product reference`);
        }
      }

      // Change status from Draft → Confirmed (approved)
      const updated = await this.orderRepository.update(id, {
        status: "confirmed",
        userId: options.userId,
      });

      // Create production preparation records (one per order line)
      const productionOrders: any[] = [];
      for (const line of lines) {
        const prodOrder = await this.productionRepository.create({
          id: `PROD-${line.id}`,
          tenantId: order.tenantId,
          factoryId: order.factoryId,
          orderLineId: line.id,
          glassBarcode: `G-${order.orderNumber}-${line.id.slice(-4)}`,
          widthMm: Number(line.widthMm),
          heightMm: Number(line.heightMm),
          productType: line.productType ?? null,
          currentOperation: "cutting",
          currentStationId: null,
          currentStatus: "pending",
          isRework: false,
          revisionNumber: 0,
        });
        productionOrders.push(prodOrder);
      }

      // Prepare domain event
      const event: OrderApprovedEvent = {
        eventType: "order.approved",
        orderId: id,
        orderNumber: order.orderNumber,
        customerId: order.customerId,
        approvedAt: new Date(),
        approvedBy: options.userId,
        lineCount: lines.length,
      };

      return { order: updated, lines: productionOrders, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  async cancelOrder(
    id: string,
    options: { userId?: string } = {}
  ): Promise<any> {
    return withTenantSession(async (tx, ctx) => {
      const order = await this.orderRepository.findById(id);
      if (!order) {
        throw new Error(`Order not found: ${id}`);
      }

      // Rule: Cannot cancel completed order (in production or completed)
      if (order.status === "in_production" || order.status === "completed") {
        throw new Error(`Cannot cancel order in production or completed: ${id}`);
      }

      return this.orderRepository.update(id, {
        status: "cancelled",
        userId: options.userId,
      });
    });
  }

  async loadOrderLines(orderId: string): Promise<any[]> {
    return withTenantSession(async (tx, ctx) => {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw new Error(`Order not found: ${orderId}`);
      }

      return this.orderLineRepository.findByOrder(orderId);
    });
  }

  async validateOrder(id: string): Promise<{ valid: boolean; errors: string[] }> {
    return withTenantSession(async (tx, ctx) => {
      const errors: string[] = [];

      const order = await this.orderRepository.findById(id);
      if (!order) {
        return { valid: false, errors: ["Order not found"] };
      }

      if (order.status === "cancelled") {
        errors.push("Order is cancelled");
      }

      const customer = await this.customerRepository.findById(order.customerId);
      if (!customer) {
        errors.push("Customer not found");
      } else if (customer.isActive === false) {
        errors.push("Customer is inactive");
      }

      const lines = await this.orderLineRepository.findByOrder(id);
      if (lines.length === 0) {
        errors.push("Order has no lines");
      }

      return { valid: errors.length === 0, errors };
    });
  }

  async findById(id: string): Promise<any | undefined> {
    return withTenantSession(async (tx, ctx) => {
      return this.orderRepository.findById(id);
    });
  }

  async findApproved(options: any = {}): Promise<any[]> {
    return withTenantSession(async (tx, ctx) => {
      return this.orderRepository.findApproved(options);
    });
  }
}
