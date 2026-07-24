import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { db, customers } from "@repo/db";
import { eq, and } from "drizzle-orm";
import { withTenantSession } from "@/lib/dbSession";
import { CustomerBreadcrumbs } from "../_components/customer-breadcrumbs";
import { CustomerTabLayout } from "../_components/customer-tab-layout";

/**
 * Customer detail layout — wraps all tab pages under /customers/[id]/.
 *
 * - Fetches the customer to validate access and provide customerName for breadcrumbs.
 * - Renders the tab navigation bar (CustomerTabLayout).
 * - Each tab page renders inside the <CustomerTabLayout> children slot.
 */
export default async function CustomerDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireSession();

  const customer = await withTenantSession(session, async (tx: any) => {
    const condition =
      session.user.role === "super_admin"
        ? eq(customers.id, id)
        : and(eq(customers.id, id), eq(customers.tenantId, session.user.tenantId));

    const rows = await tx.select({
      id: customers.id,
      name: customers.name,
      customerCode: customers.customerCode,
    }).from(customers).where(condition).limit(1);

    return rows[0] ?? null;
  });

  if (!customer) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumbs — shows: GlassOS > Customers > [Customer Name] > [Tab] */}
      <div className="px-6 pt-4">
        <CustomerBreadcrumbs customerName={customer.name} />
      </div>

      {/* Tab navigation + content */}
      <CustomerTabLayout customerId={customer.id}>
        {children}
      </CustomerTabLayout>
    </div>
  );
}
