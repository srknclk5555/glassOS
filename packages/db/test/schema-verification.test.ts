import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as schema from "../src/schema/index.js";
import { buildSeedPlan, referenceDataByKind } from "../src/seed/foundation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function getTableName(value: unknown): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const symbol = Object.getOwnPropertySymbols(value).find((candidate) =>
    candidate.toString().includes("drizzle:BaseName")
  );

  if (symbol) {
    return String((value as Record<symbol, string>)[symbol]);
  }

  if ("name" in value && typeof (value as { name?: unknown }).name === "string") {
    return (value as { name: string }).name;
  }

  return undefined;
}

describe("database schema verification", () => {
  it("exports the core aggregate tables required by the blueprint", () => {
    const tableNames = Object.values(schema)
      .map(getTableName)
      .filter((name): name is string => Boolean(name))
      .sort();

    expect(tableNames).toEqual(
      expect.arrayContaining([
        "tenants",
        "factories",
        "users",
        "roles",
        "permissions",
        "customers",
        "personnel",
        "machines",
        "stations",
        "materials",
        "products",
        "recipes",
        "inventory_items",
        "orders",
        "production_orders",
        "production_queues",
        "rework_orders",
        "factory_configurations",
        "audit_logs",
      ])
    );
  });

  it("keeps migration files aligned with the core table surface", () => {
    const migrationsDir = join(__dirname, "..", "migrations");
    const migrationFiles = readdirSync(migrationsDir)
      .filter((file) => file.endsWith(".sql"))
      .sort();

    const combinedSql = migrationFiles
      .map((file) => readFileSync(join(migrationsDir, file), "utf8"))
      .join("\n")
      .toLowerCase();

    expect(combinedSql).toContain('create table "tenants"');
    expect(combinedSql).toContain('create table "production_queues"');
    expect(combinedSql).toContain('create table "audit_logs"');
  });
});

describe("database seed foundation", () => {
  it("exports reference seed groups for system-level data", () => {
    expect(referenceDataByKind).toEqual(
      expect.objectContaining({
        roles: expect.any(Array),
        permissions: expect.any(Array),
        machineTypes: expect.any(Array),
        stationTypes: expect.any(Array),
        personnelTitles: expect.any(Array),
        bloodGroups: expect.any(Array),
        inventoryUnits: expect.any(Array),
        statusValues: expect.any(Array),
      })
    );
  });

  it("builds a deterministic seed plan with grouped domains", () => {
    const plan = buildSeedPlan();

    expect(plan.length).toBeGreaterThan(0);
    expect(plan[0]).toEqual(
      expect.objectContaining({
        domain: expect.any(String),
        kind: expect.any(String),
        items: expect.any(Array),
      })
    );
  });
});
