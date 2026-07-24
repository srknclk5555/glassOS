"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@repo/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

/* ── Types ─────────────────────────────────────────────────────── */

interface Warehouse {
  id: string;
  warehouseCode: string;
  name: string;
  warehouseType: string;
  description: string | null;
  managerId: string | null;
  isActive: boolean;
  notes: string | null;
}

interface WarehouseFormData {
  warehouseCode: string;
  name: string;
  warehouseType: string;
  description: string;
  managerId: string;
  isActive: boolean;
  notes: string;
}

interface WarehouseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: WarehouseFormData) => Promise<void>;
  warehouse?: Warehouse | null;
  mode: "create" | "edit";
}

/* ── Constants ─────────────────────────────────────────────────── */

const WAREHOUSE_TYPES = [
  { value: "raw_material", labelKey: "typeRawMaterial" },
  { value: "semi_finished", labelKey: "typeSemiFinished" },
  { value: "finished_goods", labelKey: "typeFinishedGoods" },
  { value: "consumables", labelKey: "typeConsumables" },
  { value: "quality", labelKey: "typeQuality" },
  { value: "scrap", labelKey: "typeScrap" },
  { value: "shipping", labelKey: "typeShipping" },
  { value: "spare_parts", labelKey: "typeSpareParts" },
];

/* ── Component ─────────────────────────────────────────────────── */

export function WarehouseDialog({ open, onOpenChange, onSave, warehouse, mode }: WarehouseDialogProps) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<WarehouseFormData>({
    warehouseCode: "",
    name: "",
    warehouseType: "",
    description: "",
    managerId: "",
    isActive: true,
    notes: "",
  });

  useEffect(() => {
    if (warehouse) {
      setForm({
        warehouseCode: warehouse.warehouseCode ?? "",
        name: warehouse.name ?? "",
        warehouseType: warehouse.warehouseType ?? "",
        description: warehouse.description ?? "",
        managerId: warehouse.managerId ?? "",
        isActive: warehouse.isActive ?? true,
        notes: warehouse.notes ?? "",
      });
    } else {
      setForm({
        warehouseCode: "",
        name: "",
        warehouseType: "",
        description: "",
        managerId: "",
        isActive: true,
        notes: "",
      });
    }
  }, [warehouse, open]);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }, [form, onSave]);

  const update = (key: keyof WarehouseFormData, value: any) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("warehouses.editWarehouse") : t("warehouses.addWarehouse")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("warehouses.editWarehouse") : t("warehouses.addWarehouse")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Warehouse Code */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-xs font-medium text-text-muted">
              {t("warehouses.warehouseCode")}
            </label>
            <Input
              value={form.warehouseCode}
              onChange={(e: any) => update("warehouseCode", e.target.value)}
              placeholder={t("warehouses.warehouseCode")}
              className="col-span-3"
            />
          </div>

          {/* Warehouse Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-xs font-medium text-text-muted">
              {t("warehouses.warehouseName")}
            </label>
            <Input
              value={form.name}
              onChange={(e: any) => update("name", e.target.value)}
              placeholder={t("warehouses.warehouseName")}
              className="col-span-3"
            />
          </div>

          {/* Warehouse Type */}
          <div className="grid grid-cols-4 items-center gap-4">
            <label className="text-xs font-medium text-text-muted">
              {t("warehouses.warehouseType")}
            </label>
            <Select
              value={form.warehouseType}
              onValueChange={(v) => update("warehouseType", v)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={t("warehouses.warehouseType")} />
              </SelectTrigger>
              <SelectContent>
                {WAREHOUSE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {t(`warehouses.${type.labelKey}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="grid grid-cols-4 items-start gap-4">
            <label className="text-xs font-medium text-text-muted pt-2">
              {t("warehouses.descriptionLabel")}
            </label>
            <Textarea
              value={form.description}
              onChange={(e: any) => update("description", e.target.value)}
              placeholder={t("warehouses.descriptionLabel")}
              className="col-span-3"
              rows={3}
            />
          </div>

          {/* Notes */}
          <div className="grid grid-cols-4 items-start gap-4">
            <label className="text-xs font-medium text-text-muted pt-2">
              {t("warehouses.notes")}
            </label>
            <Textarea
              value={form.notes}
              onChange={(e: any) => update("notes", e.target.value)}
              placeholder={t("warehouses.notes")}
              className="col-span-3"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? t("common.loading") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
