import { personnel } from "../schema/index.js";
import { BaseRepository } from "./base.repository.js";

export class PersonnelRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, personnel, { softDelete: true, tenantScoped: true, factoryScoped: true, activeFlag: true });
  }
}
