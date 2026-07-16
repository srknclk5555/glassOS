import { permissions } from "../schema/index.js";
import { BaseRepository } from "./base.repository.js";

export class PermissionRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, permissions, { softDelete: false, tenantScoped: false, factoryScoped: false });
  }
}
