"use client";

import * as React from "react";
import { Combobox, useI18n } from "@repo/ui";
import type { ComboboxOption } from "@repo/ui";
import { MATERIAL_TYPES } from "@repo/types";
import { Tag } from "lucide-react";

interface MaterialTypeSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function MaterialTypeSelector({
  value,
  onChange,
  disabled,
  error,
}: MaterialTypeSelectorProps) {
  const { t } = useI18n();

  const options: ComboboxOption[] = React.useMemo(
    () =>
      MATERIAL_TYPES.map((type) => {
        // Convert snake_case to PascalCase: raw_material → RawMaterial → materials.typeRawMaterial
        const keySuffix = type
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join("");
        return {
          value: type,
          label: t(`materials.type${keySuffix}`),
        };
      }),
    [t],
  );

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={t("materials.materialType")}
      searchPlaceholder={t("common.search")}
      emptyText={t("common.noResults")}
      disabled={disabled}
      error={error}
      icon={<Tag className="h-3.5 w-3.5" />}
    />
  );
}
