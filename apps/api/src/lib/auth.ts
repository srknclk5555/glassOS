import type { Context, Next } from "hono";
import { jwtVerify, type JWTPayload } from "jose";
import { UnauthorizedError, ForbiddenError } from "./errors.js";
import { jwtConfig, Roles, hasMinimumRole, ROLE_HIERARCHY, type Role } from "./config.js";

// ─── Current User Shape ─────────────────────────────────────────────────────
// The authenticated user — extracted from JWT, never from client input.
// This is the ONLY source of identity in the system.

export interface CurrentUser {
  /** User ID (ULID) */
  sub: string;
  /** Tenant ID (ULID) — always present for non-super-admin */
  tenantId: string;
  /** Factory ID (ULID) — always present for factory-scoped users */
  factoryId: string;
  /** User's role */
  role: Role;
  /** User's display name */
  name: string;
  /** User's email */
  email: string;
}

// ─── JWT Payload (internal) ─────────────────────────────────────────────────

interface AppJwtPayload extends JWTPayload {
  tenantId?: string;
  factoryId?: string;
  role?: string;
  name?: string;
  email?: string;
}

// ─── Valid Role Set ──────────────────────────────────────────────────────────

const VALID_ROLES: ReadonlySet<string> = new Set(ROLE_HIERARCHY);

// ─── Auth Middleware ─────────────────────────────────────────────────────────
// Extracts and verifies JWT from Authorization header.
// Sets the authenticated user on context for downstream handlers.
// Validates: issuer, audience, algorithm, and role claim.

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    throw new UnauthorizedError("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);

  try {
    const { payload, protectedHeader } = await jwtVerify(
      token,
      jwtConfig.secret,
      {
        issuer: jwtConfig.issuer,
        audience: jwtConfig.audience,
        algorithms: jwtConfig.allowedAlgorithms,
      }
    ) as { payload: AppJwtPayload; protectedHeader: { alg?: string } };

    // Reject "none" algorithm (defense-in-depth)
    if (!protectedHeader.alg || protectedHeader.alg === "none") {
      throw new UnauthorizedError("Invalid token algorithm");
    }

    // Validate required claims
    if (!payload.sub || !payload.tenantId || !payload.role) {
      throw new UnauthorizedError("Invalid token payload — missing required claims (sub, tenantId, role)");
    }

    // Validate role claim against supported roles
    if (!VALID_ROLES.has(payload.role)) {
      throw new UnauthorizedError(
        `Invalid role claim: "${payload.role}". ` +
        `Supported roles: ${Array.from(VALID_ROLES).join(", ")}`
      );
    }

    const currentUser: CurrentUser = {
      sub: payload.sub,
      tenantId: payload.tenantId,
      factoryId: payload.factoryId ?? payload.tenantId,
      role: payload.role as Role,
      name: payload.name ?? "Unknown",
      email: payload.email ?? "",
    };

    c.set("currentUser", currentUser);
    await next();
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }
    throw new UnauthorizedError("Invalid or expired token");
  }
}

// ─── Helper: get current user from context ───────────────────────────────────

export function getCurrentUser(c: Context): CurrentUser {
  const user = c.get("currentUser") as CurrentUser | undefined;
  if (!user) {
    throw new UnauthorizedError("Authentication required");
  }
  return user;
}

// ─── Authorization Middleware ────────────────────────────────────────────────
// Requires the authenticated user to have at least the specified role.

export function requireRole(minimumRole: Role) {
  return async (c: Context, next: Next) => {
    const user = getCurrentUser(c);
    if (!hasMinimumRole(user.role, minimumRole)) {
      throw new ForbiddenError(
        `Insufficient role. Required: ${minimumRole}, actual: ${user.role}`
      );
    }
    await next();
  };
}

// ─── Public Route Helper ─────────────────────────────────────────────────────
// Use on routes that should be accessible without authentication.

export function skipAuth(c: Context, next: Next) {
  return next();
}
