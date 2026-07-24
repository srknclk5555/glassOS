import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schemaTables from "./schema/index";
import { relationsMap } from "./db/relations";
console.log("DATABASE_URL:", !!process.env.DATABASE_URL);
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not defined.");
}

const client = postgres(process.env.DATABASE_URL);
export { client };

// Combine tables and relations into a single schema object.
// Relation keys use "{tableName}Relations" suffix to avoid collision with table keys.
const schema = {
  ...schemaTables,
  ...Object.fromEntries(
    Object.entries(relationsMap).map(([k, v]) => [`${k}Relations`, v])
  ),
};

export const db = drizzle(client, { schema });

export * from "./schema/index";
export * from "./seed/index";
export * from "./db/index";
export * from "./domain/index";
export * from "./repositories/index";
export * from "./services/index";
export * from "drizzle-orm";
