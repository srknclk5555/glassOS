import { cache } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "./session";
import { db, roles, users } from "@repo/db";
import { eq } from "drizzle-orm";

export type Permission = "tenants:read" | "tenants:write" | "factories:read" | "factories:write" | "users:read" | "users:write" | "machines:read" | "machines:write" | "stations:read" | "stations:write" | "personnel:read" | "personnel:write";

const permissionMap: Record<string, Permission[]> = {
  super_admin: ["tenants:read", "tenants:write", "factories:read", "factories:write", "users:read", "users:write", "machines:read", "machines:write", "stations:read", "stations:write", "personnel:read", "personnel:write"],
  tenant_admin: ["factories:read", "factories:write", "users:read", "users:write", "machines:read", "machines:write", "stations:read", "stations:write", "personnel:read", "personnel:write"],
  factory_manager: ["factories:read", "users:read", "machines:read", "machines:write", "stations:read", "stations:write", "personnel:read", "personnel:write"],
  production_manager: ["factories:read", "machines:read", "machines:write", "stations:read", "stations:write", "personnel:read", "personnel:write"],
  maintenance_tech: ["factories:read", "machines:read", "machines:write", "stations:read"],
  quality_engineer: ["factories:read", "machines:read", "stations:read"],
  operator: ["factories:read", "machines:read", "stations:read"],
  office: ["factories:read", "users:read"],
  planning: ["factories:read"],
  cutting: ["factories:read"],
  grinding: ["factories:read"],
  washing: ["factories:read"],
  temper: ["factories:read"],
  quality: ["factories:read"],
  warehouse: ["factories:read"],
  driver: ["factories:read"],
  customer: ["factories:read"],
};

export const getUserRoleName = cache(async (userId: string) => {
  const record = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!record?.roleId) {
    return null;
  }

  const role = await db.query.roles.findFirst({
    where: eq(roles.id, record.roleId),
  });

  return role?.name ?? null;
});

export const ensurePermission = cache(async (permission: Permission) => {
  const tStart = Date.now();
  console.log(`[PERF_LOG] [${tStart}] [5. Permission] - Starting check for: ${permission}`);
  const session = await requireSession();
  
  console.log(`[PERF_LOG] [${Date.now()}] [4. Tenant çözümü] - Tenant ID: ${session.user.tenantId}`);
  
  const roleName = session.user.role ?? "";
  const allowed = permissionMap[roleName] ?? [];

  if (!allowed.includes(permission)) {
    console.log(`[PERF_LOG] [${Date.now()}] [5. Permission] - FAILED`);
    redirect("/dashboard");
  }

  console.log(`[PERF_LOG] [${Date.now()}] [5. Permission] - Completed (Success)`);
  return session;
});

export const ensureTenantAccess = cache(async (tenantId: string) => {
  const session = await requireSession();
  if (session.user.role === "super_admin") {
    return session;
  }

  if (session.user.tenantId !== tenantId) {
    redirect("/dashboard");
  }

  return session;
});

export const ensureFactoryAccess = cache(async (factoryId: string) => {
  const session = await requireSession();
  if (session.user.role === "super_admin") {
    return session;
  }

  if (session.user.selectedFactoryId !== factoryId && session.user.factoryId !== factoryId) {
    redirect("/dashboard");
  }

  return session;
});

export const getDashboardPathForRole = (role: string) => {
  switch (role) {
    case "super_admin":
      return "/tenants";
    case "tenant_admin":
      return "/factories";
    default:
      return "/dashboard";
  }
};
