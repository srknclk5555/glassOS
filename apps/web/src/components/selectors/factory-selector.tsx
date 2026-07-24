"use client";

import * as React from "react";
import { Combobox } from "@repo/ui";
import type { ComboboxOption } from "@repo/ui";
import { getFactoriesAction } from "@/app/actions/factories";
import { Factory } from "lucide-react";

interface FactorySelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
}

export function FactorySelector({
  value,
  onChange,
  disabled,
  error,
  placeholder = "Select factory...",
}: FactorySelectorProps) {
  const [options, setOptions] = React.useState<ComboboxOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchFactories = React.useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const result = await getFactoriesAction({
        search,
        pageSize: 50,
      });
      setOptions(
        result.items.map((f: any) => ({
          value: f.id,
          label: f.name,
          subtitle: f.address ?? undefined,
        }))
      );
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchFactories();
  }, [fetchFactories]);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search factory..."
      emptyText="No factory found"
      loading={loading}
      disabled={disabled}
      error={error}
      icon={<Factory className="h-3.5 w-3.5" />}
    />
  );
}
