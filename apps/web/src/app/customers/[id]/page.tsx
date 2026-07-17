import Link from "next/link";
import { requireSession } from "@/lib/session";
import { db, customers } from "@repo/db";
import { eq, and } from "drizzle-orm";
import CustomerDetail from "@/components/customers/CustomerDetail";

export default async function Page(props: any) {
  const params = props?.params ?? {};
  const session = await requireSession();

  const customer = await db.query.customers.findFirst({
    where:
      session.user.role === "super_admin" ? eq(customers.id, params.id) : and(eq(customers.id, params.id), eq(customers.tenantId, session.user.tenantId)),
  });

  if (!customer) {
    return (
      <div>
        <p>Müşteri bulunamadı veya erişim reddedildi.</p>
        <Link href="/customers">Geri</Link>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>{customer.name}</h1>
        <Link href="/customers">Geri</Link>
      </div>
      <CustomerDetail customer={customer} />
    </div>
  );
}
