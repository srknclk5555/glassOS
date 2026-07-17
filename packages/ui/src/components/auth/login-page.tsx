"use client";

import * as React from "react";
import { useState } from "react";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/button";
import { useAuth } from "./auth-context";
import { useI18n } from "../../i18n/context";

interface LoginPageProps {
  onForgotPassword?: () => void;
  onLoginSuccess?: () => void;
  logo?: React.ReactNode;
  title?: string;
  subtitle?: string;
}

function LoginPage({
  onForgotPassword,
  onLoginSuccess,
  logo,
  title = "GlassOS",
  subtitle,
}: LoginPageProps) {
  const { t } = useI18n();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError(t("auth.errorRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (!result.ok) {
        setError(result.error ?? t("auth.errorInvalid"));
      } else {
        onLoginSuccess?.();
      }
    } catch {
      setError(t("auth.errorUnexpected"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-glass-background p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Branding */}
        <div className="mb-8 text-center">
          {logo ?? (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
              <span className="text-xl font-bold text-primary-foreground">G</span>
            </div>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            {title}
          </h1>
          <p className="mt-1 text-sm text-text-muted">{subtitle ?? t("auth.subtitle")}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-email"
              className="text-xs font-medium text-text-secondary"
            >
              {t("auth.email")}
            </label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className={cn(
                "block w-full rounded-lg border border-glass-border bg-glass-surface px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted transition-colors",
                "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="text-xs font-medium text-text-secondary"
            >
              {t("auth.password")}
            </label>
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                className={cn(
                  "block w-full rounded-lg border border-glass-border bg-glass-surface px-3 py-2.5 pr-10 text-sm text-text-primary placeholder:text-text-muted transition-colors",
                  "focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                )}
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me + Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary hover:text-text-primary transition-colors">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={submitting}
                className="h-4 w-4 rounded border-glass-border bg-glass-surface text-primary focus:ring-primary"
              />
              {t("auth.rememberMe")}
            </label>
            {onForgotPassword && (
              <button
                type="button"
                onClick={onForgotPassword}
                className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
              >
                {t("auth.forgotPassword")}
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-danger/20 bg-danger/10 px-3 py-2 text-xs text-danger"
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("auth.signingIn")}
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                {t("auth.signIn")}
              </>
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-[10px] text-text-muted">
          {t("auth.footer")}
        </p>
      </div>
    </div>
  );
}

export { LoginPage };
