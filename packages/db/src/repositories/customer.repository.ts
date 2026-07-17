import { customers } from "../schema/index";
import { BaseRepository } from "./base.repository";

export class CustomerRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, customers, { softDelete: true, tenantScoped: true, factoryScoped: true, activeFlag: true });
  }

  // findByCode uses base class — SQL WHERE via code filter (matches code/customerCode/factoryCode columns)
  // findByName, findByPhone, findByEmail use generic filter auto-mapping to SQL WHERE

  async findByName(name: string, options: any = {}): Promise<any[]> {
    return this.list({ ...options, filters: { ...(options.filters ?? {}), name } });
  }

  async findByPhone(phone: string, options: any = {}): Promise<any[]> {
    return this.list({ ...options, filters: { ...(options.filters ?? {}), phone } });
  }

  async findActiveCustomers(options: any = {}): Promise<any[]> {
    return this.list({ ...options, activeOnly: true });
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
