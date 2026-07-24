"use client";

import * as React from "react";
import { Combobox } from "@repo/ui";
import type { ComboboxOption } from "@repo/ui";
import { getPersonnelAction } from "@/app/actions/personnel";
import { User } from "lucide-react";

interface PersonnelSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  placeholder?: string;
}

export function PersonnelSelector({
  value,
  onChange,
  disabled,
  error,
  placeholder = "Personel seçin...",
}: PersonnelSelectorProps) {
  const [options, setOptions] = React.useState<ComboboxOption[]>([]);
  const [loading, setLoading] = React.useState(false);

  const fetchPersonnel = React.useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const result = await getPersonnelAction({
        search,
        status: "active",
        pageSize: 50,
      });
      setOptions(
        (result.items ?? []).map((p: any) => ({
          value: p.id,
          label: `${p.personnelCode} — ${p.firstName} ${p.lastName}`,
          subtitle: p.role ?? undefined,
        }))
      );
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchPersonnel();
  }, [fetchPersonnel]);

  return (
    <Combobox
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      searchPlaceholder="Personel ara..."
      emptyText="Personel bulunamadı"
      loading={loading}
      disabled={disabled}
      error={error}
      icon={<User className="h-3.5 w-3.5" />}
    />
  );
}
