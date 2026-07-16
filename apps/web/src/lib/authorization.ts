import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "./session";
import { db, tenants, factories, roles, users } from "@repo/db";
import { eq } from "drizzle-orm";

export type Permission = "tenants:read" | "tenants:write" | "factories:read" | "factories:write" | "users:read" | "users:write";

const permissionMap: Record<string, Permission[]> = {
  super_admin: ["tenants:read", "tenants:write", "factories:read", "factories:write", "users:read", "users:write"],
  tenant_admin: ["factories:read", "factories:write", "users:read", "users:write"],
  factory_manager: ["factories:read", "users:read"],
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
  const session = await requireSession();
  const record = await db.query.users.findFirst({
    where: eq(users.id, userId),
    with: { role: true },
  });

  if (!record?.role) {
    return null;
  }

  return record.role.name;
});

export const ensurePermission = cache(async (permission: Permission) => {
  const session = await requireSession();
  const roleName = session.user.role ?? "";
  const allowed = permissionMap[roleName] ?? [];

  if (!allowed.includes(permission)) {
    redirect("/dashboard");
  }

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
