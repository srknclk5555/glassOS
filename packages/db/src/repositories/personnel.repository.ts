import { personnel } from "../schema/index";
import { BaseRepository } from "./base.repository";

export class PersonnelRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, personnel, { softDelete: true, tenantScoped: true, factoryScoped: true, activeFlag: true });
  }
}
