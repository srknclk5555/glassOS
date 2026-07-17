import { ProductionRepository } from "../repositories/production.repository";
import { withTenantSession } from "../db/transactions";

import type { ProductionTransferredEvent, EventPublisher } from "./events";

export class ProductionService {
  constructor(
    private readonly productionRepository: ProductionRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly db: any
  ) {}

  async createProductionOrder(input: {
    id: string;
    tenantId: string;
    factoryId?: string;
    orderLineId: string;
    glassBarcode: string;
    widthMm: number;
    heightMm: number;
    productType?: string;
    currentOperation?: string;
    currentStationId?: string;
    currentStatus?: string;
    isRework?: boolean;
    revisionNumber?: number;
  }): Promise<any> {
    return withTenantSession(async (tx, ctx) => {
      return this.productionRepository.create({
        ...input,
        currentOperation: input.currentOperation ?? "cutting",
        currentStatus: input.currentStatus ?? "pending",
        isRework: input.isRework ?? false,
        revisionNumber: input.revisionNumber ?? 0,
      });
    });
  }

  async findById(id: string): Promise<any | undefined> {
    return withTenantSession(async (tx, ctx) => {
      return this.productionRepository.findById(id);
    });
  }

  async findByOrderLine(orderLineId: string): Promise<any[]> {
    return withTenantSession(async (tx, ctx) => {
      return this.productionRepository.findByOrderLine(orderLineId);
    });
  }

  async findPendingCutting(options: any = {}): Promise<any[]> {
    return withTenantSession(async (tx, ctx) => {
      return this.productionRepository.list({
        ...options,
        filters: {
          ...(options.filters ?? {}),
          currentOperation: "cutting",
          currentStatus: "pending",
        },
      });
    });
  }

  async assignToStation(
    id: string,
    stationId: string,
    options: { userId?: string } = {}
  ): Promise<any> {
    return withTenantSession(async (tx, ctx) => {
      const prod = await this.productionRepository.findById(id);
      if (!prod) {
        throw new Error(`Production order not found: ${id}`);
      }

      // Validate station is active — we can only check existence via the stationId
      if (!stationId) {
        throw new Error(`Invalid station: ${stationId}`);
      }

      return this.productionRepository.update(id, {
        currentStationId: stationId,
        userId: options.userId,
      });
    });
  }

  async transferProduction(
    id: string,
    targetStationId: string,
    targetOperation: string,
    options: { userId?: string } = {}
  ): Promise<{ production: any; events: ProductionTransferredEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const prod = await this.productionRepository.findById(id);
      if (!prod) {
        throw new Error(`Production order not found: ${id}`);
      }

      if (!targetStationId) {
        throw new Error(`Invalid target station: ${targetStationId}`);
      }

      const previousStationId = prod.currentStationId;

      const updated = await this.productionRepository.update(id, {
        currentStationId: targetStationId,
        currentOperation: targetOperation,
        userId: options.userId,
      });

      const event: ProductionTransferredEvent = {
        eventType: "production.transferred",
        productionOrderId: id,
        fromStationId: previousStationId ?? null,
        toStationId: targetStationId,
        transferredAt: new Date(),
      };

      return { production: updated, events: [event] };
    });
    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  async updateStatus(
    id: string,
    status: string,
    options: { userId?: string } = {}
  ): Promise<any> {
    return withTenantSession(async (tx, ctx) => {
      const prod = await this.productionRepository.findById(id);
      if (!prod) {
        throw new Error(`Production order not found: ${id}`);
      }

      const validTransitions: Record<string, string[]> = {
        pending: ["in_progress", "cancelled"],
        in_progress: ["completed", "broken", "rework"],
        broken: ["rework", "cancelled"],
        rework: ["in_progress", "completed"],
        completed: [],
        cancelled: [],
      };

      const allowed = validTransitions[prod.currentStatus] ?? [];
      if (allowed.length > 0 && !allowed.includes(status)) {
        throw new Error(
          `Invalid status transition: ${prod.currentStatus} → ${status} for production order ${id}`
        );
      }

      const changes: any = {
        currentStatus: status,
        userId: options.userId,
      };

      if (status === "completed") {
        changes.completedAt = new Date();
      }

      return this.productionRepository.update(id, changes);
    });
  }

  async validateProduction(id: string): Promise<{ valid: boolean; errors: string[] }> {
    return withTenantSession(async (tx, ctx) => {
      const errors: string[] = [];
      const prod = await this.productionRepository.findById(id);
      if (!prod) {
        return { valid: false, errors: ["Production order not found"] };
      }
      return { valid: errors.length === 0, errors };
    });
  }
}
