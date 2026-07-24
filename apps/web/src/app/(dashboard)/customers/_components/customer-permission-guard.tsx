"use client";

import { useAuth, Error403 } from "@repo/ui";
import type { Permission } from "@/lib/authorization";

interface CustomerPermissionGuardProps {
  /** The permission to check (e.g. "customers:read", "customers:write") */
  permission: Permission;
  children: React.ReactNode;
  /** Optional fallback to render instead of Error403 when permission is denied */
  fallback?: React.ReactNode;
}

/**
 * CustomerPermissionGuard — Client-side permission gate.
 *
 * Wraps UI sections that require specific permissions.
 * Shows Error403 when the user lacks permission.
 * Falls back to `fallback` prop if provided.
 *
 * @example
 * <CustomerPermissionGuard permission="customers:write">
 *   <DeleteCustomerButton />
 * </CustomerPermissionGuard>
 */
export function CustomerPermissionGuard({
  permission,
  children,
  fallback,
}: CustomerPermissionGuardProps) {
  const { user } = useAuth();

  if (!user) {
    return fallback ?? <Error403 />;
  }

  // Simple role-based check matching the server-side permissionMap
  const rolePermissions: Record<string, string[]> = {
    super_admin: [
      "tenants:read", "tenants:write", "factories:read", "factories:write",
      "users:read", "users:write", "machines:read", "machines:write",
      "stations:read", "stations:write", "personnel:read", "personnel:write",
      "warehouses:read", "warehouses:write", "materials:read", "materials:write",
      "goods-receipt:read", "goods-receipt:write", "customers:read", "customers:write",
    ],
    tenant_admin: [
      "factories:read", "factories:write", "users:read", "users:write",
      "machines:read", "machines:write", "stations:read", "stations:write",
      "personnel:read", "personnel:write", "warehouses:read", "warehouses:write",
      "materials:read", "materials:write", "goods-receipt:read", "goods-receipt:write",
      "customers:read", "customers:write",
    ],
    factory_manager: [
      "factories:read", "users:read", "machines:read", "machines:write",
      "stations:read", "stations:write", "personnel:read", "personnel:write",
      "warehouses:read", "warehouses:write", "materials:read", "materials:write",
      "goods-receipt:read", "goods-receipt:write", "customers:read",
    ],
    production_manager: [
      "factories:read", "machines:read", "machines:write", "stations:read",
      "stations:write", "personnel:read", "personnel:write", "warehouses:read",
      "warehouses:write", "materials:read", "materials:write", "goods-receipt:read",
      "goods-receipt:write", "customers:read",
    ],
  };

  const userRole = user.role ?? "";
  const allowed = rolePermissions[userRole] ?? [];

  if (!allowed.includes(permission)) {
    return fallback ?? <Error403 />;
  }

  return <>{children}</>;
}
