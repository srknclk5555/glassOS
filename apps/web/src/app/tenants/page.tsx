import { redirect } from "next/navigation";
import { ensurePermission } from "@/lib/authorization";
import { db, tenants } from "@repo/db";
import { desc } from "drizzle-orm";

export default async function TenantsPage() {
  await ensurePermission("tenants:read");
  const rows = await db.select().from(tenants).orderBy(desc(tenants.createdAt));

  return (
    <main style={{ padding: 24 }}>
      <h1>Tenants</h1>
      <ul>
        {rows.map((tenant) => (
          <li key={tenant.id}>{tenant.name} — {tenant.isActive ? "Active" : "Inactive"}</li>
        ))}
      </ul>
    </main>
  );
}
