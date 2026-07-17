import { factories } from "../schema/index";
import { BaseRepository } from "./base.repository";

export class FactoryRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, factories, { softDelete: true, tenantScoped: true, factoryScoped: true });
  }
}
