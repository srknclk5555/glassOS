"use client";

import * as React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@repo/ui";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Combobox,
} from "@repo/ui";
import type { ComboboxOption } from "@repo/ui";
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  Calculator,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Layers,
} from "lucide-react";
import { createProductionOrderAction } from "@/app/actions/production-orders";
import { listRecipes } from "@/app/actions/recipes";
import { getMyFactoryConfigurationAction } from "@/app/actions/factory-config";
import { RecipeEngine } from "@repo/engine";
import type { RecipeEngineInput, RecipeEngineOutput } from "@repo/engine";
import type { FactoryConfiguration } from "@repo/types";

/* ── ULID Generator ──────────────────────────────────────────────────── */

function generateULID(): string {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const timestamp = Date.now().toString(36).toUpperCase().padStart(10, "0");
  let random = "";
  for (let i = 0; i < 16; i++) {
    random += chars[Math.floor(Math.random() * 32)];
  }
  return (timestamp + random).slice(0, 26);
}

/* ── Types ────────────────────────────────────────────────────────────── */

interface OrderItem {
  tempId: string;
  recipeId: string;
  recipeCode: string;
  recipeName: string;
  netWidthMm: number;
  netHeightMm: number;
  quantity: number;
}

/* ── Helpers ──────────────────────────────────────────────────────────── */

function formatArea(m2: number): string {
  return `${m2.toFixed(3)} m²`;
}

function formatStage(stage?: { widthMm: number; heightMm: number; areaM2: number }): string {
  if (!stage) return "—";
  return `${stage.widthMm}×${stage.heightMm} mm`;
}

/* ── Engine Preview Panel (Recipe-Level Only) ────────────────────────────
 *
 * This panel shows ONLY what is known at recipe/order-creation time:
 *   • Production dimensions (Net → Rodaj → Production Size)
 *   • Recipe-level BOM material requirements
 *   • Recipe-level fire losses (process % losses, NOT trim/scrap)
 *   • Product output
 *
 * The following are deliberately excluded — they belong to the
 * Production Calculation Engine (cutting time, sheet-dependent):
 *   • Trim firesi (jumbo plate trimming)
 *   • Remnant / Scrap / Gerçek tüketim / Yield
 *   • Efficiency bar (misleading before actual cutting)
 */

function EnginePreviewPanel({ result }: { result: RecipeEngineOutput | null }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);

  if (!result) {
    return (
      <Card className="border-dashed border-gray-300">
        <CardContent className="p-6 text-center">
          <Calculator className="mx-auto mb-2 h-8 w-8 text-text-muted" />
          <p className="text-sm text-text-muted">
            {t("productionOrders.productionPreviewDesc")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const { dimensions, totals, consumedMaterials, fireLosses, producedProducts, appliedSettings } = result;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                {t("productionOrders.productionPreview")}
              </CardTitle>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                REÇETE ÖN İZLEME
              </span>
            </div>
            <CardDescription>
              {t("productionOrders.productionPreviewDesc")}
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {/* Dimension Pipeline — 3 aşama: Net → Rodaj → Production Size */}
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-lg border bg-blue-50 p-3 text-center">
            <p className="text-xs font-medium text-blue-600">{t("productionOrders.netSizeLabel")}</p>
            <p className="text-sm font-semibold text-blue-800">{formatStage(dimensions.net)}</p>
            <p className="text-xs text-blue-500">{formatArea(dimensions.net?.areaM2 ?? 0)}</p>
          </div>
          <div className="rounded-lg border bg-purple-50 p-3 text-center">
            <p className="text-xs font-medium text-purple-600">+ Rodaj</p>
            <p className="text-sm font-semibold text-purple-800">{formatStage(dimensions.afterRodaj)}</p>
            <p className="text-xs text-purple-500">{formatArea(dimensions.afterRodaj?.areaM2 ?? 0)}</p>
          </div>
          <div className="rounded-lg border bg-green-50 p-3 text-center">
            <p className="text-xs font-medium text-green-600">{t("productionOrders.productionSize")}</p>
            <p className="text-sm font-semibold text-green-800">{formatStage(dimensions.production)}</p>
            <p className="text-xs text-green-500">{formatArea(dimensions.production?.areaM2 ?? 0)}</p>
          </div>
        </div>

        {/* Totals — reçete seviyesinde bilinenler */}
        <div className="mb-3 grid grid-cols-3 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-text-muted">Net Alan (Toplam)</p>
            <p className="text-sm font-semibold">{formatArea(totals.netAreaM2)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-text-muted">Üretim Alanı (Toplam)</p>
            <p className="text-sm font-semibold">{formatArea(totals.productionAreaM2)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-text-muted">Reçete Fire Oranı</p>
            <p className="text-sm font-semibold">{result.totalFireRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Uyarı notu */}
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-[11px] text-amber-700">
            ⚠️ Bu ön izleme yalnızca reçete verilerine dayanmaktadır. 
            Gerçek trim firesi, remnant, hurda, verim ve malzeme tüketimi 
            üretim sırasında hangi plakaların kullanılacağı belirlendiğinde 
            Production Calculation Engine tarafından hesaplanacaktır.
          </p>
        </div>

        {/* Expandable Details */}
        {expanded && (
          <div className="space-y-4 border-t pt-4">
            {/* Applied Settings */}
            <div>
              <p className="text-xs font-medium text-text-muted mb-2">Applied Settings</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded border p-2">
                  <span className="font-medium">Rodaj: </span>
                  {appliedSettings.rodaj.enabled
                    ? `T:${appliedSettings.rodaj.top} B:${appliedSettings.rodaj.bottom} L:${appliedSettings.rodaj.left} R:${appliedSettings.rodaj.right} (${appliedSettings.rodaj.source})`
                    : "Disabled"}
                </div>
                <div className="rounded border p-2">
                  <span className="font-medium">Trim (fabrika varsayılan): </span>
                  {appliedSettings.trim.enabled
                    ? `T:${appliedSettings.trim.top} B:${appliedSettings.trim.bottom} L:${appliedSettings.trim.left} R:${appliedSettings.trim.right} — Kesim anında plaka bazında uygulanır`
                    : "Disabled"}
                </div>
              </div>
            </div>

            {/* Consumed Materials (Recipe BOM) */}
            {consumedMaterials.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">{t("productionOrders.consumption")}</p>
                <div className="space-y-1">
                  {consumedMaterials.map((m, i) => (
                    <div key={i} className="flex items-center justify-between rounded border px-3 py-1.5 text-xs">
                      <span>{m.materialName}</span>
                      <span className="font-medium">{m.grossQuantity.toFixed(3)} {m.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recipe Fire Losses */}
            {fireLosses.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">Reçete Fire Kayıpları</p>
                <div className="space-y-1">
                  {fireLosses.map((f, i) => (
                    <div key={i} className="flex items-center justify-between rounded border px-3 py-1.5 text-xs">
                      <span>{f.fireTypeLabel}</span>
                      <span className="font-medium">{f.lossAreaM2.toFixed(3)} m² ({f.lossPercentage.toFixed(1)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Produced Products */}
            {producedProducts.length > 0 && (
              <div>
                <p className="text-xs font-medium text-text-muted mb-2">{t("productionOrders.totalProduction")}</p>
                <div className="space-y-1">
                  {producedProducts.map((p, i) => (
                    <div key={i} className="flex items-center justify-between rounded border px-3 py-1.5 text-xs">
                      <span>{p.productName}</span>
                      <span className="font-medium">{p.quantity} {p.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   Production Order Create Page
   ═══════════════════════════════════════════════════════════════════════════ */

export function ProductionOrderCreateClient() {
  const { t } = useI18n();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── Factory Config (for engine) ── */
  const [factoryConfig, setFactoryConfig] = useState<FactoryConfiguration | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const config = await getMyFactoryConfigurationAction();
        setFactoryConfig(config);
      } catch {
        setFactoryConfig(null);
      } finally {
        setConfigLoading(false);
      }
    }
    load();
  }, []);

  /* ── General Info ── */
  const [orderNo, setOrderNo] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [productionDate, setProductionDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  /* ── Items ── */
  const [items, setItems] = useState<OrderItem[]>([]);

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { tempId: generateULID(), recipeId: "", recipeCode: "", recipeName: "", netWidthMm: 0, netHeightMm: 0, quantity: 1 },
    ]);
  }, []);

  const removeItem = useCallback((tempId: string) => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  }, []);

  const updateItem = useCallback(
    (tempId: string, updates: Partial<OrderItem>) => {
      setItems((prev) =>
        prev.map((i) => (i.tempId === tempId ? { ...i, ...updates } : i))
      );
    },
    []
  );

  /* ── Recipe Options (loaded on mount) ── */
  const [recipeOptions, setRecipeOptions] = useState<ComboboxOption[]>([]);
  const [recipeSearchLoading, setRecipeSearchLoading] = useState(false);

  // Load all active recipes on mount for the Combobox (client-side search)
  useEffect(() => {
    async function loadRecipes() {
      setRecipeSearchLoading(true);
      try {
        const result = await listRecipes({
          page: 1,
          limit: 200,
          activeOnly: true,
        });
        const options: ComboboxOption[] = (result?.items ?? []).map((r: any) => ({
          value: r.id,
          label: `${r.recipeCode} — ${r.name}`,
          subtitle: r.productType ?? undefined,
        }));
        setRecipeOptions(options);
      } catch {
        setRecipeOptions([]);
      } finally {
        setRecipeSearchLoading(false);
      }
    }
    loadRecipes();
  }, []);

  /* ── Engine Calculation (derived via useMemo) ── */
  const engineResults = useMemo(() => {
    const map = new Map<string, RecipeEngineOutput | null>();
    if (!factoryConfig) return map;

    for (const item of items) {
      if (!item.recipeId || item.netWidthMm <= 0 || item.netHeightMm <= 0 || item.quantity <= 0) {
        map.set(item.tempId, null);
        continue;
      }
      try {
        const input: RecipeEngineInput = {
          netWidthMm: item.netWidthMm,
          netHeightMm: item.netHeightMm,
          quantity: item.quantity,
          rodaj: { useDefaults: true, top: 0, bottom: 0, left: 0, right: 0 },
          trim: { useDefaults: true, top: 0, bottom: 0, left: 0, right: 0 },
          bomItems: [],
          fireItems: [],
          outputItems: [{ materialId: item.recipeId, productCode: item.recipeCode, productName: item.recipeName, quantityPerUnit: 1, unit: "m²" }],
          factoryConfiguration: factoryConfig,
        };
        map.set(item.tempId, RecipeEngine.calculate(input));
      } catch {
        map.set(item.tempId, null);
      }
    }
    return map;
  }, [factoryConfig, items]);

  /* ── Handle Recipe Select ── */
  const handleRecipeSelect = useCallback(
    (tempId: string, recipeId: string) => {
      const selected = recipeOptions.find((o) => o.value === recipeId);
      if (!selected) return;
      const labelParts = selected.label.split(" — ");
      updateItem(tempId, {
        recipeId,
        recipeCode: labelParts[0] ?? "",
        recipeName: labelParts[1] ?? selected.label,
      });
    },
    [recipeOptions, updateItem]
  );

  /* ── Compute aggregated totals ── */
  const aggregatedTotals = useMemo(() => {
    let totalNetM2 = 0;
    let totalProdM2 = 0;
    let totalFirePct = 0;
    let totalPieces = 0;

    items.forEach((item) => {
      const r = engineResults.get(item.tempId);
      if (!r) return;
      totalNetM2 += r.totals.netAreaM2;
      totalProdM2 += r.totals.productionAreaM2;
      totalFirePct += r.totalFireRate * item.quantity;
      totalPieces += item.quantity;
    });

    return { totalNetM2, totalProdM2, totalFirePct, totalPieces };
  }, [items, engineResults]);

  /* ── Save ── */
  const handleSave = useCallback(async () => {
    if (!orderNo.trim()) {
      setError("Order number is required");
      return;
    }
    if (items.length === 0) {
      setError("At least one item is required");
      return;
    }
    if (items.some((i) => !i.recipeId || i.netWidthMm <= 0 || i.netHeightMm <= 0)) {
      setError("All items must have a recipe, net width, and net height");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // Run one final engine calc for each item to get fresh snapshots
      const finalItems = items.map((item, idx) => {
        let engineSnapshot = engineResults.get(item.tempId) ?? null;
        if (!engineSnapshot && factoryConfig) {
          try {
            engineSnapshot = RecipeEngine.calculate({
              netWidthMm: item.netWidthMm,
              netHeightMm: item.netHeightMm,
              quantity: item.quantity,
              rodaj: { useDefaults: true, top: 0, bottom: 0, left: 0, right: 0 },
              trim: { useDefaults: true, top: 0, bottom: 0, left: 0, right: 0 },
              bomItems: [],
              fireItems: [],
              outputItems: [{ materialId: item.recipeId, productCode: item.recipeCode, productName: item.recipeName, quantityPerUnit: 1, unit: "m²" }],
              factoryConfiguration: factoryConfig,
            });
          } catch { /* keep null */ }
        }
        return {
          id: generateULID(),
          recipeId: item.recipeId,
          recipeCode: item.recipeCode,
          recipeName: item.recipeName,
          netWidthMm: item.netWidthMm,
          netHeightMm: item.netHeightMm,
          quantity: item.quantity,
          engineSnapshot,
          sequence: idx + 1,
        };
      });

      const payload = {
        id: generateULID(),
        orderNo: orderNo.trim(),
        customerName: customerName.trim() || undefined,
        productionDate: productionDate || undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
        items: finalItems,
      };

      await createProductionOrderAction(payload);
      router.push("/production/orders");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : t("productionOrders.error.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }, [orderNo, customerName, productionDate, dueDate, notes, items, factoryConfig, engineResults, router, t]);

  /* ── Render ── */
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/production/orders")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {t("productionOrders.newOrder")}
            </h1>
            <p className="text-sm text-text-muted">
              {t("productionOrders.newOrderDesc")}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>Saving...</>
          ) : (
            <>
              <Save className="mr-1.5 h-4 w-4" />
              {t("productionOrders.newOrder")}
            </>
          )}
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <Card className="border-red-300 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <p className="text-sm font-medium">{error}</p>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setError(null)}>
                Dismiss
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("productionOrders.generalInfo")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">
                {t("productionOrders.orderNo")} <span className="text-red-500">*</span>
              </label>
              <Input
                value={orderNo}
                onChange={(e) => setOrderNo(e.target.value)}
                placeholder="PO-2025-001"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">
                {t("productionOrders.customer")}
              </label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">
                {t("productionOrders.productionDate")}
              </label>
              <Input
                type="date"
                value={productionDate}
                onChange={(e) => setProductionDate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">
                {t("productionOrders.dueDate")}
              </label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
            <div className="col-span-full flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">
                {t("productionOrders.notes")}
              </label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes..."
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{t("productionOrders.items")}</CardTitle>
              <CardDescription>{t("productionOrders.selectRecipe")}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-1.5 h-4 w-4" />
              {t("productionOrders.addItem")}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="py-8 text-center">
              <Layers className="mx-auto mb-2 h-8 w-8 text-text-muted" />
              <p className="text-sm text-text-muted">{t("productionOrders.noItemsDesc")}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={addItem}>
                <Plus className="mr-1.5 h-4 w-4" />
                {t("productionOrders.addItem")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => {
                const engineResult = engineResults.get(item.tempId) ?? null;
                return (
                <div key={item.tempId} className="rounded-lg border p-4">
                  {/* Item Header */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-text-muted">
                      {t("productionOrders.product")} #{index + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => removeItem(item.tempId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  {/* Item Fields */}
                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2 flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-text-muted">
                        {t("productionOrders.recipe")} <span className="text-red-500">*</span>
                      </label>
                      <Combobox
                        options={recipeOptions}
                        value={item.recipeId}
                        onChange={(val) => handleRecipeSelect(item.tempId, val)}
                        placeholder={t("productionOrders.selectRecipePlaceholder")}
                        searchPlaceholder={t("productionOrders.selectRecipePlaceholder")}
                        loading={recipeSearchLoading}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-text-muted">
                        {t("productionOrders.netWidth")} <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={item.netWidthMm || ""}
                        onChange={(e) =>
                          updateItem(item.tempId, { netWidthMm: Number(e.target.value) || 0 })
                        }
                        placeholder="mm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-text-muted">
                        {t("productionOrders.netHeight")} <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min={1}
                        value={item.netHeightMm || ""}
                        onChange={(e) =>
                          updateItem(item.tempId, { netHeightMm: Number(e.target.value) || 0 })
                        }
                        placeholder="mm"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-text-muted">
                        {t("productionOrders.quantity")} <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={item.quantity || ""}
                        onChange={(e) =>
                          updateItem(item.tempId, { quantity: Math.max(1, Number(e.target.value) || 1) })
                        }
                      />
                    </div>
                  </div>

                  {/* Per-item Engine Preview */}
                  {(item.netWidthMm > 0 && item.netHeightMm > 0) && (
                    <div className="mt-3">
                      <EnginePreviewPanel result={engineResult} />
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aggregated Summary (Recipe-Level Only) */}
      {items.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{t("productionOrders.productionSummary")}</CardTitle>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                REÇETE ÖN İZLEME
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-text-muted">Net Alan (Toplam)</p>
                <p className="text-lg font-semibold">{formatArea(aggregatedTotals.totalNetM2)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-text-muted">Üretim Alanı (Toplam)</p>
                <p className="text-lg font-semibold">{formatArea(aggregatedTotals.totalProdM2)}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-text-muted">Toplam Adet</p>
                <p className="text-lg font-semibold">{aggregatedTotals.totalPieces} pcs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
