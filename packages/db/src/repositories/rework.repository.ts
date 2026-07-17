import { reworkOrders } from "../schema/index";
import { BaseRepository } from "./base.repository";

export class ReworkRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, reworkOrders, { softDelete: true, tenantScoped: true, factoryScoped: true });
  }

  async findOpenReworks(options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), reworkStatus: "pending" },
    });
  }

  async findByParentOrder(parentProductionOrderId: string, options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), parentProductionOrderId },
    });
  }

  async findWaitingCutting(options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), reworkStatus: "in_cutting" },
    });
  }

  async findCompletedReworks(options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), reworkStatus: "completed" },
    });
  }

  async findByBreakageEvent(breakageEventId: string, options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), breakageEventId },
    });
  }

  async findFireDepotItems(options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), internalCustomer: "fire_depot" },
    });
  }

  async findScrapItems(options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), internalCustomer: "scrap_depot" },
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
