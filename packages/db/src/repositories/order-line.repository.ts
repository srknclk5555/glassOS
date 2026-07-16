import { orderLines } from "../schema/index.js";
import { BaseRepository } from "./base.repository.js";

export class OrderLineRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, orderLines, { softDelete: false, tenantScoped: false, factoryScoped: false });
  }

  async findByOrder(orderId: string, options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), orderId },
    });
  }

  async findIncompleteLines(orderId: string, options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), orderId, incompleteOnly: true },
    });
  }

  async findBrokenLines(orderId: string, options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), orderId, hasBroken: true },
    });
  }

  async findWaitingRework(orderId: string, options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), orderId, waitingRework: true },
    });
  }

  async countByOrder(orderId: string, options: any = {}): Promise<number> {
    const lines = await this.findByOrder(orderId, options);
    return lines.length;
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
