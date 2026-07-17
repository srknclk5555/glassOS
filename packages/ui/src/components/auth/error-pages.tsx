"use client";

import * as React from "react";
import { Lock, Ban, FileQuestion, Home } from "lucide-react";
import { Button } from "../ui/button";
import { useI18n } from "../../i18n/context";

interface ErrorPageProps {
  onGoHome?: () => void;
}

function Error401({ onGoHome }: ErrorPageProps) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-glass-background p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/10">
          <Lock className="h-7 w-7 text-warning" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">{t("auth.error401")}</h1>
          <p className="mt-1 text-sm text-text-muted">{t("auth.error401Desc")}</p>
        </div>
        {onGoHome && (
          <Button variant="primary" onClick={onGoHome}>
            <Home className="mr-2 h-4 w-4" />
            {t("auth.goToLogin")}
          </Button>
        )}
      </div>
    </div>
  );
}

function Error403({ onGoHome }: ErrorPageProps) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-glass-background p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-danger/10">
          <Ban className="h-7 w-7 text-danger" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">{t("auth.error403")}</h1>
          <p className="mt-1 text-sm text-text-muted">{t("auth.error403Desc")}</p>
        </div>
        {onGoHome && (
          <Button variant="primary" onClick={onGoHome}>
            <Home className="mr-2 h-4 w-4" />
            {t("auth.goToDashboard")}
          </Button>
        )}
      </div>
    </div>
  );
}

function Error404({ onGoHome }: ErrorPageProps) {
  const { t } = useI18n();
  return (
    <div className="flex min-h-screen items-center justify-center bg-glass-background p-4">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-glass-surface">
          <FileQuestion className="h-7 w-7 text-text-muted" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">{t("auth.error404")}</h1>
          <p className="mt-1 text-sm text-text-muted">{t("auth.error404Desc")}</p>
        </div>
        {onGoHome && (
          <Button variant="primary" onClick={onGoHome}>
            <Home className="mr-2 h-4 w-4" />
            {t("auth.goToDashboard")}
          </Button>
        )}
      </div>
    </div>
  );
}

export { Error401, Error403, Error404 };
