"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Switch,
  Badge,
} from "@repo/ui";
import { useI18n } from "@repo/ui";
import { Plus, Trash2, GripVertical, Search } from "lucide-react";
import type { GoodsReceiptStatus } from "@repo/types";
import { WarehouseSelector } from "./warehouse-selector";
import { CustomerSelector } from "./customer-selector";
import { PersonnelSelector } from "./personnel-selector";
import { MaterialSelectionDialog } from "./material-selection-dialog";
import { UnitSelector } from "./unit-selector";

// ─── Form Types ──────────────────────────────────────────────────────────────

interface GoodsReceiptItemForm {
  materialId: string;
  materialCode: string;
  materialName: string;
  formatId: string;
  widthMm: string;
  heightMm: string;
  plateCount: string;        // Adet (plaka sayısı)
  totalAreaM2: string;       // Toplam metrekare (otomatik hesaplanır)
  quantity: string;          // quantity = totalAreaM2 (stok girişi için)
  unit: string;
  lotNumber: string;
  unitCost: string;
  currency: string;
  targetWarehouseId: string;
  qualityStatus: string;
  qualityNotes: string;
  damagedCount: string;      // Kırık adet
  missingCount: string;      // Eksik adet
  isPlateTracked: boolean;
}

interface GoodsReceiptFormData {
  receiptDate: string;
  receiptTime: string;
  warehouseId: string;
  receivedById: string;
  supplierId: string;
  purchaseOrderId: string;
  vehiclePlate: string;
  trailerPlate: string;
  driverName: string;
  driverPhone: string;
  carrierCompany: string;
  despatchNumber: string;
  despatchDate: string;
  invoiceNumber: string;
  orderReference: string;
  notes: string;
  items: GoodsReceiptItemForm[];
}

const defaultItem: GoodsReceiptItemForm = {
  materialId: "",
  materialCode: "",
  materialName: "",
  formatId: "",
  widthMm: "",
  heightMm: "",
  plateCount: "",
  totalAreaM2: "",
  quantity: "",
  unit: "piece",
  lotNumber: "",
  unitCost: "",
  currency: "",
  targetWarehouseId: "",
  qualityStatus: "accepted",
  qualityNotes: "",
  damagedCount: "",
  missingCount: "",
  isPlateTracked: false,
};

const defaultForm: GoodsReceiptFormData = {
  receiptDate: new Date().toISOString().slice(0, 10),
  receiptTime: new Date().toTimeString().slice(0, 5),
  warehouseId: "",
  receivedById: "",
  supplierId: "",
  purchaseOrderId: "",
  vehiclePlate: "",
  trailerPlate: "",
  driverName: "",
  driverPhone: "",
  carrierCompany: "",
  despatchNumber: "",
  despatchDate: "",
  invoiceNumber: "",
  orderReference: "",
  notes: "",
  items: [{ ...defaultItem }],
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface GoodsReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: GoodsReceiptFormData) => Promise<void>;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GoodsReceiptDialog({ open, onOpenChange, onSave }: GoodsReceiptDialogProps) {
  const { t } = useI18n();
  const [form, setForm] = useState<GoodsReceiptFormData>({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [materialDialogOpen, setMaterialDialogOpen] = useState(false);
  const [materialDialogIndex, setMaterialDialogIndex] = useState(0);

  useEffect(() => {
    if (open) {
      setForm({
        ...defaultForm,
        receiptDate: new Date().toISOString().slice(0, 10),
        receiptTime: new Date().toTimeString().slice(0, 5),
      });
    }
  }, [open]);

  const update = <K extends keyof GoodsReceiptFormData>(key: K, value: GoodsReceiptFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ── Area Calculation ──
  // Auto-calculates totalAreaM2 & quantity when plateCount or dimensions change
  const recalcArea = (item: GoodsReceiptItemForm): Partial<GoodsReceiptItemForm> => {
    const w = parseFloat(item.widthMm);
    const h = parseFloat(item.heightMm);
    const pc = parseFloat(item.plateCount);
    if (w > 0 && h > 0 && pc > 0) {
      const areaPerPlateM2 = (w * h) / 1_000_000;
      const total = Math.round(areaPerPlateM2 * pc * 100) / 100;
      return {
        totalAreaM2: String(total),
        quantity: String(total),
        unit: "m2",
      };
    }
    return {};
  };

  const updateItem = (index: number, key: keyof GoodsReceiptItemForm, value: any) => {
    setForm((prev) => {
      const items = [...prev.items];
      const updated = { ...items[index], [key]: value } as GoodsReceiptItemForm;

      // If plateCount, widthMm, or heightMm changed — recalc area
      if (key === "plateCount" || key === "widthMm" || key === "heightMm") {
        const areaUpdate = recalcArea(updated);
        Object.assign(updated, areaUpdate);
      }

      items[index] = updated;
      return { ...prev, items };
    });
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { ...defaultItem }] }));
  };

  const removeItem = (index: number) => {
    setForm((prev) => {
      const items = prev.items.filter((_, i) => i !== index);
      return { ...prev, items: items.length === 0 ? [{ ...defaultItem }] : items };
    });
  };

  const handleMaterialSelect = (materialId: string, materialCode: string, materialName: string) => {
    updateItem(materialDialogIndex, "materialId", materialId);
    updateItem(materialDialogIndex, "materialCode", materialCode);
    updateItem(materialDialogIndex, "materialName", materialName);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-4xl">
        <DialogHeader>
          <DialogTitle>{t("goodsReceipt.addReceipt")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* ── Header Info ── */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary border-b border-glass-border pb-2 mb-4">
              {t("goodsReceipt.generalInfo")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.receiptDate")}</label>
                <Input
                  type="date"
                  value={form.receiptDate}
                  onChange={(e) => update("receiptDate", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.receiptTime")}</label>
                <Input
                  type="time"
                  value={form.receiptTime}
                  onChange={(e) => update("receiptTime", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.targetWarehouse")}</label>
                <div className="col-span-3">
                  <WarehouseSelector
                    value={form.warehouseId}
                    onChange={(v) => update("warehouseId", v)}
                    placeholder="Select warehouse"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.receivedBy")}</label>
                <div className="col-span-3">
                  <PersonnelSelector
                    value={form.receivedById}
                    onChange={(v) => update("receivedById", v)}
                    placeholder="Personel seçin..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.supplier")}</label>
                <div className="col-span-3">
                  <CustomerSelector
                    value={form.supplierId}
                    onChange={(v) => update("supplierId", v)}
                    placeholder="Select supplier"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.purchaseOrder")}</label>
                <Input
                  value={form.purchaseOrderId}
                  onChange={(e) => update("purchaseOrderId", e.target.value)}
                  placeholder="PO ID (optional)"
                  className="col-span-3"
                />
              </div>
            </div>
          </div>

          {/* ── Vehicle Info ── */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary border-b border-glass-border pb-2 mb-4">
              {t("goodsReceipt.vehicleInfo")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.vehiclePlate")}</label>
                <Input
                  value={form.vehiclePlate}
                  onChange={(e) => update("vehiclePlate", e.target.value)}
                  placeholder="e.g. 34 ABC 123"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.trailerPlate")}</label>
                <Input
                  value={form.trailerPlate}
                  onChange={(e) => update("trailerPlate", e.target.value)}
                  placeholder={t("goodsReceipt.trailerPlate")}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.driverName")}</label>
                <Input
                  value={form.driverName}
                  onChange={(e) => update("driverName", e.target.value)}
                  placeholder="Driver name"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.driverPhone")}</label>
                <Input
                  value={form.driverPhone}
                  onChange={(e) => update("driverPhone", e.target.value)}
                  placeholder={t("goodsReceipt.driverPhone")}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.carrierCompany")}</label>
                <Input
                  value={form.carrierCompany}
                  onChange={(e) => update("carrierCompany", e.target.value)}
                  placeholder={t("goodsReceipt.carrierCompany")}
                  className="col-span-3"
                />
              </div>
            </div>
          </div>

          {/* ── Document Info ── */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary border-b border-glass-border pb-2 mb-4">
              {t("goodsReceipt.documentInfo")}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.documentNo")}</label>
                <Input
                  value={form.despatchNumber}
                  onChange={(e) => update("despatchNumber", e.target.value)}
                  placeholder="Despatch no"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.despatchDate")}</label>
                <Input
                  type="date"
                  value={form.despatchDate}
                  onChange={(e) => update("despatchDate", e.target.value)}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.waybillNo")}</label>
                <Input
                  value={form.invoiceNumber}
                  onChange={(e) => update("invoiceNumber", e.target.value)}
                  placeholder="Invoice/waybill no"
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.orderReference")}</label>
                <Input
                  value={form.orderReference}
                  onChange={(e) => update("orderReference", e.target.value)}
                  placeholder={t("goodsReceipt.orderReference")}
                  className="col-span-3"
                />
              </div>
            </div>
          </div>

          {/* ── Items ── */}
          <div>
            <div className="flex items-center justify-between border-b border-glass-border pb-2 mb-4">
              <h3 className="text-sm font-semibold text-text-primary">{t("goodsReceipt.items")}</h3>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3 w-3 mr-1" /> {t("goodsReceipt.addItem")}
              </Button>
            </div>

            {form.items.map((item, index) => (
              <div key={index} className="border border-glass-border rounded-lg p-4 mb-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-text-muted flex items-center gap-1">
                    <GripVertical className="h-3 w-3" />
                    {t("goodsReceipt.items")} #{index + 1}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700">
                    <Trash2 className="h-3 w-3 mr-1" /> {t("goodsReceipt.removeItem")}
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {/* ── Material (full width) ── */}
                  <div className="col-span-3 grid grid-cols-4 items-center gap-2">
                    <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.material")}</label>
                    <div className="col-span-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-left font-normal text-sm"
                        onClick={() => {
                          setMaterialDialogIndex(index);
                          setMaterialDialogOpen(true);
                        }}
                      >
                        <Search className="mr-2 h-3.5 w-3.5 text-text-muted shrink-0" />
                        {item.materialId ? (
                          <span className="truncate text-xs">
                            <span className="font-mono font-medium">{item.materialCode}</span>
                            <span className="text-text-muted ml-1.5">{item.materialName}</span>
                          </span>
                        ) : (
                          <span className="text-text-muted">Select material</span>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* ── Plate Count (Adet) & Total Area (m²) ── */}
                  <div className="grid grid-cols-4 items-center gap-2">
                    <label className="text-xs font-medium text-text-muted col-span-1" title="Gelen plaka sayısı">
                      🪟 {t("goodsReceipt.plateCount")}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={item.plateCount}
                      onChange={(e) => updateItem(index, "plateCount", e.target.value)}
                      placeholder="0"
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-2">
                    <label className="text-xs font-medium text-text-muted col-span-1" title="Toplam metrekare (otomatik hesaplanır)">
                      📐 {t("goodsReceipt.totalArea")}
                    </label>
                    <div className="col-span-3 flex items-center gap-1">
                      <Input
                        type="number"
                        value={item.totalAreaM2}
                        readOnly
                        className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100 cursor-default font-medium"
                        placeholder="0.00"
                      />
                      <span className="text-xs text-text-muted shrink-0">m²</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-2">
                    <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.unit")}</label>
                    <div className="col-span-3">
                      <UnitSelector
                        value={item.unit}
                        onChange={(v) => updateItem(index, "unit", v)}
                      />
                    </div>
                  </div>

                  {/* ── Dimensions with Turkish annotations ── */}
                  <div className="col-span-3 grid grid-cols-4 items-center gap-2">
                    <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.dimensions")}</label>
                    <div className="col-span-3 flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          type="number"
                          value={item.widthMm}
                          onChange={(e) => updateItem(index, "widthMm", e.target.value)}
                          placeholder="0"
                          className="flex-1 pr-14"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted pointer-events-none">
                          En (Genişlik)
                        </span>
                      </div>
                      <span className="text-text-muted self-center">×</span>
                      <div className="flex-1 relative">
                        <Input
                          type="number"
                          value={item.heightMm}
                          onChange={(e) => updateItem(index, "heightMm", e.target.value)}
                          placeholder="0"
                          className="flex-1 pr-14"
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted pointer-events-none">
                          Boy (Yükseklik)
                        </span>
                      </div>
                      <span className="text-xs text-text-muted self-center shrink-0">mm</span>
                    </div>
                  </div>

                  {/* ── Quality Status + Damaged/Missing Counts ── */}
                  <div className="grid grid-cols-4 items-center gap-2">
                    <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.qualityStatus")}</label>
                    <Select value={item.qualityStatus} onValueChange={(v) => {
                      updateItem(index, "qualityStatus", v);
                      if (v === "accepted") {
                        updateItem(index, "damagedCount", "");
                        updateItem(index, "missingCount", "");
                      }
                    }}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="accepted">{t("goodsReceipt.qualityAccepted")}</SelectItem>
                        <SelectItem value="conditional">{t("goodsReceipt.qualityConditional")}</SelectItem>
                        <SelectItem value="rejected">{t("goodsReceipt.qualityRejected")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-4 items-center gap-2">
                    <label className="text-xs font-medium text-text-muted col-span-1" title="Kırık plaka adedi">
                      🔴 {t("goodsReceipt.damaged")}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={item.damagedCount}
                      onChange={(e) => updateItem(index, "damagedCount", e.target.value)}
                      placeholder="0"
                      disabled={item.qualityStatus === "accepted"}
                      className="col-span-3"
                    />
                  </div>

                  <div className="grid grid-cols-4 items-center gap-2">
                    <label className="text-xs font-medium text-text-muted col-span-1" title="Eksik plaka adedi">
                      ⚠️ {t("goodsReceipt.missing")}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={item.missingCount}
                      onChange={(e) => updateItem(index, "missingCount", e.target.value)}
                      placeholder="0"
                      disabled={item.qualityStatus === "accepted"}
                      className="col-span-3"
                    />
                  </div>

                  {/* ── Lot No ── */}
                  <div className="grid grid-cols-4 items-center gap-2">
                    <label className="text-xs font-medium text-text-muted col-span-1">Lot No</label>
                    <Input
                      value={item.lotNumber}
                      onChange={(e) => updateItem(index, "lotNumber", e.target.value)}
                      placeholder="Tedarikçi lot"
                      className="col-span-3"
                    />
                  </div>

                  {/* ── Plate Tracking ── */}
                  <div className="grid grid-cols-4 items-center gap-2">
                    <label className="text-xs font-medium text-text-muted col-span-1">{t("goodsReceipt.plates")}</label>
                    <div className="col-span-3 flex items-center gap-2">
                      <Switch
                        checked={item.isPlateTracked}
                        onCheckedChange={(v) => updateItem(index, "isPlateTracked", v)}
                      />
                      <span className="text-xs text-text-muted">{t("goodsReceipt.plateTracking")}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Notes ── */}
          <div>
            <h3 className="text-sm font-semibold text-text-primary border-b border-glass-border pb-2 mb-4">
              {t("goodsReceipt.notes")}
            </h3>
            <Textarea
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>
        </div>

        <MaterialSelectionDialog
          open={materialDialogOpen}
          onOpenChange={setMaterialDialogOpen}
          onSelect={handleMaterialSelect}
        />

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
