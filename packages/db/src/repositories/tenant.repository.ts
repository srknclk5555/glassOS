import { tenants } from "../schema/index.js";
import { BaseRepository } from "./base.repository.js";

export class TenantRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, tenants, { softDelete: false, tenantScoped: false, factoryScoped: false });
  }
}
