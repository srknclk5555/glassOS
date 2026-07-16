import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index.js";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not defined.");
}

const client = postgres(process.env.DATABASE_URL);
export { client };
export const db = drizzle(client, { schema });

export * from "./schema/index.js";
export * from "./seed/index.js";
export * from "./db/index.js";
export * from "./repositories/index.js";
export * from "./services/index.js";
export * from "drizzle-orm";
