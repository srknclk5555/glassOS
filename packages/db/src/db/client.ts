import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

export interface DatabaseClientConfig {
  connectionString?: string;
  max?: number;
  idle_timeout?: number;
  connect_timeout?: number;
}

export interface DatabaseClient {
  client: postgres.Sql<{}>;
  db: ReturnType<typeof drizzle>;
}

export function createDatabaseClient(
  connectionString = process.env.DATABASE_URL ?? "",
  config: DatabaseClientConfig = {}
): DatabaseClient {
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not defined.");
  }

  const client = postgres(connectionString, {
    max: config.max ?? 10,
    idle_timeout: config.idle_timeout ?? 20,
    connect_timeout: config.connect_timeout ?? 10,
  });

  const db = drizzle(client);

  return { client, db };
}
