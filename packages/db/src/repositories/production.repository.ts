import { productionOrders } from "../schema/index.js";
import { BaseRepository } from "./base.repository.js";

export class ProductionRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, productionOrders, { softDelete: true, tenantScoped: true, factoryScoped: true });
  }

  async findActiveProduction(options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), currentStatus: "in_progress" },
    });
  }

  async findWaitingStation(stationId: string, options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), currentStationId: stationId, currentStatus: "pending" },
    });
  }

  async findCompletedProduction(options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), currentStatus: "completed" },
    });
  }

  async findBrokenProduction(options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), currentStatus: "broken" },
    });
  }

  async findByStation(stationId: string, options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), currentStationId: stationId },
    });
  }

  async findByMachine(machineId: string, options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: {
        ...(options.filters ?? {}),
        operationIn: ["grinding", "tempering", "cnc", "drilling", "washing", "painting", "sandblasting"],
      },
    });
  }

  async findByOrderLine(orderLineId: string, options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), orderLineId },
    });
  }

  async findReworkItems(options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), isRework: true },
    });
  }

  async findByBarcode(glassBarcode: string, options: any = {}): Promise<any | undefined> {
    const rows = await this.list({
      ...options,
      filters: { ...(options.filters ?? {}), glassBarcode },
    });
    return rows[0];
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
