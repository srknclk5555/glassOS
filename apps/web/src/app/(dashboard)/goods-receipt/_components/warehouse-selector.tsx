"use client";

import * as React from "react";
import { Combobox } from "@repo/ui";
import type { ComboboxOption } from "@repo/ui";
import { getWarehousesAction } from "@/app/actions/warehouses";
import { Building2 } from "lucide-react";

interface WarehouseSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  warehouseType?: string;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
}

export function WarehouseSelector({
  value,
  onChange,
  warehouseType,
  disabled,
  error,
  placeholder = "Select warehouse...",
}: WarehouseSelectorProps) {
  const [options, setOptions] = React.useState<ComboboxOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchWarehouses = React.useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const result = await getWarehousesAction({
        search,
        warehouseType,
        pageSize: 50,
      });
      setOptions(
        result.items.map((w: any) => ({
          value: w.id,
          label: `${w.warehouseCode} - ${w.name}`,
          subtitle: w.description ?? undefined,
        }))
      );
    } catch {
      // Silently fail — empty options
    } finally {
      setLoading(false);
    }
  }, [warehouseType]);

  // Initial fetch
  React.useEffect(() => {
    fetchWarehouses();
  }, [fetchWarehouses]);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Search warehouse..."
      emptyText="No warehouse found"
      loading={loading}
      disabled={disabled}
      error={error}
      icon={<Building2 className="h-3.5 w-3.5" />}
    />
  );
}
