import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema/index";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not defined.");
}

const client = postgres(process.env.DATABASE_URL);
export { client };

export const db = drizzle(client, { schema });

export * from "./schema/index";
export * from "./seed/index";
export * from "./db/index";
export * from "./repositories/index";
export * from "./services/index";
export * from "drizzle-orm";
