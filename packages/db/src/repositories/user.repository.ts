import { users } from "../schema/index";
import { BaseRepository } from "./base.repository";

export class UserRepository extends BaseRepository<any> {
  constructor(db: any) {
    super(db, users, { softDelete: true, tenantScoped: true, factoryScoped: true });
  }
}
