import { useMemo } from "react";
import type { NavItem } from "../components/layout/app-shell";

/**
 * Role-to-nav visibility matrix.
 * Maps each backend role name to the set of nav item IDs they can see.
 * `'*'` means all items are visible.
 */
const ROLE_NAV_MAP: Record<string, string[] | '*'> = {
  super_admin: '*',
  tenant_admin: '*',
  factory_manager: '*',
  office: [
    'dashboard', 'orders', 'production', 'queue', 'inventory',
    'customers', 'recipes', 'quality', 'dispatch', 'reports',
  ],
  planning: [
    'dashboard', 'orders', 'production', 'queue', 'recipes', 'reports',
  ],
  quality: [
    'dashboard', 'quality', 'reports',
  ],
  warehouse: [
    'dashboard', 'inventory', 'dispatch',
  ],
  cutting: [
    'dashboard', 'queue', 'production',
  ],
  grinding: [
    'dashboard', 'queue', 'production',
  ],
  washing: [
    'dashboard', 'queue', 'production',
  ],
  temper: [
    'dashboard', 'queue', 'production',
  ],
  driver: [
    'dashboard', 'dispatch',
  ],
  customer: [
    'dashboard', 'reports',
  ],
};

/**
 * Filters an array of NavItems to only include items visible to the given role.
 * Recursively filters children arrays.
 */
function filterNavItems(items: NavItem[], allowed: Set<string> | '*', depth = 0): NavItem[] {
  if (allowed === '*') return items;
  return items
    .filter((item) => allowed.has(item.id))
    .map((item) => {
      if (!item.children) return item;
      const filteredChildren = filterNavItems(item.children, allowed, depth + 1);
      if (filteredChildren.length === 0 && (!item.href || depth > 0)) return null;
      return { ...item, children: filteredChildren };
    })
    .filter(Boolean) as NavItem[];
}

/**
 * Hook that returns nav items filtered by the user's role.
 *
 * @param items — The full list of NavItems available in the app.
 * @param role — The current user's role name (e.g. "factory_manager").
 * @returns Filtered NavItem[] suitable for passing to AppShell.
 */
function useNavItems(items: NavItem[], role: string | null | undefined): NavItem[] {
  return useMemo(() => {
    if (!role) return [];
    const allowed = ROLE_NAV_MAP[role];
    if (!allowed) return [];
    const normalized: Set<string> | '*' = allowed === '*' ? '*' : new Set(allowed);
    return filterNavItems(items, normalized);
  }, [items, role]);
}

export { useNavItems, ROLE_NAV_MAP };
export type { NavItem };
