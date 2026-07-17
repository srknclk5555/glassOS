import { productionQueues } from "../schema/index";
import { BaseRepository } from "./base.repository";

export class ProductionQueueRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, productionQueues, { softDelete: false, tenantScoped: true, factoryScoped: true, activeFlag: true });
  }

  async findActiveQueues(options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      activeOnly: true,
    });
  }

  async findQueueByStation(stationId: string, options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), stationId },
    });
  }

  async findQueueByOperation(operationCode: string, options: any = {}): Promise<any[]> {
    return this.list({
      ...options,
      filters: { ...(options.filters ?? {}), operationCode },
    });
  }

  async findStationOperationQueue(
    stationId: string,
    operationCode: string,
    options: any = {}
  ): Promise<any | undefined> {
    const rows = await this.list({
      ...options,
      filters: { ...(options.filters ?? {}), stationId, operationCode },
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
