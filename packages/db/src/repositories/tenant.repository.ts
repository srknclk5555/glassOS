import { tenants } from "../schema/index";
import { BaseRepository } from "./base.repository";

export class TenantRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, tenants, { softDelete: false, tenantScoped: false, factoryScoped: false });
  }
}
