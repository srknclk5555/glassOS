"use client";

import { PagePlaceholder } from "../_components/page-placeholder";
import { Settings } from "lucide-react";
import { useI18n } from "@repo/ui";

export default function SettingsPage() {
  const { t } = useI18n();
  return (
    <PagePlaceholder
      icon={Settings}
      title={t("pages.settings")}
      description={t("pages.settingsDesc")}
    />
  );
}
