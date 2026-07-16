import { roles } from "../schema/index.js";
import { BaseRepository } from "./base.repository.js";

export class RoleRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, roles, { softDelete: false, tenantScoped: false, factoryScoped: false });
  }
}
