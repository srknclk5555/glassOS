"use client";

import * as React from "react";
import { SessionProvider, signIn, signOut, useSession } from "next-auth/react";
import { AuthProvider, AuthContext, useI18n, type AuthUser } from "@repo/ui";
import type { AuthContextValue } from "@repo/ui";

/* ── NextAuth → AuthContext sync component ────────────────────── */

function AuthSync({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  const { data: session, status } = useSession();
  const authCtx = React.useContext(AuthContext) as AuthContextValue | undefined;

  // Stable refs for context setters — avoids infinite loop when context object changes
  const setUserRef = React.useRef<((user: AuthUser | null) => void) | undefined>(undefined);
  const setLoadingRef = React.useRef<((loading: boolean) => void) | undefined>(undefined);

  React.useEffect(() => {
    setUserRef.current = authCtx?.setUser;
    setLoadingRef.current = authCtx?.setLoading;
  }, [authCtx]);

  React.useEffect(() => {
    const setUser = setUserRef.current;
    const setLoading = setLoadingRef.current;
    if (!setUser || !setLoading) return;

    if (status === "loading") {
      setLoading(true);
      return;
    }

    if (status === "unauthenticated") {
      setUser(null);
      setLoading(false);
      return;
    }

    if (session?.user) {
      const u = session.user as typeof session.user & {
        id?: string;
        role?: string;
        tenantId?: string;
        factoryId?: string;
        selectedFactoryId?: string;
      };
      const authUser: AuthUser = {
        id: u.id ?? "",
        name: u.name ?? "",
        email: u.email ?? "",
        role: u.role ?? "",
        tenantId: u.tenantId ?? "",
        factoryId: u.factoryId,
        selectedFactoryId: u.selectedFactoryId,
        image: u.image ?? undefined,
      };
      setUser(authUser);
      setLoading(false);
    }
    // Only re-run when session or status changes — NOT authCtx
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, status]);

  /* Override login/logout on AuthContext with real NextAuth implementations */
  React.useEffect(() => {
    if (!authCtx) return;

    const ctx = authCtx as AuthContextValue & {
      login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
      logout: () => Promise<void>;
    };

    ctx.login = async (email: string, password: string) => {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      if (result?.error) {
        return { ok: false, error: t("auth.errorInvalid") };
      }
      return { ok: true };
    };

    ctx.logout = async () => {
      await signOut({ redirect: false });
      authCtx.setUser(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authCtx]);

  return <>{children}</>;
}

/* ── Public wrapper ─────────────────────────────────────────────── */

function SessionBridge({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={false}>
      <AuthProvider>
        <AuthSync>{children}</AuthSync>
      </AuthProvider>
    </SessionProvider>
  );
}

export { SessionBridge };
