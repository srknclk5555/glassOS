import { machines } from "../schema/index";
import { BaseRepository } from "./base.repository";

export class MachineRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, machines, { softDelete: true, tenantScoped: true, factoryScoped: true, activeFlag: true });
  }

  async findByCode(code: string, options: any = {}): Promise<any> {
    const results = await this.list({ ...options, filters: { ...(options.filters ?? {}), machineCode: code } });
    return results[0];
  }

  async findByType(type: string, options: any = {}): Promise<any[]> {
    return this.list({ ...options, filters: { ...(options.filters ?? {}), machineType: type } });
  }

  async findByStatus(status: string, options: any = {}): Promise<any[]> {
    return this.list({ ...options, filters: { ...(options.filters ?? {}), status } });
  }

  async findByFactory(factoryId: string, options: any = {}): Promise<any[]> {
    return this.list({ ...options, filters: { ...(options.filters ?? {}), factoryId } });
  }

  async countByStatus(options: any = {}): Promise<Record<string, number>> {
    const all = await this.list({ ...options, includeDeleted: false });
    const counts: Record<string, number> = {};
    for (const m of all) {
      const s = m.status ?? "unknown";
      counts[s] = (counts[s] ?? 0) + 1;
    }
    return counts;
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
