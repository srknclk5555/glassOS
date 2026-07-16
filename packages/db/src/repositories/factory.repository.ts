import { factories } from "../schema/index.js";
import { BaseRepository } from "./base.repository.js";

export class FactoryRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, factories, { softDelete: true, tenantScoped: true, factoryScoped: true });
  }
}
