"use client";

import { PagePlaceholder } from "../_components/page-placeholder";
import { ShieldCheck } from "lucide-react";
import { useI18n } from "@repo/ui";

export default function QualityPage() {
  const { t } = useI18n();
  return (
    <PagePlaceholder
      icon={ShieldCheck}
      title={t("pages.quality")}
      description={t("pages.qualityDesc")}
    />
  );
}
