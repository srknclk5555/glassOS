import { CustomerRepository } from "../repositories/customer.repository.js";
import { withTenantSession } from "../db/transactions.js";
import type {
  DomainEvent,
  EventPublisher,
  CustomerCreatedEvent,
  CustomerUpdatedEvent,
  CustomerDeactivatedEvent,
} from "./events.js";


export class CustomerService {
  constructor(
    private readonly customerRepository: CustomerRepository,
    private readonly eventPublisher: EventPublisher,
    private readonly db: any
  ) {}

  async create(input: {
    id: string;
    tenantId: string;
    factoryId?: string;
    customerCode: string;
    name: string;
    shortName?: string;
    taxNumber?: string;
    taxOffice?: string;
    phone?: string;
    email?: string;
    address?: string;
    city?: string;
    country?: string;
    isActive?: boolean;
    notes?: string;
  }): Promise<{ customer: any; events: CustomerCreatedEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const customer = await this.customerRepository.create({
        ...input,
        isActive: input.isActive ?? true,
      });

      const event: CustomerCreatedEvent = {
        eventType: "customer.created",
        customerId: customer.id,
        customerCode: customer.customerCode,
        name: customer.name,
        createdAt: new Date(),
      };

      return { customer, events: [event] };
    });

    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  async update(
    id: string,
    changes: Partial<{
      name: string;
      shortName: string;
      taxNumber: string;
      taxOffice: string;
      phone: string;
      email: string;
      address: string;
      city: string;
      country: string;
      notes: string;
      userId: string;
    }>
  ): Promise<{ customer: any; events: CustomerUpdatedEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const existing = await this.customerRepository.findById(id);
      if (!existing) {
        throw new Error(`Customer not found: ${id}`);
      }

      const customer = await this.customerRepository.update(id, changes);

      const changedFields = Object.keys(changes).filter(k => k !== "userId");
      const event: CustomerUpdatedEvent = {
        eventType: "customer.updated",
        customerId: id,
        changes: changedFields,
        updatedAt: new Date(),
      };

      return { customer, events: [event] };
    });

    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  async deactivate(
    id: string,
    userId?: string
  ): Promise<{ customer: any; events: CustomerDeactivatedEvent[] }> {
    const _txResult = await withTenantSession(async (tx, ctx) => {
      const existing = await this.customerRepository.findById(id);
      if (!existing) {
        throw new Error(`Customer not found: ${id}`);
      }

      const customer = await this.customerRepository.update(id, { isActive: false, userId });

      const event: CustomerDeactivatedEvent = {
        eventType: "customer.deactivated",
        customerId: id,
        deactivatedAt: new Date(),
      };

      return { customer, events: [event] };
    });

    await this.eventPublisher.publishMany(_txResult.events);
    return _txResult;
  }

  async findById(id: string): Promise<any | undefined> {
    return withTenantSession(async (tx, ctx) => {
      return this.customerRepository.findById(id);
    });
  }

  async findByCode(
    customerCode: string,
    options: any = {}
  ): Promise<any | undefined> {
    return withTenantSession(async (tx, ctx) => {
      return this.customerRepository.findByCode(customerCode, options);
    });
  }

  async validateExists(id: string): Promise<boolean> {
    return withTenantSession(async (tx, ctx) => {
      const customer = await this.customerRepository.findById(id);
      if (!customer) {
        return false;
      }
      if (customer.isActive === false) {
        return false;
      }
      return true;
    });
  }

  async findActive(options: any = {}): Promise<any[]> {
    return withTenantSession(async (tx, ctx) => {
      return this.customerRepository.findActiveCustomers(options);
    });
  }
}
