import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { sql as drizzleSql } from "drizzle-orm";
import { AsyncLocalStorage } from "node:async_hooks";
import * as schemaTables from "../schema/index";
import { relationsMap } from "./relations";

// Build a combined schema that includes both tables and relations.
// Relation keys use "{tableName}Relations" suffix to avoid collision with table keys.
const combinedSchema = {
  ...schemaTables,
  ...Object.fromEntries(
    Object.entries(relationsMap).map(([k, v]) => [`${k}Relations`, v])
  ),
};

// ─── Default DB Client ──────────────────────────────────────────────────────
// Set once at startup so services don't need to import the client directly.
// Services call withTenantSession(callback) without passing options,
// and the default client is used automatically.

let defaultDbClient: postgres.Sql<{}> | undefined;

/** Set the default PostgreSQL client (called at API startup). */
export function setDefaultDbClient(client: postgres.Sql<{}>): void {
  defaultDbClient = client;
}

// ─── AsyncLocalStorage for Tenant Context ───────────────────────────────────
// Allows services to access tenant context without requiring it as a parameter.
// The tenant middleware stores context here before any handler runs.

const tenantContextStore = new AsyncLocalStorage<TenantSessionContext>();

/** Set tenant context for the current async context (called by middleware). */
export function setTenantContext(ctx: TenantSessionContext): void {
  tenantContextStore.enterWith(ctx);
}

/** Get the current tenant context from the async context. */
export function getTenantContext(): TenantSessionContext | undefined {
  return tenantContextStore.getStore();
}

// ─── AsyncLocalStorage for Active Transaction ───────────────────────────────
// Stores the active Drizzle transaction client so that repository operations
// executed inside withTenantSession() automatically use the SAME PostgreSQL
// connection — ensuring RLS session variables (set via set_config()) are
// visible to all repository queries within the transaction.

const activeTransactionStore = new AsyncLocalStorage<any>();

/**
 * Get the active Drizzle transaction client, if one exists in the current
 * async context. Returns undefined outside of withTenantSession().
 * Repository getDb() uses this to propagate the transaction automatically.
 */
export function getActiveDb(): any | undefined {
  return activeTransactionStore.getStore();
}

export interface TransactionContext {
  readonly kind: "transaction";
  readonly parent?: unknown;
}

export interface TenantSessionContext {
  tenantId?: string;
  factoryId?: string;
  userId?: string;
  requestId?: string;
  role?: string;
  name?: string;
  email?: string;
}

export interface TransactionLike {
  transaction?: <T>(callback: (tx: unknown) => Promise<T>) => Promise<T>;
}

export async function withTransaction<T>(
  callback: (tx: TransactionContext) => Promise<T>,
  options: { db?: TransactionLike } = {}
): Promise<T> {
  // If tenant context is available via AsyncLocalStorage, delegate to withTenantSession
  const ctx = tenantContextStore.getStore();
  if (ctx) {
    // Try to extract client from options — for proper delegation we need withTenantSession
    // but we don't have Sql client here, so fall through to basic transaction
  }

  if (options.db?.transaction) {
    return options.db.transaction(async (tx) => callback({ kind: "transaction", parent: tx }));
  }

  return callback({ kind: "transaction" });
}

/**
 * Check if a value looks like TenantSessionContext (has tenant-related fields).
 * Used to disambiguate the overloaded withTenantSession signatures.
 */
function isTenantContext(v: unknown): v is TenantSessionContext {
  if (!v || typeof v !== "object") return false;
  const obj = v as Record<string, unknown>;
  return "tenantId" in obj || "factoryId" in obj || "userId" in obj || "role" in obj || "name" in obj || "email" in obj;
}

/**
 * Execute a callback within a tenant-scoped PostgreSQL transaction.
 *
 * Sets RLS session variables (`app.current_tenant_id`, `app.current_factory_id`,
 * `app.current_user_id`, `app.current_user_role`, `app.current_user_name`)
 * via `SET LOCAL` inside a real database transaction.
 *
 * Two signatures:
 *   1. withTenantSession(callback, context, options?) — explicit context
 *   2. withTenantSession(callback, options?) — reads context from AsyncLocalStorage
 *
 * If no db client is provided, executes without RLS context (test/setup mode).
 */
export async function withTenantSession<T>(
  callback: (tx: TransactionContext, context: TenantSessionContext) => Promise<T>,
  contextOrOptions?: TenantSessionContext | { db?: { client: postgres.Sql<{}> } },
  optionsOrNothing?: { db?: { client: postgres.Sql<{}> } }
): Promise<T> {
  let context: TenantSessionContext;
  let options: { db?: { client: postgres.Sql<{}> } };

  // Disambiguate: if second arg looks like tenant context, it's signature #1
  if (isTenantContext(contextOrOptions)) {
    context = contextOrOptions;
    options = optionsOrNothing || {};
  } else {
    // Signature #2: options only, read context from AsyncLocalStorage
    context = tenantContextStore.getStore() || {};
    options = (contextOrOptions as { db?: { client: postgres.Sql<{}> } }) || {};

    // If we have a DB client but no tenant context was found in ALS,
    // this is likely a programming error — a tenant-scoped operation
    // is running outside of withTenantSession() or tenant middleware.
    // Fail fast instead of silently falling through to an unqualified query.
    if (!context.tenantId && !context.factoryId) {
      const sql = options.db?.client || defaultDbClient;
      if (sql) {
        throw new Error(
          "Tenant context is required for database operations. " +
          "Ensure the operation is wrapped in withTenantSession() or the tenant " +
          "middleware has set the context via setTenantContext(). " +
          "If this is a test, pass explicit tenant context or use FakeDb."
        );
      }
    }
  }

  const sql = options.db?.client || defaultDbClient;

  if (!sql) {
    // No database client — execute without RLS context (test/setup mode)
    return callback({ kind: "transaction" }, context);
  }

  // Use Drizzle's built-in transaction API which correctly wraps
  // postgres.js transaction objects WITHOUT accessing client.options.parsers
  // (unlike drizzle(tx, { schema }) which fails on postgres.js transaction objects).
  // The SET LOCAL calls use the drizzle sql tag to execute within the transaction.
  const db = drizzle(sql, { schema: combinedSchema });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (db.transaction(async (tx: any) => {
    // Set RLS session variables inside the transaction.
    // Drizzle PgTransaction.execute() accepts the sql template tag.
    if (context.tenantId) {
      await tx.execute(drizzleSql`SELECT set_config('app.current_tenant_id', ${context.tenantId}, true)`);
    }
    if (context.factoryId) {
      await tx.execute(drizzleSql`SELECT set_config('app.current_factory_id', ${context.factoryId}, true)`);
    }
    if (context.userId) {
      await tx.execute(drizzleSql`SELECT set_config('app.current_user_id', ${context.userId}, true)`);
    }
    if (context.role) {
      await tx.execute(drizzleSql`SELECT set_config('app.current_user_role', ${context.role}, true)`);
    }
    if (context.name) {
      await tx.execute(drizzleSql`SELECT set_config('app.current_user_name', ${context.name}, true)`);
    }

    // Run the callback with the Drizzle transaction in AsyncLocalStorage.
    // Repository getDb() checks this store first, so repository operations
    // automatically use the transaction without any service changes.
    // tx is already a valid PgTransaction instance — no need to call drizzle().
    return activeTransactionStore.run(tx, () => {
      return callback({ kind: "transaction", parent: tx }, context);
    });
  })) as Promise<T>;
}
