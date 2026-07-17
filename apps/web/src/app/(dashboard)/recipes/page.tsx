"use client";

import { PagePlaceholder } from "../_components/page-placeholder";
import { BookOpen } from "lucide-react";
import { useI18n } from "@repo/ui";

export default function RecipesPage() {
  const { t } = useI18n();
  return (
    <PagePlaceholder
      icon={BookOpen}
      title={t("pages.recipes")}
      description={t("pages.recipesDesc")}
    />
  );
}
