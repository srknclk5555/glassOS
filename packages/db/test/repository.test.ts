import { describe, expect, it } from "vitest";
import { is, Param, SQL } from "drizzle-orm";
import { TenantRepository } from "../src/repositories/tenant.repository.js";
import { FactoryRepository } from "../src/repositories/factory.repository.js";
import { UserRepository } from "../src/repositories/user.repository.js";
import { RoleRepository } from "../src/repositories/role.repository.js";
import { PermissionRepository } from "../src/repositories/permission.repository.js";
import { PersonnelRepository } from "../src/repositories/personnel.repository.js";

class FakeDb {
  public state: Array<Record<string, unknown>> = [];
  public calls: Array<string> = [];
  private whereConditions: Array<(row: Record<string, unknown>) => boolean> = [];

  private extractWherePredicate(condition: unknown): (row: Record<string, unknown>) => boolean {
    // Drizzle 0.39+ stores params in Param instances inside queryChunks.
    // Walk the queryChunks tree to collect all primitive values.
    const params = this.collectParams(condition);

    // Filter to primitive values that can be used for column matching
    const primitiveParams = params.filter(
      (p): p is string | number | boolean =>
        typeof p === "string" || typeof p === "number" || typeof p === "boolean"
    );

    if (primitiveParams.length === 0) {
      return () => true;
    }

    // Match: ALL primitive params must find a matching column in the row
    // This correctly handles AND conditions where multiple values must match
    return (row: Record<string, unknown>) =>
      primitiveParams.every((param) =>
        Object.values(row).some((v) => String(v) === String(param))
      );
  }

  private collectParams(chunk: unknown, collected: unknown[] = []): unknown[] {
    if (!chunk || typeof chunk !== "object") return collected;

    if (is(chunk, Param)) {
      collected.push((chunk as any).value);
    } else if (is(chunk, SQL)) {
      const sql = chunk as any;
      if (Array.isArray(sql.queryChunks)) {
        for (const subChunk of sql.queryChunks) {
          this.collectParams(subChunk, collected);
        }
      }
    }

    return collected;
  }

  select() {
    this.whereConditions = [];
    const self = this;

    const query = {
      from: () => query,
      where: (condition: unknown) => {
        self.whereConditions.push(self.extractWherePredicate(condition));
        return query;
      },
      orderBy: () => query,
      limit: () => query,
      offset: () => query,
      execute: async () => {
        if (self.whereConditions.length > 0) {
          return self.state.filter((row) =>
            self.whereConditions.every((pred) => pred(row))
          );
        }
        return self.state;
      },
    };

    return query;
  }

  insert(table: { name?: string }) {
    return {
      values: (values: Record<string, unknown>) => ({
        returning: () => ({
          execute: async () => {
            const row = { ...values, id: (values.id as string) ?? "01ARZ3NDEKTSV4RRFFQ69G5FAV" };
            this.state.push(row);
            this.calls.push(`insert:${table.name ?? "table"}`);
            return [row];
          },
        }),
      }),
    };
  }

  update(table: { name?: string }) {
    return {
      set: (values: Record<string, unknown>) => {
        const builder = {
          where: () => builder,
          returning: () => ({
            execute: async () => {
              const id = (values.id as string) ?? "";
              const index = this.state.findIndex((row) => row.id === id);
              if (index >= 0) {
                this.state[index] = { ...this.state[index], ...values };
              }
              this.calls.push(`update:${table.name ?? "table"}`);
              return index >= 0 ? [this.state[index]] : [];
            },
          }),
        };

        return builder;
      },
    };
  }

  delete() {
    return {
      where: () => ({
        execute: async () => {
          this.calls.push("delete");
          return [];
        },
      }),
    };
  }
}

describe("repository layer", () => {
  it("supports create, update, find, soft delete, and restore for tenants", async () => {
    const db = new FakeDb();
    const repository = new TenantRepository(db as never);

    const created = await repository.create({
      id: "01TENANT000000000000000001",
      name: "North Glass",
      slug: "north-glass",
      plan: "growth",
    });

    expect(created.name).toBe("North Glass");

    const updated = await repository.update(created.id, { name: "North Glass Co" });
    expect(updated.name).toBe("North Glass Co");

    const found = await repository.findById(created.id);
    expect(found?.name).toBe("North Glass Co");

    const deleted = await repository.softDelete(created.id, { userId: "01USER000000000000000001" });
    expect(deleted.deletedAt).toBeDefined();

    const restored = await repository.restore(created.id, { userId: "01USER000000000000000001" });
    expect(restored.deletedAt).toBeNull();
  });

  it("supports tenant and factory isolation for factories", async () => {
    const db = new FakeDb();
    const repository = new FactoryRepository(db as never);

    const f1 = await repository.create({
      id: "01FACTORY0000000000000001",
      tenantId: "01TENANT000000000000000001",
      factoryCode: "PLT-01",
      name: "Plant 1",
    });
    const f2 = await repository.create({
      id: "01FACTORY0000000000000002",
      tenantId: "01TENANT000000000000000002",
      factoryCode: "PLT-02",
      name: "Plant 2",
    });

    expect(db.state).toHaveLength(2);

    const tenant1Factories = await repository.findByTenant("01TENANT000000000000000001");
    const tenant2Factories = await repository.findByTenant("01TENANT000000000000000002");

    expect(tenant1Factories).toHaveLength(1);
    expect(tenant1Factories[0]?.id).toBe(f1.id);
    expect(tenant2Factories).toHaveLength(1);
    expect(tenant2Factories[0]?.factoryCode).toBe("PLT-02");
  });

  it("supports searching, pagination, and sorting for users", async () => {
    const db = new FakeDb();
    const repository = new UserRepository(db as never);

    const u1 = await repository.create({
      id: "01USER000000000000000001",
      tenantId: "01TENANT000000000000000001",
      factoryId: "01FACTORY0000000000000001",
      roleId: "01ROLE000000000000000001",
      name: "Alice Johnson",
      email: "alice@example.com",
      passwordHash: "hash-a",
    });
    const u2 = await repository.create({
      id: "01USER000000000000000002",
      tenantId: "01TENANT000000000000000001",
      factoryId: "01FACTORY0000000000000001",
      roleId: "01ROLE000000000000000001",
      name: "Bob Smith",
      email: "bob@example.com",
      passwordHash: "hash-b",
    });

    expect(db.state).toHaveLength(2);

    const page = await repository.paginate({
      tenantId: "01TENANT000000000000000001",
      search: "bob",
      page: 1,
      pageSize: 1,
      sortBy: "name",
      sortOrder: "asc",
    });

    expect(page.items).toHaveLength(1);
    expect(page.items[0]?.name).toBe("Bob Smith");
    expect(page.total).toBe(1);
  });

  it("supports role and permission repository queries without business logic", async () => {
    const roleDb = new FakeDb();
    const permissionDb = new FakeDb();
    const roleRepository = new RoleRepository(roleDb as never);
    const permissionRepository = new PermissionRepository(permissionDb as never);

    const role = await roleRepository.create({
      id: "01ROLE000000000000000001",
      name: "tenant_admin",
      description: "Tenant admin",
    });
    const permission = await permissionRepository.create({
      id: "01PERM000000000000000001",
      name: "manage_users",
      description: "Manage users",
    });

    const foundRole = await roleRepository.findById(role.id);
    const foundPermission = await permissionRepository.findById(permission.id);

    expect(foundRole?.name).toBe("tenant_admin");
    expect(foundPermission?.name).toBe("manage_users");
  });

  it("supports personnel repository creation and factory-scoped filtering", async () => {
    const db = new FakeDb();
    const repository = new PersonnelRepository(db as never);

    const p1 = await repository.create({
      id: "01PERSONNEL00000000000001",
      tenantId: "01TENANT000000000000000001",
      factoryId: "01FACTORY0000000000000001",
      personnelCode: "P-101",
      firstName: "Arda",
      lastName: "Yilmaz",
      role: "operator",
      isActive: true,
    });

    const filtered = await repository.findByFactory("01FACTORY0000000000000001");
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.personnelCode).toBe("P-101");
  });
});
