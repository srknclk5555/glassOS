export * from "../schema/index";
export * from "./client";
export * from "./context";
export * from "./errors";
export * from "./query";
export { relations as dbRelations, relationsMap as dbRelationsMap } from "./relations";
export * from "./transactions";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createDatabaseClient } from "./client";
import { createDatabaseContext } from "./context";
import { createQueryState, defaultQueryState } from "./query";
import { mapDatabaseError } from "./errors";
import { withTenantSession, withTransaction } from "./transactions";
import { relations } from "./relations";

const connectionString = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/glassos";

export const db = createDatabaseClient(connectionString);

export const infrastructure = {
  createDatabaseClient,
  createDatabaseContext,
  createQueryState,
  defaultQueryState,
  mapDatabaseError,
  withTenantSession,
  withTransaction,
  relations,
};

export type DrizzleDb = ReturnType<typeof drizzle>;
export type PostgresClient = postgres.Sql<{}>;
