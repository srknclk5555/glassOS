import { ensurePermission } from "@/lib/authorization";
import { db, factories } from "@repo/db";
import { desc } from "drizzle-orm";
import Link from "next/link";

export default async function FactoriesPage() {
  await ensurePermission("factories:read");
  const rows = await db.select().from(factories).orderBy(desc(factories.createdAt));

  return (
    <main style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Factories</h1>
        <Link href="/factories/settings">Settings</Link>
      </div>
      <ul>
        {rows.map((factory) => (
          <li key={factory.id} style={{ marginBottom: 12, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <div>
                <strong>{factory.name}</strong>
                <div>{factory.address ?? "No address"}</div>
              </div>
              <div>
                <span>{factory.isActive ? "Active" : "Inactive"}</span>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
