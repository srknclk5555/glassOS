import { ensurePermission } from "@/lib/authorization";
import { CustomerBreadcrumbs } from "./_components/customer-breadcrumbs";

/**
 * Customer module layout — wraps all pages under /customers.
 *
 * - Server-side permission guard: ensures user has `customers:read`.
 * - Provides customer breadcrumbs for list/detail/tab pages.
 * - Clients are wrapped by the parent (dashboard)/layout.tsx (AppShell).
 */
export default async function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side permission check — redirects to /dashboard if denied
  await ensurePermission("customers:read");

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumbs — auto-detects list vs detail vs tab from URL */}
      <div className="px-6 pt-4">
        <CustomerBreadcrumbs />
      </div>

      {/* Page content */}
      {children}
    </div>
  );
}
