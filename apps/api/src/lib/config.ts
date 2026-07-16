// ─── JWT Configuration ─────────────────────────────────────────────────────
// Single source of truth for JWT settings.
// All values come from environment — never hardcoded.
// Production must fail-fast if required values are missing.

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(
      `[CONFIG] Missing required environment variable: ${key}. ` +
      `GlassOS cannot start without it.`
    );
  }
  return value;
}

export const jwtConfig = {
  /** JWT signing secret. Must be at least 32 chars. Fails fast if missing. */
  get secret() {
    const raw = requireEnv("JWT_SECRET");
    if (raw.length < 32) {
      throw new Error(
        `[CONFIG] JWT_SECRET must be at least 32 characters. ` +
        `Current length: ${raw.length}.`
      );
    }
    return new TextEncoder().encode(raw);
  },

  /** Access token expiry */
  get accessTokenExpiresIn() {
    return process.env.JWT_ACCESS_EXPIRES ?? "15m";
  },

  /** Issuer claim — must be set explicitly */
  get issuer() {
    return requireEnv("JWT_ISSUER");
  },

  /** Audience claim — must be set explicitly */
  get audience() {
    return requireEnv("JWT_AUDIENCE");
  },

  /** Allowed signing algorithms */
  get allowedAlgorithms(): string[] {
    const raw = process.env.JWT_ALLOWED_ALGORITHMS ?? "HS256,HS384,HS512,RS256,RS384,RS512";
    return raw.split(",").map((a) => a.trim()).filter(Boolean);
  },
} as const;

// ─── Application Roles ─────────────────────────────────────────────────────
// Maps to the roles defined in the database schema.

export const Roles = {
  Administrator: "Administrator",
  FactoryManager: "Factory Manager",
  ProductionManager: "Production Manager",
  Operator: "Operator",
  Viewer: "Viewer",
} as const;

export type Role = (typeof Roles)[keyof typeof Roles];

/** Role hierarchy — higher index = more privileges */
export const ROLE_HIERARCHY: Role[] = [
  Roles.Viewer,
  Roles.Operator,
  Roles.ProductionManager,
  Roles.FactoryManager,
  Roles.Administrator,
];

/** Minimum role required for a permission level */
export type PermissionLevel = "view" | "operate" | "manage" | "admin";

export function hasMinimumRole(userRole: Role, minimum: Role): boolean {
  const userIdx = ROLE_HIERARCHY.indexOf(userRole);
  const minIdx = ROLE_HIERARCHY.indexOf(minimum);
  if (userIdx === -1 || minIdx === -1) return false;
  return userIdx >= minIdx;
}

/** Map permission levels to minimum roles */
export const PERMISSION_MAP: Record<PermissionLevel, Role> = {
  view: Roles.Viewer,
  operate: Roles.Operator,
  manage: Roles.ProductionManager,
  admin: Roles.Administrator,
};
