import { users } from "../schema/index.js";
import { BaseRepository } from "./base.repository.js";

export class UserRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, users, { softDelete: true, tenantScoped: true, factoryScoped: true });
  }
}
