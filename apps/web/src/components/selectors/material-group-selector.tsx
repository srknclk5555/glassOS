"use client";

import * as React from "react";
import { Combobox } from "@repo/ui";
import type { ComboboxOption } from "@repo/ui";
import { getMaterialCategoriesAction } from "@/app/actions/material-categories";
import { FolderTree } from "lucide-react";

interface MaterialGroupSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  materialType?: string;
  disabled?: boolean;
  error?: boolean;
}

export function MaterialGroupSelector({
  value,
  onChange,
  materialType,
  disabled,
  error,
}: MaterialGroupSelectorProps) {
  const [options, setOptions] = React.useState<ComboboxOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchGroups = React.useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const result = await getMaterialCategoriesAction({
        search,
        materialType,
        pageSize: 50,
      });
      setOptions(
        result.items.map((c: any) => ({
          value: c.id,
          label: c.name,
        }))
      );
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, [materialType]);

  React.useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder="Select material group..."
      searchPlaceholder="Search material group..."
      emptyText="No material group found"
      loading={loading}
      disabled={disabled}
      error={error}
      icon={<FolderTree className="h-3.5 w-3.5" />}
    />
  );
}
