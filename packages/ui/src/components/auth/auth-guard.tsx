"use client";

import * as React from "react";
import { Loader2, Ban, Lock, FileQuestion } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/button";
import { useI18n } from "../../i18n/context";

/* ── AuthGuard ──────────────────────────────────────────────────── */

interface AuthGuardProps {
  /** Whether the session is still loading */
  isLoading: boolean;
  /** Whether the user is authenticated */
  isAuthenticated: boolean;
  /** Optional role check — if provided and user's role doesn't match, shows 403 */
  requiredRole?: string | string[];
  /** The user's current role (required if requiredRole is set) */
  userRole?: string | null;
  /** Called to redirect to login */
  onRedirectToLogin?: () => void;
  children: React.ReactNode;
}

function AuthGuard({
  isLoading,
  isAuthenticated,
  requiredRole,
  userRole,
  onRedirectToLogin,
  children,
}: AuthGuardProps) {
  const { t } = useI18n();

  /* Loading */
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-glass-background">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
          <p className="text-sm text-text-muted">{t("auth.loadingSession")}</p>
        </div>
      </div>
    );
  }

  /* Not authenticated */
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-glass-background p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-warning/10">
            <Lock className="h-6 w-6 text-warning" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{t("auth.authRequired")}</h2>
            <p className="mt-1 text-sm text-text-muted">{t("auth.pleaseSignIn")}</p>
          </div>
          {onRedirectToLogin && (
            <Button variant="primary" onClick={onRedirectToLogin}>
              {t("auth.goToLogin")}
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* Role check */
  if (requiredRole && userRole) {
    const allowed = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    if (!allowed.includes(userRole)) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-glass-background p-4">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-danger/10">
              <Ban className="h-6 w-6 text-danger" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">{t("auth.accessDenied")}</h2>
              <p className="mt-1 text-sm text-text-muted">
                {t("auth.noPermission")}
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}

export { AuthGuard };
