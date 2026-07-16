export * from "../schema/index.js";
export * from "./client.js";
export * from "./context.js";
export * from "./errors.js";
export * from "./query.js";
export { relations as dbRelations, relationsMap as dbRelationsMap } from "./relations.js";
export * from "./transactions.js";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { createDatabaseClient } from "./client.js";
import { createDatabaseContext } from "./context.js";
import { createQueryState, defaultQueryState } from "./query.js";
import { mapDatabaseError } from "./errors.js";
import { withTenantSession, withTransaction } from "./transactions.js";
import { relations } from "./relations.js";

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
