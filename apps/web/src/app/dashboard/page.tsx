import { redirect } from "next/navigation";
import { requireSession } from "@/lib/session";
import { getDashboardPathForRole } from "@/lib/authorization";

export default async function DashboardPage() {
  const session = await requireSession().catch(() => null);
  if (!session?.user?.role) {
    redirect("/login");
  }

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Role: {session.user.role}</p>
      <p>Tenant: {session.user.tenantName ?? "-"}</p>
      <p>Factory: {session.user.selectedFactoryName ?? session.user.factoryName ?? "-"}</p>
    </main>
  );
}
