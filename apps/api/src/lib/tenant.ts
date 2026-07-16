import type { Context, Next } from "hono";
import { getCurrentUser } from "./auth.js";
import { setTenantContext, type TenantSessionContext } from "@repo/db";

// ─── Tenant Middleware ──────────────────────────────────────────────────────
// Stores the authenticated user's tenant context in AsyncLocalStorage
// so that downstream services can access it implicitly via withTenantSession().
//
// Architecture:
//   API → authMiddleware (JWT) → tenantMiddleware (ALS store) →
//   Controller → Service → withTenantSession(cb, {db:{client}}) → DB
//
// Each service method wraps its DB operations in withTenantSession() which:
//   1. Reads tenant context from AsyncLocalStorage
//   2. Starts a PostgreSQL transaction via sql.begin()
//   3. Sets RLS session variables via SET LOCAL
//   4. Executes the business logic
//   5. Commits (or rolls back on error)

export function tenantMiddleware() {
  return async (c: Context, next: Next) => {
    const user = getCurrentUser(c);

    const tenantContext: TenantSessionContext = {
      tenantId: user.tenantId,
      factoryId: user.factoryId,
      userId: user.sub,
      role: user.role,
      name: user.name,
      email: user.email,
    };

    // Store in AsyncLocalStorage so services can read it
    setTenantContext(tenantContext);

    await next();
  };
}
