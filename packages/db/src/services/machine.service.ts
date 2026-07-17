import { MachineRepository } from "../repositories/machine.repository";
import { withTenantSession } from "../db/transactions";
import type {
  DomainEvent,
  EventPublisher,
  MachineCreatedEvent,
  MachineUpdatedEvent,
  MachineDeactivatedEvent,
  MachineStatusChangedEvent,
} from "./events";

export class MachineService {
  constructor(
    private readonly machineRepository: MachineRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly db: any
  ) {}

  async create(input: {
    id: string;
    tenantId: string;
    factoryId?: string;
    stationId?: string;
    machineCode: string;
    name: string;
    machineType: string;
    brand?: string;
    model?: string;
    serialNumber?: string;
    manufactureYear?: number;
    purchasedAt?: string;
    commissionedAt?: string;
    warrantyStartsAt?: string;
    warrantyEndsAt?: string;
    status?: string;
    hourlyCapacity?: number;
    dailyCapacity?: number;
    maxGlassWidthMm?: number;
    maxGlassHeightMm?: number;
    maxThicknessMm?: number;
    minThicknessMm?: number;
    isActive?: boolean;
    notes?: string;
    userId?: string;
  }): Promise<{ machine: any; events: MachineCreatedEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const machine = await this.machineRepository.create({
        ...input,
        isActive: input.isActive ?? true,
        status: input.status ?? "active",
      });

      const event: MachineCreatedEvent = {
        eventType: "machine.created",
        machineId: machine.id,
        machineCode: machine.machineCode,
        name: machine.name,
        machineType: machine.machineType,
        createdAt: new Date(),
      };

      return { machine, events: [event] };
    });

    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  async update(
    id: string,
    changes: Partial<{
      name: string;
      factoryId: string;
      stationId: string;
      machineCode: string;
      machineType: string;
      brand: string;
      model: string;
      serialNumber: string;
      manufactureYear: number;
      purchasedAt: string;
      commissionedAt: string;
      warrantyStartsAt: string;
      warrantyEndsAt: string;
      hourlyCapacity: number;
      dailyCapacity: number;
      maxGlassWidthMm: number;
      maxGlassHeightMm: number;
      maxThicknessMm: number;
      minThicknessMm: number;
      notes: string;
      userId: string;
    }>
  ): Promise<{ machine: any; events: MachineUpdatedEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const existing = await this.machineRepository.findById(id);
      if (!existing) {
        throw new Error(`Machine not found: ${id}`);
      }

      const machine = await this.machineRepository.update(id, changes);

      const changedFields = Object.keys(changes).filter(k => k !== "userId");
      const event: MachineUpdatedEvent = {
        eventType: "machine.updated",
        machineId: id,
        changes: changedFields,
        updatedAt: new Date(),
      };

      return { machine, events: [event] };
    });

    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  async changeStatus(
    id: string,
    newStatus: string,
    userId?: string
  ): Promise<{ machine: any; events: DomainEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const existing = await this.machineRepository.findById(id);
      if (!existing) {
        throw new Error(`Machine not found: ${id}`);
      }

      const oldStatus = existing.status;
      const machine = await this.machineRepository.update(id, { status: newStatus, userId });

      const events: DomainEvent[] = [
        {
          eventType: "machine.status.changed",
          machineId: id,
          fromStatus: oldStatus,
          toStatus: newStatus,
          changedAt: new Date(),
        } as MachineStatusChangedEvent,
      ];

      return { machine, events };
    });

    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  async deactivate(
    id: string,
    userId?: string
  ): Promise<{ machine: any; events: MachineDeactivatedEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const existing = await this.machineRepository.findById(id);
      if (!existing) {
        throw new Error(`Machine not found: ${id}`);
      }

      const machine = await this.machineRepository.update(id, { isActive: false, userId });

      const event: MachineDeactivatedEvent = {
        eventType: "machine.deactivated",
        machineId: id,
        deactivatedAt: new Date(),
      };

      return { machine, events: [event] };
    });

    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  async activate(
    id: string,
    userId?: string
  ): Promise<{ machine: any; events: MachineUpdatedEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const existing = await this.machineRepository.findById(id);
      if (!existing) {
        throw new Error(`Machine not found: ${id}`);
      }

      const machine = await this.machineRepository.update(id, { isActive: true, userId });

      const event: MachineUpdatedEvent = {
        eventType: "machine.updated",
        machineId: id,
        changes: ["isActive"],
        updatedAt: new Date(),
      };

      return { machine, events: [event] };
    });

    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  async findById(id: string): Promise<any | undefined> {
    return this.machineRepository.findById(id);
  }

  async list(options: any = {}): Promise<any[]> {
    return this.machineRepository.list(options);
  }

  async countByStatus(): Promise<Record<string, number>> {
    return this.machineRepository.countByStatus();
  }

  async count(options?: any): Promise<number> {
    return this.machineRepository.count(options);
  }
}
