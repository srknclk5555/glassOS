"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback } from "react";

/* ── Types ─────────────────────────────────────────────────────── */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  tenantId: string;
  factoryId?: string;
  selectedFactoryId?: string;
  image?: string;
}

export interface LoginResult {
  ok: boolean;
  error?: string;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  setLoading: (loading: boolean) => void;
}

/* ── Context ────────────────────────────────────────────────────── */

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/* ── Provider ────────────────────────────────────────────────────── */

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setLoading] = useState(true);

  const login = useCallback(async (email: string, password: string): Promise<LoginResult> => {
    // Will be overridden by the session bridge in apps/web.
    // The default implementation is a placeholder — the real login
    // logic comes from next-auth/react via the bridge.
    return { ok: false, error: "Auth bridge not initialized" };
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    // Will be overridden by the session bridge in apps/web.
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        setUser,
        setLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ── Hook ────────────────────────────────────────────────────────── */

function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export { AuthProvider, AuthContext, useAuth };
