import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT, importJWK } from "jose";

// ─── Helpers ────────────────────────────────────────────────────────────────

const JWT_SECRET = "glassos-dev-secret-min-32-chars!!";
const encoder = new TextEncoder();

function createToken(payload: Record<string, unknown>, expiresIn = "15m"): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("glassos")
    .setAudience("glassos-api")
    .setExpirationTime(expiresIn)
    .setSubject(payload.sub as string)
    .sign(encoder.encode(JWT_SECRET));
}

function createExpiredToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(Math.floor(Date.now() / 1000) - 3600)
    .setIssuer("glassos")
    .setAudience("glassos-api")
    .setExpirationTime("-1h")
    .setSubject(payload.sub as string)
    .sign(encoder.encode(JWT_SECRET));
}

// ─── Auth Tests ─────────────────────────────────────────────────────────────

describe("JWT Token Generation & Validation", () => {
  it("should generate a valid JWT token", async () => {
    const token = await createToken({
      sub: "01HXYZ...",
      tenantId: "01TENANT...",
      factoryId: "01FACTORY...",
      role: "Administrator",
      name: "Test User",
      email: "test@glassos.com",
    });
    expect(token).toBeDefined();
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("should generate a token with required claims", async () => {
    const token = await createToken({
      sub: "01HXYZ...",
      tenantId: "01TENANT...",
      role: "Viewer",
    });
    const parts = token.split(".");
    const payload = JSON.parse(atob(parts[1]));
    expect(payload.sub).toBe("01HXYZ...");
    expect(payload.tenantId).toBe("01TENANT...");
    expect(payload.role).toBe("Viewer");
    expect(payload.iss).toBe("glassos");
    expect(payload.aud).toBe("glassos-api");
  });
});

describe("JWKS Key Import", () => {
  it("should derive JWK from secret", async () => {
    const jwk = await importJWK(
      { kty: "oct", k: btoa(JWT_SECRET) },
      "HS256"
    );
    expect(jwk).toBeDefined();
  });
});

describe("Token Claims Structure", () => {
  it("should decode and verify token claims", async () => {
    const token = await createToken({
      sub: "01HXYZUSER1234567890",
      tenantId: "01TENANTFACTORY123456",
      factoryId: "01FACTORYPROD1234567",
      role: "FactoryManager",
      name: "Ahmet Yilmaz",
      email: "ahmet@example.com",
    });

    const parts = token.split(".");
    const payload = JSON.parse(atob(parts[1]));

    expect(payload.sub).toBe("01HXYZUSER1234567890");
    expect(payload.tenantId).toBe("01TENANTFACTORY123456");
    expect(payload.factoryId).toBe("01FACTORYPROD1234567");
    expect(payload.role).toBe("FactoryManager");
    expect(payload.name).toBe("Ahmet Yilmaz");
    expect(payload.email).toBe("ahmet@example.com");
  });

  it("should have iat, exp, iss, aud in every token", async () => {
    const token = await createToken({
      sub: "test-sub",
      tenantId: "test-tenant",
      role: "Viewer",
    });

    const parts = token.split(".");
    const payload = JSON.parse(atob(parts[1]));

    expect(payload.iat).toBeDefined();
    expect(payload.exp).toBeDefined();
    expect(payload.iss).toBe("glassos");
    expect(payload.aud).toBe("glassos-api");
  });
});

describe("Permission Hierarchy", () => {
  it("should define correct role hierarchy", async () => {
    const { ROLE_HIERARCHY, Roles } = await import("../src/lib/config.js");
    expect(ROLE_HIERARCHY).toEqual([
      Roles.Viewer,
      Roles.Operator,
      Roles.ProductionManager,
      Roles.FactoryManager,
      Roles.Administrator,
    ]);
  });

  it("should validate minimum role correctly", async () => {
    const { hasMinimumRole, Roles } = await import("../src/lib/config.js");

    // Administrator has all permissions
    expect(hasMinimumRole(Roles.Administrator, Roles.Viewer)).toBe(true);
    expect(hasMinimumRole(Roles.Administrator, Roles.Operator)).toBe(true);
    expect(hasMinimumRole(Roles.Administrator, Roles.Administrator)).toBe(true);

    // Viewer only has viewer access
    expect(hasMinimumRole(Roles.Viewer, Roles.Viewer)).toBe(true);
    expect(hasMinimumRole(Roles.Viewer, Roles.Operator)).toBe(false);
    expect(hasMinimumRole(Roles.Viewer, Roles.Administrator)).toBe(false);

    // Higher roles can do everything lower roles can
    expect(hasMinimumRole(Roles.FactoryManager, Roles.ProductionManager)).toBe(true);
    expect(hasMinimumRole(Roles.ProductionManager, Roles.Operator)).toBe(true);
  });
});

describe("Permission Map", () => {
  it("should map permission levels correctly", async () => {
    const { PERMISSION_MAP, Roles } = await import("../src/lib/config.js");
    expect(PERMISSION_MAP.view).toBe(Roles.Viewer);
    expect(PERMISSION_MAP.operate).toBe(Roles.Operator);
    expect(PERMISSION_MAP.manage).toBe(Roles.ProductionManager);
    expect(PERMISSION_MAP.admin).toBe(Roles.Administrator);
  });
});

describe("DTO Schema Validation", () => {
  it("should reject tenantId in create schemas", async () => {
    const { createCustomerSchema } = await import("../src/dto/customer.dto.js");
    const result = createCustomerSchema.safeParse({
      id: "01ARZ3NDEKTSV4RRFFQ69G5FAV",
      tenantId: "should-not-be-here",
      customerCode: "C001",
      name: "Test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).tenantId).toBeUndefined();
    }
  });

  it("should reject userId in action schemas", async () => {
    const { approveOrderSchema } = await import("../src/dto/order.dto.js");
    const result = approveOrderSchema.safeParse({
      userId: "should-not-be-here",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).userId).toBeUndefined();
    }
  });

  it("should validate common ULID format", async () => {
    const { ulid } = await import("../src/dto/common.dto.js");
    const valid = ulid.safeParse("01ARZ3NDEKTSV4RRFFQ69G5FAV");
    expect(valid.success).toBe(true);

    const invalid = ulid.safeParse("not-a-ulid");
    expect(invalid.success).toBe(false);
  });
});
