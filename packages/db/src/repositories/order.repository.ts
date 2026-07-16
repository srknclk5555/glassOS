import { orders } from "../schema/index.js";
import { BaseRepository } from "./base.repository.js";

export class OrderRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, orders, { softDelete: true, tenantScoped: true, factoryScoped: true });
  }

  async findPendingApproval(options: any = {}): Promise<any[]> {
    return this.findByStatus("draft", options);
  }

  async findApproved(options: any = {}): Promise<any[]> {
    return this.findByStatus("confirmed", options);
  }

  async findWaitingProduction(options: any = {}): Promise<any[]> {
    return this.findByStatus("in_production", options);
  }

  async findReadyForDispatch(options: any = {}): Promise<any[]> {
    return this.findByStatus("completed", options);
  }

  async findByCustomer(customerId: string, options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), customerId },
    });
  }

  async findByOrderNumber(orderNumber: string, options: any = {}): Promise<any | undefined> {
    const rows = await this.list({
      ...options,
      filters: { ...(options.filters ?? {}), orderNumber },
    });
    return rows[0];
  }

  async findByDateRange(startDate: Date, endDate: Date, options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), startDate, endDate },
    });
  }

  async count(options: any = {}): Promise<number> {
    const all = await this.list(options);
    return all.length;
  }

  async exists(id: string, options: any = {}): Promise<boolean> {
    const found = await this.findById(id, options);
    return found !== undefined;
  }
}
