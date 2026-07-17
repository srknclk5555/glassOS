import { permissions } from "../schema/index";
import { BaseRepository } from "./base.repository";

export class PermissionRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, permissions, { softDelete: false, tenantScoped: false, factoryScoped: false });
  }
}
