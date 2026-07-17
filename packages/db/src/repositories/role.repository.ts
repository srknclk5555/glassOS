import { roles } from "../schema/index";
import { BaseRepository } from "./base.repository";

export class RoleRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, roles, { softDelete: false, tenantScoped: false, factoryScoped: false });
  }
}
