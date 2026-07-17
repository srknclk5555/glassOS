import { cache } from "react";
import { getServerSession } from "next-auth/next";
import type { Session } from "next-auth";
import { authOptions } from "./auth";
import { withTenantSession } from "./dbSession";
import { DEBUG_PERF, perfLog, perfStart, perfEnd } from "@/lib/perf";

export const getSession = cache(async () => {
  const session = await getServerSession(authOptions);
  return session as Session | null;
});

export type AuthenticatedSession = Session & {
  user: {
    id: string;
    role: string;
    tenantId: string;
    factoryId?: string;
    selectedFactoryId?: string;
    tenantName?: string;
    factoryName?: string;
    selectedFactoryName?: string;
  };
};

export const requireSession = cache(async () => {
  const tStart = perfStart("[3. NextAuth Session]");
  const session = (await getServerSession(authOptions)) as Session | null;
  perfEnd("[3. NextAuth Session]", tStart);

  if (!session || !session.user || typeof (session.user as any).id !== "string") {
    throw new Error("Unauthorized");
  }

  // Note: We do NOT set DB session vars here because we need the DB transaction-bound client.
  // Server actions should use withTenantSession(session, cb) to ensure RLS session vars are set.

  return session as AuthenticatedSession;
});
