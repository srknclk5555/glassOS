import { ensurePermission } from "@/lib/authorization";
import { db, users } from "@repo/db";
import { desc } from "drizzle-orm";

export default async function UsersPage() {
  await ensurePermission("users:read");
  const rows = await db.select().from(users).orderBy(desc(users.createdAt));

  return (
    <main style={{ padding: 24 }}>
      <h1>Users</h1>
      <ul>
        {rows.map((user) => (
          <li key={user.id}>{user.name} — {user.email} — {user.active ? "Active" : "Inactive"}</li>
        ))}
      </ul>
    </main>
  );
}
