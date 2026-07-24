"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Switch,
  Combobox,
  type ComboboxOption,
} from "@repo/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";
import { MATERIAL_UNITS, MATERIAL_ORIGIN_TYPES } from "@repo/types";
import { WarehouseSelector } from "@/app/(dashboard)/goods-receipt/_components/warehouse-selector";
import { CustomerSelector } from "@/app/(dashboard)/goods-receipt/_components/customer-selector";
import { MaterialTypeSelector } from "@/components/selectors/material-type-selector";
import { MaterialGroupSelector } from "@/components/selectors/material-group-selector";
import { FactorySelector } from "@/components/selectors/factory-selector";
import { LocationSelector } from "@/components/selectors/location-selector";
import { getCustomCodeValuesAction } from "@/app/actions/custom-code-definitions";
import {
  getMaterialColorsAction,
  createMaterialColorAction,
} from "@/app/actions/material-colors";
import { Plus, Loader2 } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */

interface Material {
  id: string;
  materialCode: string;
  name: string;
  shortName: string | null;
  description: string | null;
  materialType: string;
  materialGroupId: string | null;
  originType: string | null;
  originCountry: string | null;
  brand: string | null;
  model: string | null;
  thicknessMm: string | null;
  color: string | null;
  factoryId: string | null;
  defaultWarehouseId: string | null;
  defaultLocationId: string | null;
  defaultSupplierId: string | null;
  baseUnit: string;
  stockTracking: boolean;
  inventoryItem: boolean;
  purchasable: boolean;
  sellable: boolean;
  manufacturable: boolean;
  qualityInspectionRequired: boolean;
  batchTracking: boolean;
  serialTracking: boolean;
  expirationTracking: boolean;
  minStock: string | null;
  maxStock: string | null;
  criticalStock: string | null;
  safetyStock: string | null;
  reorderPoint: string | null;
  reorderQuantity: string | null;
  standardCost: string | null;
  averageCost: string | null;
  lastPurchasePrice: string | null;
  currency: string | null;
  barcode: string | null;
  qrCode: string | null;
  rfidCode: string | null;
  imageUrl: string | null;
  technicalDrawingUrl: string | null;
  documentUrl: string | null;
  customCode1: string | null;
  customCode2: string | null;
  customCode3: string | null;
  customCode4: string | null;
  customCode5: string | null;
  status: string;
  isActive: boolean;
  notes: string | null;
}

interface MaterialFormData {
  materialCode: string;
  name: string;
  shortName: string;
  description: string;
  materialType: string;
  materialGroupId: string;
  originType: string;
  originCountry: string;
  brand: string;
  model: string;
  thicknessMm: string;
  color: string;
  factoryId: string;
  defaultWarehouseId: string;
  defaultLocationId: string;
  defaultSupplierId: string;
  baseUnit: string;
  stockTracking: boolean;
  inventoryItem: boolean;
  purchasable: boolean;
  sellable: boolean;
  manufacturable: boolean;
  qualityInspectionRequired: boolean;
  batchTracking: boolean;
  serialTracking: boolean;
  expirationTracking: boolean;
  minStock: string;
  maxStock: string;
  criticalStock: string;
  safetyStock: string;
  reorderPoint: string;
  reorderQuantity: string;
  standardCost: string;
  averageCost: string;
  lastPurchasePrice: string;
  currency: string;
  barcode: string;
  qrCode: string;
  rfidCode: string;
  imageUrl: string;
  technicalDrawingUrl: string;
  documentUrl: string;
  customCode1: string;
  customCode2: string;
  customCode3: string;
  customCode4: string;
  customCode5: string;
  status: string;
  isActive: boolean;
  notes: string;
}

interface MaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: MaterialFormData) => Promise<void>;
  material?: Material | null;
  mode: "create" | "edit";
}

/* ── Component ─────────────────────────────────────────────────── */

export function MaterialDialog({ open, onOpenChange, onSave, material, mode }: MaterialDialogProps) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);

  // ── Color management ──
  const [colorOptions, setColorOptions] = useState<ComboboxOption[]>([]);
  const [colorsLoading, setColorsLoading] = useState(false);
  const [colorAddOpen, setColorAddOpen] = useState(false);
  const [newColorName, setNewColorName] = useState("");
  const [colorAddLoading, setColorAddLoading] = useState(false);

  const fetchColors = useCallback(async () => {
    setColorsLoading(true);
    try {
      const items = await getMaterialColorsAction();
      setColorOptions(
        items.map((c: any) => ({
          value: c.name,
          label: c.name,
        }))
      );
    } catch {
      setColorOptions([]);
    } finally {
      setColorsLoading(false);
    }
  }, []);

  // Fetch colors when dialog opens
  useEffect(() => {
    if (open) {
      fetchColors();
    }
  }, [open, fetchColors]);

  const [form, setForm] = useState<MaterialFormData>({
    materialCode: "",
    name: "",
    shortName: "",
    description: "",
    materialType: "",
    materialGroupId: "",
    originType: "",
    originCountry: "",
    brand: "",
    model: "",
    thicknessMm: "",
    color: "",
    factoryId: "",
    defaultWarehouseId: "",
    defaultLocationId: "",
    defaultSupplierId: "",
    baseUnit: "piece",
    stockTracking: true,
    inventoryItem: true,
    purchasable: false,
    sellable: false,
    manufacturable: false,
    qualityInspectionRequired: false,
    batchTracking: false,
    serialTracking: false,
    expirationTracking: false,
    minStock: "",
    maxStock: "",
    criticalStock: "",
    safetyStock: "",
    reorderPoint: "",
    reorderQuantity: "",
    standardCost: "",
    averageCost: "",
    lastPurchasePrice: "",
    currency: "",
    barcode: "",
    qrCode: "",
    rfidCode: "",
    imageUrl: "",
    technicalDrawingUrl: "",
    documentUrl: "",
    customCode1: "",
    customCode2: "",
    customCode3: "",
    customCode4: "",
    customCode5: "",
    status: "active",
    isActive: true,
    notes: "",
  });

  useEffect(() => {
    if (material) {
      setForm({
        materialCode: material.materialCode ?? "",
        name: material.name ?? "",
        shortName: material.shortName ?? "",
        description: material.description ?? "",
        materialType: material.materialType ?? "",
        materialGroupId: material.materialGroupId ?? "",
        originType: material.originType ?? "",
        originCountry: material.originCountry ?? "",
        brand: material.brand ?? "",
        model: material.model ?? "",
        thicknessMm: material.thicknessMm ?? "",
        color: material.color ?? "",
        factoryId: material.factoryId ?? "",
        defaultWarehouseId: material.defaultWarehouseId ?? "",
        defaultLocationId: material.defaultLocationId ?? "",
        defaultSupplierId: material.defaultSupplierId ?? "",
        baseUnit: material.baseUnit ?? "piece",
        stockTracking: material.stockTracking ?? true,
        inventoryItem: material.inventoryItem ?? true,
        purchasable: material.purchasable ?? false,
        sellable: material.sellable ?? false,
        manufacturable: material.manufacturable ?? false,
        qualityInspectionRequired: material.qualityInspectionRequired ?? false,
        batchTracking: material.batchTracking ?? false,
        serialTracking: material.serialTracking ?? false,
        expirationTracking: material.expirationTracking ?? false,
        minStock: material.minStock ?? "",
        maxStock: material.maxStock ?? "",
        criticalStock: material.criticalStock ?? "",
        safetyStock: material.safetyStock ?? "",
        reorderPoint: material.reorderPoint ?? "",
        reorderQuantity: material.reorderQuantity ?? "",
        standardCost: material.standardCost ?? "",
        averageCost: material.averageCost ?? "",
        lastPurchasePrice: material.lastPurchasePrice ?? "",
        currency: material.currency ?? "",
        barcode: material.barcode ?? "",
        qrCode: material.qrCode ?? "",
        rfidCode: material.rfidCode ?? "",
        imageUrl: material.imageUrl ?? "",
        technicalDrawingUrl: material.technicalDrawingUrl ?? "",
        documentUrl: material.documentUrl ?? "",
        customCode1: material.customCode1 ?? "",
        customCode2: material.customCode2 ?? "",
        customCode3: material.customCode3 ?? "",
        customCode4: material.customCode4 ?? "",
        customCode5: material.customCode5 ?? "",
        status: material.status ?? "active",
        isActive: material.isActive ?? true,
        notes: material.notes ?? "",
      });
    } else {
      setForm({
        materialCode: "",
        name: "",
        shortName: "",
        description: "",
        materialType: "",
        materialGroupId: "",
        originType: "",
        originCountry: "",
        brand: "",
        model: "",
        thicknessMm: "",
        color: "",
        factoryId: "",
        defaultWarehouseId: "",
        defaultLocationId: "",
        defaultSupplierId: "",
        baseUnit: "piece",
        stockTracking: true,
        inventoryItem: true,
        purchasable: false,
        sellable: false,
        manufacturable: false,
        qualityInspectionRequired: false,
        batchTracking: false,
        serialTracking: false,
        expirationTracking: false,
        minStock: "",
        maxStock: "",
        criticalStock: "",
        safetyStock: "",
        reorderPoint: "",
        reorderQuantity: "",
        standardCost: "",
        averageCost: "",
        lastPurchasePrice: "",
        currency: "",
        barcode: "",
        qrCode: "",
        rfidCode: "",
        imageUrl: "",
        technicalDrawingUrl: "",
        documentUrl: "",
        customCode1: "",
        customCode2: "",
        customCode3: "",
        customCode4: "",
        customCode5: "",
        status: "active",
        isActive: true,
        notes: "",
      });
    }
  }, [material, open]);

  const handleSubmit = useCallback(async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }, [form, onSave]);

  const update = (key: keyof MaterialFormData, value: any) => {
    setForm((p) => ({ ...p, [key]: value }));
  };

  const handleAddColor = async () => {
    if (!newColorName.trim()) return;
    setColorAddLoading(true);
    try {
      await createMaterialColorAction({ name: newColorName.trim() });
      setNewColorName("");
      setColorAddOpen(false);
      // Refresh colors and select the new one
      const items = await getMaterialColorsAction();
      setColorOptions(
        items.map((c: any) => ({
          value: c.name,
          label: c.name,
        }))
      );
      update("color", newColorName.trim());
    } catch {
      // Error is handled by the action throw
    } finally {
      setColorAddLoading(false);
    }
  };

  const isEdit = mode === "edit";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-4xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? t("materials.editMaterial") : t("materials.addMaterial")}</DialogTitle>
          <DialogDescription>
            {isEdit ? t("materials.editMaterial") : t("materials.addMaterial")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* ══════ Basic Information ══════ */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-glass-border">
              {t("materials.generalInfo")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.materialCode")} *
                </label>
                <Input
                  value={form.materialCode}
                  onChange={(e: any) => update("materialCode", e.target.value)}
                  placeholder={t("materials.materialCode")}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.materialName")} *
                </label>
                <Input
                  value={form.name}
                  onChange={(e: any) => update("name", e.target.value)}
                  placeholder={t("materials.materialName")}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.shortName")}
                </label>
                <Input
                  value={form.shortName}
                  onChange={(e: any) => update("shortName", e.target.value)}
                  placeholder={t("materials.shortName")}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.baseUnit")} *
                </label>
                <Select
                  value={form.baseUnit}
                  onValueChange={(v) => update("baseUnit", v)}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder={t("materials.baseUnit")} />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-4 items-start gap-4 col-span-2">
                <label className="text-xs font-medium text-text-muted pt-2 col-span-1">
                  {t("materials.descriptionLabel")}
                </label>
                <Textarea
                  value={form.description}
                  onChange={(e: any) => update("description", e.target.value)}
                  placeholder={t("materials.descriptionLabel")}
                  className="col-span-3"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* ══════ Classification ══════ */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-glass-border">
              {t("materials.classification")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.materialType")} *
                </label>
                <div className="col-span-3">
                  <MaterialTypeSelector
                    value={form.materialType}
                    onChange={(v) => {
                      update("materialType", v);
                      // Clear material group when type changes
                      update("materialGroupId", "");
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.materialGroup")}
                </label>
                <div className="col-span-3">
                  <MaterialGroupSelector
                    value={form.materialGroupId}
                    onChange={(v) => update("materialGroupId", v)}
                    materialType={form.materialType || undefined}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.brand")}
                </label>
                <Input
                  value={form.brand}
                  onChange={(e: any) => update("brand", e.target.value)}
                  placeholder={t("materials.brand")}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.model")}
                </label>
                <Input
                  value={form.model}
                  onChange={(e: any) => update("model", e.target.value)}
                  placeholder={t("materials.model")}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.thickness")}
                </label>
                <Input
                  value={form.thicknessMm}
                  onChange={(e: any) => update("thicknessMm", e.target.value)}
                  placeholder="0"
                  className="col-span-3"
                  type="number"
                  step="0.01"
                  min="0"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.color")}
                </label>
                <div className="col-span-3 flex items-center gap-2">
                  <div className="flex-1">
                    <Combobox
                      options={colorOptions}
                      value={form.color}
                      onChange={(v) => update("color", v)}
                      placeholder={t("materials.color")}
                      searchPlaceholder={t("common.search")}
                      emptyText={
                        colorOptions.length === 0 && !colorsLoading
                          ? t("materials.noColorsDefined")
                          : t("common.noResults")
                      }
                      loading={colorsLoading}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0"
                    onClick={() => {
                      setNewColorName("");
                      setColorAddOpen(true);
                    }}
                    title={t("materials.addColor")}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* ══════ Origin Information ══════ */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-glass-border">
              {t("materials.originInfo")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.originType")} *
                </label>
                <div className="col-span-3">
                  <Combobox
                    options={MATERIAL_ORIGIN_TYPES.map((ot) => ({
                      value: ot,
                      label: t(`materials.origin${ot === "domestic" ? "Domestic" : "Imported"}`),
                    }))}
                    value={form.originType}
                    onChange={(v) => update("originType", v)}
                    placeholder={t("materials.originType")}
                    emptyText={t("materials.originTypeRequired")}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.originCountry")}
                </label>
                <Input
                  value={form.originCountry}
                  onChange={(e: any) => update("originCountry", e.target.value)}
                  placeholder={t("materials.originCountry")}
                  className="col-span-3"
                />
              </div>
            </div>
          </div>

          {/* ══════ Default References ══════ */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-glass-border">
              {t("materials.defaults")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.factory")}
                </label>
                <div className="col-span-3">
                  <FactorySelector
                    value={form.factoryId}
                    onChange={(v) => update("factoryId", v)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.defaultWarehouse")}
                </label>
                <div className="col-span-3">
                  <WarehouseSelector
                    value={form.defaultWarehouseId}
                    onChange={(v) => {
                      update("defaultWarehouseId", v);
                      // Clear location when warehouse changes
                      update("defaultLocationId", "");
                    }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.defaultLocation")}
                </label>
                <div className="col-span-3">
                  <LocationSelector
                    value={form.defaultLocationId}
                    onChange={(v) => update("defaultLocationId", v)}
                    factoryId={form.factoryId || undefined}
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.defaultSupplier")}
                </label>
                <div className="col-span-3">
                  <CustomerSelector
                    value={form.defaultSupplierId}
                    onChange={(v) => update("defaultSupplierId", v)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ══════ Stock Settings ══════ */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-glass-border">
              {t("materials.stockSettings")}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.stockTracking}
                  onCheckedChange={(v: boolean) => update("stockTracking", v)}
                />
                <label className="text-xs font-medium text-text-muted">
                  {t("materials.stockTracking")}
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.inventoryItem}
                  onCheckedChange={(v: boolean) => update("inventoryItem", v)}
                />
                <label className="text-xs font-medium text-text-muted">
                  {t("materials.inventoryItem")}
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.purchasable}
                  onCheckedChange={(v: boolean) => update("purchasable", v)}
                />
                <label className="text-xs font-medium text-text-muted">
                  {t("materials.purchasable")}
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.sellable}
                  onCheckedChange={(v: boolean) => update("sellable", v)}
                />
                <label className="text-xs font-medium text-text-muted">
                  {t("materials.sellable")}
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.manufacturable}
                  onCheckedChange={(v: boolean) => update("manufacturable", v)}
                />
                <label className="text-xs font-medium text-text-muted">
                  {t("materials.manufacturable")}
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.qualityInspectionRequired}
                  onCheckedChange={(v: boolean) => update("qualityInspectionRequired", v)}
                />
                <label className="text-xs font-medium text-text-muted">
                  {t("materials.qualityInspection")}
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.batchTracking}
                  onCheckedChange={(v: boolean) => update("batchTracking", v)}
                />
                <label className="text-xs font-medium text-text-muted">
                  {t("materials.batchTracking")}
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.serialTracking}
                  onCheckedChange={(v: boolean) => update("serialTracking", v)}
                />
                <label className="text-xs font-medium text-text-muted">
                  {t("materials.serialTracking")}
                </label>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={form.expirationTracking}
                  onCheckedChange={(v: boolean) => update("expirationTracking", v)}
                />
                <label className="text-xs font-medium text-text-muted">
                  {t("materials.expirationTracking")}
                </label>
              </div>
            </div>
          </div>

          {/* ══════ Stock Limits ══════ */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-glass-border">
              {t("materials.stockLimits")}
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid grid-cols-4 items-center gap-2">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.minStock")}
                </label>
                <Input
                  value={form.minStock}
                  onChange={(e: any) => update("minStock", e.target.value)}
                  placeholder="0"
                  className="col-span-3"
                  type="number"
                  step="0.0001"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.maxStock")}
                </label>
                <Input
                  value={form.maxStock}
                  onChange={(e: any) => update("maxStock", e.target.value)}
                  placeholder="0"
                  className="col-span-3"
                  type="number"
                  step="0.0001"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.criticalStock")}
                </label>
                <Input
                  value={form.criticalStock}
                  onChange={(e: any) => update("criticalStock", e.target.value)}
                  placeholder="0"
                  className="col-span-3"
                  type="number"
                  step="0.0001"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.safetyStock")}
                </label>
                <Input
                  value={form.safetyStock}
                  onChange={(e: any) => update("safetyStock", e.target.value)}
                  placeholder="0"
                  className="col-span-3"
                  type="number"
                  step="0.0001"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.reorderPoint")}
                </label>
                <Input
                  value={form.reorderPoint}
                  onChange={(e: any) => update("reorderPoint", e.target.value)}
                  placeholder="0"
                  className="col-span-3"
                  type="number"
                  step="0.0001"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-2">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.reorderQuantity")}
                </label>
                <Input
                  value={form.reorderQuantity}
                  onChange={(e: any) => update("reorderQuantity", e.target.value)}
                  placeholder="0"
                  className="col-span-3"
                  type="number"
                  step="0.0001"
                />
              </div>
            </div>
          </div>

          {/* ══════ Costing ══════ */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-glass-border">
              {t("materials.costing")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.standardCost")}
                </label>
                <Input
                  value={form.standardCost}
                  onChange={(e: any) => update("standardCost", e.target.value)}
                  placeholder="0.00"
                  className="col-span-3"
                  type="number"
                  step="0.0001"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.averageCost")}
                </label>
                <Input
                  value={form.averageCost}
                  onChange={(e: any) => update("averageCost", e.target.value)}
                  placeholder="0.00"
                  className="col-span-3"
                  type="number"
                  step="0.0001"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.lastPurchasePrice")}
                </label>
                <Input
                  value={form.lastPurchasePrice}
                  onChange={(e: any) => update("lastPurchasePrice", e.target.value)}
                  placeholder="0.00"
                  className="col-span-3"
                  type="number"
                  step="0.0001"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.currency")}
                </label>
                <Input
                  value={form.currency}
                  onChange={(e: any) => update("currency", e.target.value)}
                  placeholder="TRY"
                  className="col-span-3"
                />
              </div>
            </div>
          </div>

          {/* ══════ Identification ══════ */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-glass-border">
              {t("materials.identification")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.barcode")}
                </label>
                <Input
                  value={form.barcode}
                  onChange={(e: any) => update("barcode", e.target.value)}
                  placeholder={t("materials.barcode")}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.qrCode")}
                </label>
                <Input
                  value={form.qrCode}
                  onChange={(e: any) => update("qrCode", e.target.value)}
                  placeholder={t("materials.qrCode")}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.rfidCode")}
                </label>
                <Input
                  value={form.rfidCode}
                  onChange={(e: any) => update("rfidCode", e.target.value)}
                  placeholder={t("materials.rfidCode")}
                  className="col-span-3"
                />
              </div>
            </div>
          </div>

          {/* ══════ Media & Documents ══════ */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-glass-border">
              {t("materials.media")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.imageUrl")}
                </label>
                <Input
                  value={form.imageUrl}
                  onChange={(e: any) => update("imageUrl", e.target.value)}
                  placeholder={t("materials.imageUrl")}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.technicalDrawingUrl")}
                </label>
                <Input
                  value={form.technicalDrawingUrl}
                  onChange={(e: any) => update("technicalDrawingUrl", e.target.value)}
                  placeholder={t("materials.technicalDrawingUrl")}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4 col-span-2">
                <label className="text-xs font-medium text-text-muted col-span-1">
                  {t("materials.documentUrl")}
                </label>
                <Input
                  value={form.documentUrl}
                  onChange={(e: any) => update("documentUrl", e.target.value)}
                  placeholder={t("materials.documentUrl")}
                  className="col-span-3"
                />
              </div>
            </div>
          </div>

          {/* ══════ Custom Codes ══════ */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary mb-3 pb-2 border-b border-glass-border">
              {t("materials.customCodes")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <CustomCodeField
                  key={i}
                  fieldNumber={i}
                  value={(form as any)[`customCode${i}`]}
                  onChange={(v) => update(`customCode${i}` as keyof MaterialFormData, v)}
                />
              ))}
            </div>
          </div>

          {/* ══════ Notes ══════ */}
          <div className="grid grid-cols-1 gap-4">
            <div className="grid grid-cols-4 items-start gap-4">
              <label className="text-xs font-medium text-text-muted pt-2">
                {t("materials.notes")}
              </label>
              <Textarea
                value={form.notes}
                onChange={(e: any) => update("notes", e.target.value)}
                placeholder={t("materials.notes")}
                className="col-span-3"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* ══════ Add Color Sub-Dialog ══════ */}
        <Dialog open={colorAddOpen} onOpenChange={setColorAddOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{t("materials.addColorTitle")}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                placeholder={t("materials.addColorPlaceholder")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !colorAddLoading) {
                    handleAddColor();
                  }
                }}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setColorAddOpen(false)}
                disabled={colorAddLoading}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleAddColor}
                disabled={!newColorName.trim() || colorAddLoading}
              >
                {colorAddLoading ? t("common.loading") : t("common.add")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

/* ── Custom Code Field (Combobox from definitions) ─────────────── */

interface CustomCodeFieldProps {
  fieldNumber: number;
  value: string;
  onChange: (value: string) => void;
}

function CustomCodeField({ fieldNumber, value, onChange }: CustomCodeFieldProps) {
  const { t } = useI18n();
  const [options, setOptions] = useState<ComboboxOption[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCustomCodeValuesAction(fieldNumber)
      .then((items: any[]) => {
        if (!cancelled) {
          setOptions(
            items.map((item) => ({
              value: item.value,
              label: item.label,
            }))
          );
        }
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [fieldNumber]);

  return (
    <div className="grid grid-cols-4 items-center gap-4">
      <label className="text-xs font-medium text-text-muted col-span-1">
        {t(`materials.customCode${fieldNumber}`)}
      </label>
      <div className="col-span-3">
        <Combobox
          options={options}
          value={value}
          onChange={onChange}
          placeholder={t(`materials.customCode${fieldNumber}`)}
          emptyText={t("common.noResults")}
          loading={loading}
          searchPlaceholder={t("common.searchPlaceholder")}
        />
      </div>
    </div>
  );
}
