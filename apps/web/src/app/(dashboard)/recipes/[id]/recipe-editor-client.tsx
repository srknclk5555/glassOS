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
  Textarea,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Combobox,
  Badge,
  Switch,
  Skeleton,
  EmptyState,
} from "@repo/ui";
import type { ComboboxOption } from "@repo/ui";
import {
  ArrowLeft,
  Save,
  Loader2,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  CheckCircle2,
  FileText,
  FlaskConical,
  Layers,
  ListChecks,
  ClipboardList,
  Eye,
} from "lucide-react";
import {
  saveRecipe,
  getRecipeDetail,
  listRecipeVersions,
} from "@/app/actions/recipes";
import { getMaterialsAction } from "@/app/actions/materials";
import { getStationsAction } from "@/app/actions/stations";
import { getMyFactoryConfigurationAction } from "@/app/actions/factory-config";
import { RecipeEngine } from "@repo/engine";
import type { RecipeEngineInput, RecipeEngineOutput } from "@repo/engine";
import type { FactoryConfiguration } from "@repo/types";

/* ── Constants ───────────────────────────────────────────────────────── */

const PRODUCT_TYPE_OPTIONS = [
  { value: "flat_tempered", labelKey: "recipes.productType.flatTempered" },
  { value: "bent_tempered", labelKey: "recipes.productType.bentTempered" },
  { value: "laminated", labelKey: "recipes.productType.laminated" },
  { value: "coated", labelKey: "recipes.productType.coated" },
  { value: "insulated", labelKey: "recipes.productType.insulated" },
  { value: "mirror", labelKey: "recipes.productType.mirror" },
] as const;

const UNIT_OPTIONS = [
  { value: "kg", labelKey: "recipes.unitOptions.kg" },
  { value: "m2", labelKey: "recipes.unitOptions.m2" },
  { value: "m", labelKey: "recipes.unitOptions.m" },
  { value: "pieces", labelKey: "recipes.unitOptions.pieces" },
  { value: "litre", labelKey: "recipes.unitOptions.litre" },
  { value: "ton", labelKey: "recipes.unitOptions.ton" },
] as const;

/* ── Simple ULID Generator ────────────────────────────────────────────── */

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

interface BOMItem {
  tempId: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  materialType: string;
  consumptionBasis: string;
  quantityPerUnit: number;
  unit: string;
  sequence: number;
  wastePercentage: number | null;
}

interface OperationItem {
  tempId: string;
  operationCode: string;
  sequence: number;
  isMandatory: boolean;
  notes: string;
}

interface OutputItem {
  tempId: string;
  materialId: string;
  materialCode: string;
  materialName: string;
  materialType: string;
  quantityPerUnit: number;
  unit: string;
  sequence: number;
  notes: string;
}

interface FireItem {
  tempId: string;
  fireType: "cutting" | "temperLoss" | "breakage" | "operatorLoss" | "scrap" | "custom";
  rate: number;
  unit: string;
  notes: string;
}

interface RodajSettings {
  enabled: boolean;
  useDefaults: boolean;
  applyAllEdges: boolean;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface TrimSettings {
  enabled: boolean;
  useDefaults: boolean;
  applyAllEdges: boolean;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface ProductionRules {
  temperRequired: boolean;
  lowEOrientationRequired: boolean;
  rodajRequired: boolean;
  drillingAllowed: boolean;
  cncRequired: boolean;
  channelAllowed: boolean;
  minMeasureMm: number;
  maxMeasureMm: number;
}

const defaultProductionRules: ProductionRules = {
  temperRequired: false,
  lowEOrientationRequired: false,
  rodajRequired: true,
  drillingAllowed: false,
  cncRequired: false,
  channelAllowed: false,
  minMeasureMm: 0,
  maxMeasureMm: 0,
};

interface ValidationResult {
  type: "error" | "warning" | "info";
  message: string;
  field?: string;
}

const defaultRodaj: RodajSettings = {
  enabled: false,
  useDefaults: true,
  applyAllEdges: true,
  top: 2,
  bottom: 2,
  left: 2,
  right: 2,
};

const defaultTrim: TrimSettings = {
  enabled: false,
  useDefaults: true,
  applyAllEdges: true,
  top: 1,
  bottom: 1,
  left: 1,
  right: 1,
};

interface FormData {
  recipeCode: string;
  name: string;
  productType: string;
  notes: string;
}

const emptyForm: FormData = {
  recipeCode: "",
  name: "",
  productType: "",
  notes: "",
};

/* ── Validation Panel View ─────────────────────────────────────────────── */

function ValidationPanel({ results }: { results: ValidationResult[] }) {
  const { t } = useI18n();

  if (results.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>{t("recipes.validation.noIssues") ?? "No validation issues found"}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {results.map((r, i) => (
        <div
          key={i}
          className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm ${
            r.type === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
              : r.type === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400"
                : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400"
          }`}
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span>{r.message}</span>
            {r.field && (
              <span className="text-xs opacity-70">{r.field}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Version Summary Section ──────────────────────────────────────────── */

function VersionSummary({
  version,
  createdAt,
  updatedAt,
  loading,
}: {
  version?: number;
  createdAt?: string;
  updatedAt?: string;
  loading: boolean;
}) {
  const { t } = useI18n();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("recipes.versionSummary") ?? "Version Summary"}</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-36" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-text-muted" />
          <CardTitle>{t("recipes.versionSummary") ?? "Version Summary"}</CardTitle>
        </div>
        <CardDescription>
          {t("recipes.versionSummaryDesc") ?? "Read-only version information"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex flex-col gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-text-muted">{t("recipes.currentVersion") ?? "Current Version"}:</span>
            <Badge variant="info">v{version ?? 1}</Badge>
          </div>
          {createdAt && (
            <div className="flex items-center gap-2">
              <span className="text-text-muted">{t("recipes.createdAt") ?? "Created"}:</span>
              <span>{new Date(createdAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}</span>
            </div>
          )}
          {updatedAt && (
            <div className="flex items-center gap-2">
              <span className="text-text-muted">{t("recipes.lastUpdated") ?? "Last Updated"}:</span>
              <span>{new Date(updatedAt).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Production Summary Card ──────────────────────────────────────────── */

function ProductionSummaryCard({
  result,
  factoryConfig,
  showDetails,
  onToggleDetails,
  simNetWidthMm,
  simNetHeightMm,
  simQuantity,
  onWidthChange,
  onHeightChange,
  onQuantityChange,
  submitting,
}: {
  result: RecipeEngineOutput | null;
  factoryConfig: FactoryConfiguration | null;
  showDetails: boolean;
  onToggleDetails: () => void;
  simNetWidthMm: number;
  simNetHeightMm: number;
  simQuantity: number;
  onWidthChange: (v: number) => void;
  onHeightChange: (v: number) => void;
  onQuantityChange: (v: number) => void;
  submitting: boolean;
}) {
  const { t } = useI18n();

  const formatM2 = (val: number) =>
    val.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 });

  const formatMm = (val: number) =>
    val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 1 });

  const formatPct = (val: number) =>
    (val * 100).toFixed(1) + "%";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-blue-600" />
            <CardTitle>{t("recipes.productionSummary") ?? "Production Summary"}</CardTitle>
          </div>
          {result && (
            <Button variant="ghost" size="sm" onClick={onToggleDetails}>
              {showDetails
                ? (t("recipes.hideSizeDetails") ?? "Hide Details")
                : (t("recipes.showSizeDetails") ?? "Show Details")}
            </Button>
          )}
        </div>
        <CardDescription>
          {t("recipes.productionSummaryDesc") ?? "Live calculation preview — net ölçü simulasyonu"}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {!factoryConfig ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
            <span className="ml-2 text-sm text-text-muted">
              {t("recipes.loadingFactoryConfig") ?? "Factory configuration loading..."}
            </span>
          </div>
        ) : !result ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-400">
            {t("recipes.engineNoResult") ?? "Enter dimensions and materials to see the production summary"}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* ── Simulation Inputs ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-muted">
                  {t("recipes.netWidth") ?? "Net Width (mm)"}
                </label>
                <Input
                  type="number"
                  value={simNetWidthMm}
                  onChange={(e) => onWidthChange(parseFloat(e.target.value) || 0)}
                  min={1}
                  step={1}
                  disabled={submitting}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-muted">
                  {t("recipes.netHeight") ?? "Net Height (mm)"}
                </label>
                <Input
                  type="number"
                  value={simNetHeightMm}
                  onChange={(e) => onHeightChange(parseFloat(e.target.value) || 0)}
                  min={1}
                  step={1}
                  disabled={submitting}
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-text-muted">
                  {t("recipes.quantity") ?? "Quantity"}
                </label>
                <Input
                  type="number"
                  value={simQuantity}
                  onChange={(e) => onQuantityChange(Math.max(1, parseInt(e.target.value) || 1))}
                  min={1}
                  step={1}
                  disabled={submitting}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            {/* ── Dimension Pipeline ── */}
            <div className="rounded-lg border border-glass-border bg-glass-surface p-3">
              <div className="flex flex-col gap-2">
                {/* Net → Trim → Rodaj → Production */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <div className="flex flex-col items-center rounded bg-blue-50 px-2 py-1 dark:bg-blue-950">
                    <span className="text-text-muted">{t("recipes.netSize") ?? "Net"}</span>
                    <span className="font-semibold">{formatMm(result.dimensions.net.widthMm)} × {formatMm(result.dimensions.net.heightMm)}</span>
                    <span className="text-text-muted">{formatM2(result.dimensions.net.areaM2)} m²</span>
                  </div>
                  <span className="text-text-muted">→</span>
                  <div className="flex flex-col items-center rounded bg-amber-50 px-2 py-1 dark:bg-amber-950">
                    <span className="text-text-muted">{t("recipes.trimSize") ?? "Trim"}</span>
                    <span className="font-semibold">{formatMm(result.dimensions.afterTrim.widthMm)} × {formatMm(result.dimensions.afterTrim.heightMm)}</span>
                    <span className="text-text-muted">{formatM2(result.dimensions.afterTrim.areaM2)} m²</span>
                  </div>
                  <span className="text-text-muted">→</span>
                  <div className="flex flex-col items-center rounded bg-purple-50 px-2 py-1 dark:bg-purple-950">
                    <span className="text-text-muted">{t("recipes.rodajSize") ?? "Rodaj"}</span>
                    <span className="font-semibold">{formatMm(result.dimensions.afterRodaj.widthMm)} × {formatMm(result.dimensions.afterRodaj.heightMm)}</span>
                    <span className="text-text-muted">{formatM2(result.dimensions.afterRodaj.areaM2)} m²</span>
                  </div>
                  <span className="text-text-muted">→</span>
                  <div className="flex flex-col items-center rounded bg-green-50 px-2 py-1 dark:bg-green-950">
                    <span className="text-text-muted">{t("recipes.productionSize") ?? "Prod."}</span>
                    <span className="font-semibold">{formatMm(result.dimensions.production.widthMm)} × {formatMm(result.dimensions.production.heightMm)}</span>
                    <span className="text-text-muted">{formatM2(result.dimensions.production.areaM2)} m²</span>
                  </div>
                </div>

                {/* Efficiency bar */}
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-text-muted">
                    {t("recipes.efficiency") ?? "Efficiency"}:
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-glass-border">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{ width: `${Math.min(result.efficiency * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold">
                    {formatPct(result.efficiency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Totals row */}
            <div className="grid grid-cols-4 gap-3 text-center text-xs">
              <div className="rounded-lg border border-glass-border p-2">
                <span className="block text-text-muted">{t("recipes.netArea") ?? "Net Area"}</span>
                <span className="text-sm font-semibold">{formatM2(result.totals.netAreaM2)} m²</span>
              </div>
              <div className="rounded-lg border border-glass-border p-2">
                <span className="block text-text-muted">{t("recipes.productionArea") ?? "Prod. Area"}</span>
                <span className="text-sm font-semibold">{formatM2(result.totals.productionAreaM2)} m²</span>
              </div>
              <div className="rounded-lg border border-glass-border p-2">
                <span className="block text-text-muted">{t("recipes.totalFireRate") ?? "Fire Rate"}</span>
                <span className="text-sm font-semibold">{result.totalFireRate.toFixed(1)}%</span>
              </div>
              <div className="rounded-lg border border-glass-border p-2">
                <span className="block text-text-muted">{t("recipes.totalGlassConsumption") ?? "Glass Req."}</span>
                <span className="text-sm font-semibold">{formatM2(result.totals.totalGlassConsumptionM2)} m²</span>
              </div>
            </div>

            {/* ── Show/Hide Details ── */}
            {showDetails && (
              <div className="flex flex-col gap-4 rounded-lg border border-glass-border p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {t("recipes.calculationDetails") ?? "Calculation Details"}
                </h4>

                {/* Applied Settings */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs font-medium text-text-muted">
                      {t("recipes.rodaj.title") ?? "Rodaj"} ({result.appliedSettings.rodaj.source === "factory" ? t("recipes.fromFactory") ?? "Fabrika" : t("recipes.fromRecipe") ?? "Reçete"})
                    </span>
                    <div className="mt-1 text-xs">
                      {result.appliedSettings.rodaj.enabled ? (
                        <span>T:{result.appliedSettings.rodaj.top} B:{result.appliedSettings.rodaj.bottom} L:{result.appliedSettings.rodaj.left} R:{result.appliedSettings.rodaj.right} mm</span>
                      ) : (
                        <span className="text-text-muted">{t("recipes.disabled") ?? "Disabled"}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-text-muted">
                      {t("recipes.trim.title") ?? "Trim"} ({result.appliedSettings.trim.source === "factory" ? t("recipes.fromFactory") ?? "Fabrika" : t("recipes.fromRecipe") ?? "Reçete"})
                    </span>
                    <div className="mt-1 text-xs">
                      {result.appliedSettings.trim.enabled ? (
                        <span>T:{result.appliedSettings.trim.top} B:{result.appliedSettings.trim.bottom} L:{result.appliedSettings.trim.left} R:{result.appliedSettings.trim.right} mm</span>
                      ) : (
                        <span className="text-text-muted">{t("recipes.disabled") ?? "Disabled"}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Consumed Materials */}
                {result.consumedMaterials.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-text-muted">
                      {t("recipes.consumedMaterials") ?? "Consumed Materials"}
                    </span>
                    <div className="mt-1 flex flex-col gap-1">
                      {result.consumedMaterials.map((cm, i) => (
                        <div key={i} className="flex items-center justify-between rounded bg-glass-elevated px-2 py-1 text-xs">
                          <span className="font-medium">{cm.materialName || cm.materialCode}</span>
                          <span className="text-text-muted">
                            {cm.grossQuantity.toFixed(3)} {cm.unit}
                            {cm.wasteQuantity > 0 && (
                              <span className="ml-1 text-red-500">(+{cm.wasteQuantity.toFixed(3)} fire)</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fire Losses */}
                {result.fireLosses.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-text-muted">
                      {t("recipes.fireDefinitions") ?? "Fire Losses"}
                    </span>
                    <div className="mt-1 flex flex-col gap-1">
                      {result.fireLosses.map((fl, i) => (
                        <div key={i} className="flex items-center justify-between rounded bg-glass-elevated px-2 py-1 text-xs">
                          <span>{fl.fireTypeLabel}</span>
                          <span className="text-text-muted">
                            {fl.rate}{fl.unit} ({fl.lossAreaM2.toFixed(3)} m²)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Produced Products */}
                {result.producedProducts.length > 0 && (
                  <div>
                    <span className="text-xs font-medium text-text-muted">
                      {t("recipes.producedProducts") ?? "Produced Products"}
                    </span>
                    <div className="mt-1 flex flex-col gap-1">
                      {result.producedProducts.map((pp, i) => (
                        <div key={i} className="flex items-center justify-between rounded bg-glass-elevated px-2 py-1 text-xs">
                          <span className="font-medium">{pp.productName || pp.productCode}</span>
                          <span className="text-text-muted">
                            {pp.quantity.toFixed(2)} {pp.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RecipeEditorClient — Full Recipe Editor with 10 Sections
   ═══════════════════════════════════════════════════════════════════════════ */

interface RecipeEditorClientProps {
  recipeId?: string;
}

export function RecipeEditorClient({ recipeId }: RecipeEditorClientProps) {
  const { t } = useI18n();
  const router = useRouter();

  /* ── Core State ── */
  const [loading, setLoading] = useState(!!recipeId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  /* ── Extended State ── */
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [operations, setOperations] = useState<OperationItem[]>([]);
  const [outputItems, setOutputItems] = useState<OutputItem[]>([]);
  const [fireItems, setFireItems] = useState<FireItem[]>([]);
  const [rodaj, setRodaj] = useState<RodajSettings>(defaultRodaj);
  const [trim, setTrim] = useState<TrimSettings>(defaultTrim);
  const [productionRules, setProductionRules] = useState<ProductionRules>(defaultProductionRules);
  const [productionFirePercent, setProductionFirePercent] = useState(3.0);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [recipeVersion, setRecipeVersion] = useState<number | undefined>(undefined);
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);

  /* ── Engine & Factory Config State ── */
  const [engineResult, setEngineResult] = useState<RecipeEngineOutput | null>(null);
  const [factoryConfig, setFactoryConfig] = useState<FactoryConfiguration | null>(null);
  const [showEngineDetails, setShowEngineDetails] = useState(false);

  /* ── Simulation Inputs ── */
  const [simNetWidthMm, setSimNetWidthMm] = useState(500);
  const [simNetHeightMm, setSimNetHeightMm] = useState(2000);
  const [simQuantity, setSimQuantity] = useState(1);

  /* ── Material Combobox State ── */
  const [bomMaterialOptions, setBomMaterialOptions] = useState<ComboboxOption[]>([]);
  const [outputMaterialOptions, setOutputMaterialOptions] = useState<ComboboxOption[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  /* ── Station Combobox State ── */
  const [stationOptions, setStationOptions] = useState<ComboboxOption[]>([]);
  const [stationsLoading, setStationsLoading] = useState(false);

  /* ── Fetch Materials (for BOM Combobox — Hammadde + Yarı Mamul) ── */
  const fetchBomMaterials = useCallback(async (search?: string) => {
    setMaterialsLoading(true);
    try {
      const result = await getMaterialsAction({
        search,
        materialType: "raw_material,semi_finished",
        pageSize: 50,
        sortBy: "materialCode",
        sortOrder: "asc",
      });
      setBomMaterialOptions(
        (result?.items ?? []).map((m: any) => ({
          value: m.id,
          label: `${m.materialCode} - ${m.name}`,
          subtitle: m.materialType ?? undefined,
        }))
      );
    } catch {
      // Silently fail
    } finally {
      setMaterialsLoading(false);
    }
  }, []);

  /* ── Fetch Materials (for Output Combobox — Mamul + Yarı Mamul) ── */
  const fetchOutputMaterials = useCallback(async (search?: string) => {
    try {
      const result = await getMaterialsAction({
        search,
        materialType: "finished_good,semi_finished",
        pageSize: 50,
        sortBy: "materialCode",
        sortOrder: "asc",
      });
      setOutputMaterialOptions(
        (result?.items ?? []).map((m: any) => ({
          value: m.id,
          label: `${m.materialCode} - ${m.name}`,
          subtitle: m.materialType ?? undefined,
        }))
      );
    } catch {
      // Silently fail
    }
  }, []);

  /* ── Fetch Stations (for Operations Combobox) ── */
  const fetchStations = useCallback(async (search?: string) => {
    setStationsLoading(true);
    try {
      const result = await getStationsAction({
        search,
        isActive: "true",
        pageSize: 100,
        sortBy: "stationCode",
        sortOrder: "asc",
      });
      setStationOptions(
        (result?.items ?? []).map((s: any) => ({
          value: s.stationCode,
          label: `${s.stationCode} - ${s.name}`,
          subtitle: s.stationType ?? undefined,
        }))
      );
    } catch {
      // Silently fail
    } finally {
      setStationsLoading(false);
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchBomMaterials();
    fetchOutputMaterials();
    fetchStations();
  }, [fetchBomMaterials, fetchOutputMaterials, fetchStations]);

  /* ── Load Existing Recipe ── */
  useEffect(() => {
    if (!recipeId) return;
    const id: string = recipeId;

    let cancelled = false;

    async function load() {
      try {
        const [detail] = await Promise.all([
          getRecipeDetail(id),
          listRecipeVersions(id).catch(() => []),
        ]);

        if (cancelled) return;

        // Root fields
        setForm({
          recipeCode: detail.recipeCode ?? "",
          name: detail.name ?? "",
          productType: detail.productType ?? "",
          notes: detail.notes ?? "",
        });

        setIsActive(detail.isActive ?? true);
        setRecipeVersion(detail.version ?? 1);
        setCreatedAt(detail.createdAt ?? undefined);
        setUpdatedAt(detail.updatedAt ?? undefined);

        // BOM items
        if (Array.isArray(detail.items)) {
          setBomItems(
            detail.items.map((item: any, idx: number) => ({
              tempId: `loaded_${idx}`,
              materialId: item.materialId ?? "",
              materialCode: item.materialCode ?? "",
              materialName: item.materialName ?? "",
              materialType: item.materialType ?? "",
              consumptionBasis: item.consumptionBasis ?? "",
              quantityPerUnit: item.quantityPerUnit ?? 1,
              unit: item.unit ?? "",
              sequence: item.sequence ?? idx + 1,
              wastePercentage: item.wastePercentage ?? null,
            }))
          );
        }

        // Operations
        if (Array.isArray(detail.operations)) {
          setOperations(
            detail.operations.map((op: any, idx: number) => ({
              tempId: `loaded_op_${idx}`,
              operationCode: op.operationCode ?? "",
              sequence: op.sequence ?? idx + 1,
              isMandatory: op.isMandatory ?? true,
              notes: op.notes ?? "",
            }))
          );
        }

        // Outputs (produced products)
        if (Array.isArray(detail.outputs)) {
          setOutputItems(
            detail.outputs.map((o: any, idx: number) => ({
              tempId: `loaded_out_${idx}`,
              materialId: o.materialId ?? o.productId ?? "",
              materialCode: o.materialCode ?? o.product?.materialCode ?? "",
              materialName: o.materialName ?? o.productName ?? o.product?.name ?? "",
              materialType: o.materialType ?? o.product?.materialType ?? "",
              quantityPerUnit: o.quantityPerUnit ?? 1,
              unit: o.unit ?? "m2",
              sequence: o.sequence ?? idx + 1,
              notes: o.notes ?? "",
            }))
          );
        }

        // Fires
        if (Array.isArray(detail.fires)) {
          setFireItems(
            detail.fires.map((f: any, idx: number) => ({
              tempId: `loaded_fire_${idx}`,
              fireType: f.fireType ?? "cutting",
              rate: Number(f.rate) || 0,
              unit: f.unit ?? "%",
              notes: f.notes ?? "",
            }))
          );
        }

        // Rodaj settings
        if (detail.rodajSettings) {
          setRodaj({
            enabled: detail.rodajSettings.enabled ?? false,
            useDefaults: detail.rodajSettings.useDefaults ?? true,
            applyAllEdges: detail.rodajSettings.applyAllEdges ?? true,
            top: detail.rodajSettings.top ?? 2,
            bottom: detail.rodajSettings.bottom ?? 2,
            left: detail.rodajSettings.left ?? 2,
            right: detail.rodajSettings.right ?? 2,
          });
        }

        // Trim settings
        if (detail.trimSettings) {
          setTrim({
            enabled: detail.trimSettings.enabled ?? false,
            useDefaults: detail.trimSettings.useDefaults ?? true,
            applyAllEdges: detail.trimSettings.applyAllEdges ?? true,
            top: detail.trimSettings.top ?? 1,
            bottom: detail.trimSettings.bottom ?? 1,
            left: detail.trimSettings.left ?? 1,
            right: detail.trimSettings.right ?? 1,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : t("recipes.error.loadFailed")
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [recipeId, t]);

  /* ── Load Factory Configuration ── */
  useEffect(() => {
    async function loadFactoryConfig() {
      try {
        const config = await getMyFactoryConfigurationAction();
        setFactoryConfig(config);
      } catch {
        // Silently fail — engine won't run without config
        setFactoryConfig(null);
      }
    }
    loadFactoryConfig();
  }, []);

  /* ── Live Engine Calculation ── */
  useEffect(() => {
    if (!factoryConfig) {
      setEngineResult(null);
      return;
    }

    const input: RecipeEngineInput = {
      netWidthMm: simNetWidthMm,
      netHeightMm: simNetHeightMm,
      quantity: simQuantity,
      rodaj: {
        useDefaults: rodaj.useDefaults,
        top: rodaj.applyAllEdges ? rodaj.top : rodaj.top,
        bottom: rodaj.applyAllEdges ? rodaj.bottom : rodaj.bottom,
        left: rodaj.applyAllEdges ? rodaj.left : rodaj.left,
        right: rodaj.applyAllEdges ? rodaj.right : rodaj.right,
      },
      trim: {
        useDefaults: trim.useDefaults,
        top: trim.applyAllEdges ? trim.top : trim.top,
        bottom: trim.applyAllEdges ? trim.bottom : trim.bottom,
        left: trim.applyAllEdges ? trim.left : trim.left,
        right: trim.applyAllEdges ? trim.right : trim.right,
      },
      bomItems: bomItems
        .filter((b) => b.materialId && b.consumptionBasis)
        .map((b) => ({
          materialId: b.materialId,
          materialCode: b.materialCode,
          materialName: b.materialName,
          consumptionBasis: b.consumptionBasis as "area" | "perimeter" | "piece" | "fixed" | "duration",
          quantityPerUnit: b.quantityPerUnit,
          unit: b.unit,
          wastePercentage: b.wastePercentage ?? 0,
        })),
      fireItems: [
        ...fireItems.map((f) => ({
          fireType: f.fireType,
          fireTypeLabel: t(`recipes.fireTypes.${f.fireType}` as any) ?? f.fireType,
          rate: f.rate,
          unit: f.unit,
        })),
        ...(productionFirePercent > 0
          ? [{ fireType: "operatorLoss", fireTypeLabel: "Üretim Firesi", rate: productionFirePercent, unit: "%" }]
          : []),
      ],
      outputItems: outputItems
        .filter((o) => o.materialId)
        .map((o) => ({
          materialId: o.materialId,
          productCode: o.materialCode,
          productName: o.materialName,
          quantityPerUnit: o.quantityPerUnit,
          unit: o.unit,
        })),
      factoryConfiguration: factoryConfig,
    };

    try {
      const result = RecipeEngine.calculate(input);
      setEngineResult(result);
    } catch {
      // If calculation fails, keep previous result
    }
  }, [
    factoryConfig,
    simNetWidthMm,
    simNetHeightMm,
    simQuantity,
    rodaj,
    trim,
    bomItems,
    fireItems,
    outputItems,
    t,
    productionFirePercent,
  ]);

  /* ── Update Helper ── */
  const update = useCallback(
    (key: keyof FormData, value: string) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    []
  );

  /* ── BOM Item Handlers ── */
  const addBomItem = useCallback(() => {
    const newSeq = bomItems.length > 0
      ? Math.max(...bomItems.map((i) => i.sequence)) + 1
      : 1;
    const newItem: BOMItem = {
      tempId: `bom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      materialId: "",
      materialCode: "",
      materialName: "",
      materialType: "",
      consumptionBasis: "",
      quantityPerUnit: 1,
      unit: "",
      sequence: newSeq,
      wastePercentage: null,
    };
    setBomItems((prev) => [...prev, newItem]);
  }, [bomItems]);

  const removeBomItem = useCallback((tempId: string) => {
    setBomItems((prev) => prev.filter((i) => i.tempId !== tempId));
  }, []);

  const updateBomItem = useCallback(
    (tempId: string, key: keyof BOMItem, value: unknown) => {
      setBomItems((prev) =>
        prev.map((item) =>
          item.tempId === tempId ? { ...item, [key]: value } : item
        )
      );
    },
    []
  );

  const moveBomItem = useCallback(
    (tempId: string, direction: "up" | "down") => {
      setBomItems((prev) => {
        const idx = prev.findIndex((i) => i.tempId === tempId);
        if (idx === -1) return prev;
        if (direction === "up" && idx === 0) return prev;
        if (direction === "down" && idx === prev.length - 1) return prev;

        const next = [...prev];
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= next.length) return prev;
        const tempA = next[idx] as BOMItem;
        const tempB = next[swapIdx] as BOMItem;
        next[idx] = tempB;
        next[swapIdx] = tempA;
        // Fix sequences
        return next.map((item, i) => ({ ...item, sequence: i + 1 }));
      });
    },
    []
  );

  const handleMaterialSelect = useCallback(
    (tempId: string, materialId: string) => {
      const selected = bomMaterialOptions.find((o) => o.value === materialId);
      if (!selected) {
        updateBomItem(tempId, "materialId", materialId);
        return;
      }
      const labelParts = selected.label.split(" - ");
      setBomItems((prev) =>
        prev.map((item) =>
          item.tempId === tempId
            ? {
                ...item,
                materialId,
                materialCode: labelParts[0] ?? "",
                materialName: labelParts.slice(1).join(" - ") ?? selected.label,
                materialType: selected.subtitle ?? "",
              }
            : item
        )
      );
    },
    [bomMaterialOptions, updateBomItem]
  );

  /* ── Operation Handlers ── */
  const addOperation = useCallback(() => {
    const newSeq = operations.length > 0
      ? Math.max(...operations.map((o) => o.sequence)) + 1
      : 1;
    setOperations((prev) => [
      ...prev,
      {
        tempId: `op_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        operationCode: "",
        sequence: newSeq,
        isMandatory: true,
        notes: "",
      },
    ]);
  }, [operations]);

  const removeOperation = useCallback((tempId: string) => {
    setOperations((prev) => prev.filter((o) => o.tempId !== tempId));
  }, []);

  const updateOperation = useCallback(
    (tempId: string, key: keyof OperationItem, value: unknown) => {
      setOperations((prev) =>
        prev.map((op) =>
          op.tempId === tempId ? { ...op, [key]: value } : op
        )
      );
    },
    []
  );

  const moveOperation = useCallback(
    (tempId: string, direction: "up" | "down") => {
      setOperations((prev) => {
        const idx = prev.findIndex((o) => o.tempId === tempId);
        if (idx === -1) return prev;
        if (direction === "up" && idx === 0) return prev;
        if (direction === "down" && idx === prev.length - 1) return prev;

        const next = [...prev];
        const swapIdx = direction === "up" ? idx - 1 : idx + 1;
        if (swapIdx < 0 || swapIdx >= next.length) return prev;
        const tempA = next[idx] as OperationItem;
        const tempB = next[swapIdx] as OperationItem;
        next[idx] = tempB;
        next[swapIdx] = tempA;
        return next.map((op, i) => ({ ...op, sequence: i + 1 }));
      });
    },
    []
  );

  /* ── Output Item Handlers ── */
  const addOutputItem = useCallback(() => {
    const newSeq = outputItems.length > 0
      ? Math.max(...outputItems.map((o) => o.sequence)) + 1
      : 1;
    setOutputItems((prev) => [
      ...prev,
      {
        tempId: `out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        materialId: "",
        materialCode: "",
        materialName: "",
        materialType: "",
        quantityPerUnit: 1,
        unit: "m2",
        sequence: newSeq,
        notes: "",
      },
    ]);
  }, [outputItems]);

  const removeOutputItem = useCallback((tempId: string) => {
    setOutputItems((prev) => prev.filter((o) => o.tempId !== tempId));
  }, []);

  const updateOutputItem = useCallback(
    (tempId: string, key: keyof OutputItem, value: unknown) => {
      setOutputItems((prev) =>
        prev.map((o) =>
          o.tempId === tempId ? { ...o, [key]: value } : o
        )
      );
    },
    []
  );

  const handleOutputMaterialSelect = useCallback(
    (tempId: string, materialId: string) => {
      const selected = outputMaterialOptions.find((o) => o.value === materialId);
      if (!selected) {
        updateOutputItem(tempId, "materialId", materialId);
        return;
      }
      const labelParts = selected.label.split(" - ");
      setOutputItems((prev) =>
        prev.map((item) =>
          item.tempId === tempId
            ? {
                ...item,
                materialId,
                materialCode: labelParts[0] ?? "",
                materialName: labelParts.slice(1).join(" - ") ?? selected.label,
                materialType: selected.subtitle ?? "",
              }
            : item
        )
      );
    },
    [outputMaterialOptions, updateOutputItem]
  );

  /* ── Fire Item Handlers ── */
  const FIRE_TYPE_OPTIONS = [
    { value: "cutting", labelKey: "recipes.fireTypes.cutting" },
    { value: "temperLoss", labelKey: "recipes.fireTypes.temperLoss" },
    { value: "breakage", labelKey: "recipes.fireTypes.breakage" },
    { value: "operatorLoss", labelKey: "recipes.fireTypes.operatorLoss" },
    { value: "scrap", labelKey: "recipes.fireTypes.scrap" },
    { value: "custom", labelKey: "recipes.fireTypes.custom" },
  ] as const;

  // Fire type → unit mapping (auto, except custom)
  const FIRE_UNIT_MAP: Record<string, string> = {
    cutting: "%",
    temperLoss: "%",
    breakage: "%",
    operatorLoss: "%",
    scrap: "%",
    custom: "",
  };

  const addFireItem = useCallback(() => {
    setFireItems((prev) => [
      ...prev,
      {
        tempId: `fire_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        fireType: "cutting",
        rate: 0,
        unit: "%",
        notes: "",
      },
    ]);
  }, []);

  const removeFireItem = useCallback((tempId: string) => {
    setFireItems((prev) => prev.filter((f) => f.tempId !== tempId));
  }, []);

  const updateFireItem = useCallback(
    (tempId: string, key: keyof FireItem, value: unknown) => {
      setFireItems((prev) =>
        prev.map((f) => {
          if (f.tempId !== tempId) return f;
          const updated = { ...f, [key]: value };
          // Auto-set unit based on fire type
          if (key === "fireType") {
            const ft = value as string;
            updated.unit = FIRE_UNIT_MAP[ft] ?? "";
          }
          // Custom type allows manual unit entry
          if (key === "unit" && f.fireType !== "custom") {
            return f; // Don't allow changing unit for non-custom types
          }
          return updated;
        })
      );
    },
    []
  );

  /* ── Rodaj / Trim Handlers ── */
  const updateRodaj = useCallback(
    (key: keyof RodajSettings, value: boolean | number) => {
      setRodaj((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateTrim = useCallback(
    (key: keyof TrimSettings, value: boolean | number) => {
      setTrim((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const updateProductionRules = useCallback(
    (key: keyof ProductionRules, value: boolean | number) => {
      setProductionRules((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  /* ── Validation (UI-only display check) ── */
  const runValidation = useCallback((): ValidationResult[] => {
    const results: ValidationResult[] = [];

    if (!form.recipeCode.trim()) {
      results.push({
        type: "error",
        message: t("recipes.validation.recipeCodeRequired") ?? "Recipe code is required",
        field: "recipeCode",
      });
    }
    if (!form.name.trim()) {
      results.push({
        type: "error",
        message: t("recipes.validation.nameRequired") ?? "Recipe name is required",
        field: "name",
      });
    }
    if (bomItems.length === 0) {
      results.push({
        type: "warning",
        message: t("recipes.validation.noMaterials") ?? "No materials defined in BOM",
      });
    }
    // Check for incomplete BOM items
    const incompleteItems = bomItems.filter((i) => !i.materialId);
    if (incompleteItems.length > 0) {
      results.push({
        type: "warning",
        message: `${incompleteItems.length} BOM item(s) have no material selected`,
      });
    }

    return results;
  }, [form, bomItems, t]);

  /* ── Submit ── */
  const handleSubmit = useCallback(async () => {
    // Run validation
    const validation = runValidation();
    setValidationResults(validation);
    const hasErrors = validation.some((v) => v.type === "error");
    if (hasErrors) {
      setError(t("recipes.validation.fixErrors") ?? "Please fix the errors before saving");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Run engine one final time for the snapshot
      let engineSnapshot: RecipeEngineOutput | null = null;
      if (factoryConfig) {
        const finalInput: RecipeEngineInput = {
          netWidthMm: simNetWidthMm,
          netHeightMm: simNetHeightMm,
          quantity: simQuantity,
          rodaj: {
            useDefaults: rodaj.useDefaults,
            top: rodaj.top,
            bottom: rodaj.bottom,
            left: rodaj.left,
            right: rodaj.right,
          },
          trim: {
            useDefaults: trim.useDefaults,
            top: trim.top,
            bottom: trim.bottom,
            left: trim.left,
            right: trim.right,
          },
          bomItems: bomItems
            .filter((b) => b.materialId && b.consumptionBasis)
            .map((b) => ({
              materialId: b.materialId,
              materialCode: b.materialCode,
              materialName: b.materialName,
              consumptionBasis: b.consumptionBasis as "area" | "perimeter" | "piece" | "fixed" | "duration",
              quantityPerUnit: b.quantityPerUnit,
              unit: b.unit,
              wastePercentage: b.wastePercentage ?? 0,
            })),
          fireItems: [
            ...fireItems.map((f) => ({
              fireType: f.fireType,
              fireTypeLabel: t(`recipes.fireTypes.${f.fireType}` as any) ?? f.fireType,
              rate: f.rate,
              unit: f.unit,
            })),
            ...(productionFirePercent > 0
              ? [{ fireType: "operatorLoss", fireTypeLabel: "Üretim Firesi", rate: productionFirePercent, unit: "%" }]
              : []),
          ],
          outputItems: outputItems
            .filter((o) => o.materialId)
            .map((o) => ({
              materialId: o.materialId,
              productCode: o.materialCode,
              productName: o.materialName,
              quantityPerUnit: o.quantityPerUnit,
              unit: o.unit,
            })),
          factoryConfiguration: factoryConfig,
        };
        engineSnapshot = RecipeEngine.calculate(finalInput);
      }

      // Build payload with all sub-entities
      const payload: any = {
        recipeCode: form.recipeCode.trim(),
        name: form.name.trim(),
        productType: form.productType || undefined,
        notes: form.notes.trim() || undefined,
        isActive,
        // BOM items
        recipeItems: bomItems.map((item) => ({
          materialId: item.materialId,
          consumptionBasis: item.consumptionBasis,
          quantityPerUnit: item.quantityPerUnit,
          unit: item.unit,
          sequence: item.sequence,
          wastePercentage: item.wastePercentage,
        })),
        // Operations
        recipeOperations: operations.map((op) => ({
          operationCode: op.operationCode,
          sequence: op.sequence,
          isMandatory: op.isMandatory,
          notes: op.notes,
        })),
        // Outputs (produced products)
        recipeOutputs: outputItems.map((o) => ({
          materialId: o.materialId,
          materialCode: o.materialCode,
          materialName: o.materialName,
          materialType: o.materialType,
          quantityPerUnit: o.quantityPerUnit,
          unit: o.unit,
          sequence: o.sequence,
          notes: o.notes,
        })),
        // Fires
        recipeFires: fireItems.map((f) => ({
          fireType: f.fireType,
          rate: f.rate,
          unit: f.unit,
          notes: f.notes,
        })),
        productionFirePercent,
        // Production rules
        productionRules: {
          temperRequired: productionRules.temperRequired,
          lowEOrientationRequired: productionRules.lowEOrientationRequired,
          rodajRequired: productionRules.rodajRequired,
          drillingAllowed: productionRules.drillingAllowed,
          cncRequired: productionRules.cncRequired,
          channelAllowed: productionRules.channelAllowed,
          minMeasureMm: productionRules.minMeasureMm,
          maxMeasureMm: productionRules.maxMeasureMm,
        },
        // Rodaj settings
        rodajSettings: {
          enabled: rodaj.enabled,
          useDefaults: rodaj.useDefaults,
          applyAllEdges: rodaj.applyAllEdges,
          top: rodaj.top,
          bottom: rodaj.bottom,
          left: rodaj.left,
          right: rodaj.right,
        },
        // Trim settings
        trimSettings: {
          enabled: trim.enabled,
          useDefaults: trim.useDefaults,
          applyAllEdges: trim.applyAllEdges,
          top: trim.top,
          bottom: trim.bottom,
          left: trim.left,
          right: trim.right,
        },
        // Engine snapshot (server will re-validate)
        engineSnapshot: engineSnapshot
          ? {
              efficiency: engineSnapshot.efficiency,
              totalFireRate: engineSnapshot.totalFireRate,
              dimensions: engineSnapshot.dimensions,
              totals: engineSnapshot.totals,
              appliedSettings: engineSnapshot.appliedSettings,
              consumedMaterials: engineSnapshot.consumedMaterials,
              fireLosses: engineSnapshot.fireLosses,
              producedProducts: engineSnapshot.producedProducts,
            }
          : undefined,
      };

      if (recipeId) {
        // Edit mode — save full recipe
        payload.id = recipeId;
        await saveRecipe(recipeId, payload);
        router.push(`/recipes/${recipeId}`);
      } else {
        // Create mode
        payload.id = generateULID();
        const result = await saveRecipe(null, payload);
        router.push(`/recipes/${result?.id || payload.id}`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("recipes.error.saveFailed");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [form, recipeId, router, t, runValidation, bomItems, operations, outputItems, fireItems, rodaj, trim, isActive, simNetWidthMm, simNetHeightMm, simQuantity, factoryConfig, productionRules, productionFirePercent]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  /* ── Sort items by sequence ── */
  const sortedBomItems = useMemo(
    () => [...bomItems].sort((a, b) => a.sequence - b.sequence),
    [bomItems]
  );
  const sortedOperations = useMemo(
    () => [...operations].sort((a, b) => a.sequence - b.sequence),
    [operations]
  );

  /* ── Loading State ── */
  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        {/* Skeleton Header */}
        <div className="flex flex-col gap-1">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        {/* Skeleton Cards */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-4 w-32" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isEditMode = !!recipeId;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* ═══════════════════════════════════════════════════════════════
          SECTION 1: HEADER
          ═══════════════════════════════════════════════════════════════ */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              {isEditMode
                ? t("recipes.editRecipe") ?? "Edit Recipe"
                : t("recipes.newRecipe") ?? "New Recipe"}
            </h1>
            {isEditMode && (
              <Badge variant={isActive ? "success" : "secondary"}>
                {isActive ? t("recipes.status.active") : t("recipes.status.archived")}
              </Badge>
            )}
            {isEditMode && recipeVersion !== undefined && (
              <Badge variant="info">v{recipeVersion}</Badge>
            )}
          </div>
          {isEditMode ? (
            <p className="text-sm text-text-muted">
              {form.recipeCode && (
                <span className="font-mono text-xs">{form.recipeCode}</span>
              )}
              {form.recipeCode && form.name && <span> — </span>}
              {form.name}
            </p>
          ) : (
            <p className="text-sm text-text-muted">
              {t("recipes.newRecipeDesc") ?? "Create a new recipe"}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.back()}
            disabled={submitting}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            {submitting
              ? t("common.saving") ?? "Saving..."
              : t("common.save")}
          </Button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 2: GENERAL INFORMATION
          ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-text-muted" />
            <CardTitle>{t("recipes.generalInfo") ?? "General Information"}</CardTitle>
          </div>
          <CardDescription>
            {t("recipes.generalInfoDesc") ?? "Basic recipe details"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-6" onKeyDown={handleKeyDown}>
            {/* Row: Code + Name */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  {t("recipes.recipeCode") ?? "Recipe Code"}
                  <span className="ml-0.5 text-red-500">*</span>
                </label>
                <Input
                  value={form.recipeCode}
                  onChange={(e) => update("recipeCode", e.target.value)}
                  placeholder="REC-001"
                  disabled={submitting}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  {t("recipes.recipeName") ?? "Recipe Name"}
                  <span className="ml-0.5 text-red-500">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="12mm Düz Temperli Cam"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Row: Product Type + Notes */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  {t("recipes.productTypeLabel") ?? "Product Type"}
                </label>
                <Select
                  value={form.productType}
                  onValueChange={(v) => update("productType", v)}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("recipes.selectProductType") ?? "Select product type"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPE_OPTIONS.map((pt) => (
                      <SelectItem key={pt.value} value={pt.value}>
                        {t(pt.labelKey) ?? pt.value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  {t("recipes.notes") ?? "Notes"}
                </label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => update("notes", e.target.value)}
                  placeholder={t("recipes.notesPlaceholder") ?? "Optional notes..."}
                  disabled={submitting}
                  rows={3}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 3: CONSUMED MATERIALS (BOM)
          ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-text-muted" />
              <CardTitle>{t("recipes.consumedMaterials") ?? "Consumed Materials"}</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={addBomItem}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("common.add")}
            </Button>
          </div>
          <CardDescription>
            {t("recipes.bomDesc") ?? "Materials, quantities, and units"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {bomItems.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-8 w-8" />}
              title={t("recipes.noMaterials") ?? "No materials"}
              description={t("recipes.noMaterialsDesc") ?? "Add materials to the recipe"}
              action={{ label: t("common.add"), onClick: addBomItem }}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {/* Header Row */}
              <div className="hidden grid-cols-12 gap-3 px-2 text-xs font-medium uppercase tracking-wider text-text-muted lg:grid">
                <div className="col-span-1">{t("common.order") ?? "#"}</div>
                <div className="col-span-3">{t("recipes.material") ?? "Material"}</div>
                <div className="col-span-2">{t("recipes.consumptionBasis") ?? "Basis"}</div>
                <div className="col-span-2">{t("recipes.quantity") ?? "Qty"}</div>
                <div className="col-span-1">{t("recipes.unit") ?? "Unit"}</div>
                <div className="col-span-1">{t("recipes.waste") ?? "Waste %"}</div>
                <div className="col-span-2">{t("common.actions") ?? "Actions"}</div>
              </div>

              {sortedBomItems.map((item) => (
                <div
                  key={item.tempId}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-glass-border bg-glass-surface p-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-center"
                >
                  {/* Sequence */}
                  <div className="col-span-1 flex items-center gap-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-glass-elevated text-xs font-medium text-text-muted">
                      {item.sequence}
                    </span>
                  </div>

                  {/* Material Selector */}
                  <div className="col-span-3">
                    <Combobox
                      options={bomMaterialOptions}
                      value={item.materialId}
                      onChange={(val) => handleMaterialSelect(item.tempId, val)}
                      placeholder={t("recipes.selectMaterial") ?? "Stok kartı seç..."}
                      searchPlaceholder={t("recipes.searchMaterial") ?? "Stok kartı ara..."}
                      loading={materialsLoading}
                      error={!item.materialId && item.materialId !== undefined}
                    />",
                  </div>

                  {/* Consumption Basis */}
                  <div className="col-span-2">
                    <Select
                      value={item.consumptionBasis}
                      onValueChange={(val) =>
                        updateBomItem(item.tempId, "consumptionBasis", val)
                      }
                      disabled={submitting}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={t("recipes.selectBasis") ?? "Seçin..."} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="area" className="text-xs">
                          m² ({t("recipes.basis.area") ?? "Alan"})
                        </SelectItem>
                        <SelectItem value="perimeter" className="text-xs">
                          {t("recipes.basis.perimeter") ?? "Çevre"}
                        </SelectItem>
                        <SelectItem value="piece" className="text-xs">
                          {t("recipes.basis.piece") ?? "Adet"}
                        </SelectItem>
                        <SelectItem value="fixed" className="text-xs">
                          {t("recipes.basis.fixed") ?? "Sabit"}
                        </SelectItem>
                        <SelectItem value="duration" className="text-xs">
                          {t("recipes.basis.duration") ?? "Süre"}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity */}
                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={item.quantityPerUnit}
                      onChange={(e) =>
                        updateBomItem(
                          item.tempId,
                          "quantityPerUnit",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="1"
                      disabled={submitting}
                      className="h-8 text-xs"
                      min={0}
                      step={0.01}
                    />
                  </div>

                  {/* Unit */}
                  <div className="col-span-1">
                    <Select
                      value={item.unit}
                      onValueChange={(v) =>
                        updateBomItem(item.tempId, "unit", v)
                      }
                      disabled={submitting}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={t("recipes.unit") ?? "Unit"} />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {t(u.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Waste Percentage */}
                  <div className="col-span-1">
                    <Input
                      type="number"
                      value={item.wastePercentage ?? ""}
                      onChange={(e) =>
                        updateBomItem(
                          item.tempId,
                          "wastePercentage",
                          e.target.value ? parseFloat(e.target.value) : null
                        )
                      }
                      placeholder="--"
                      disabled={submitting}
                      className="h-8 text-xs"
                      min={0}
                      max={100}
                      step={0.1}
                    />
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={t("common.moveUp") ?? "Move up"}
                      onClick={() => moveBomItem(item.tempId, "up")}
                      disabled={item.sequence <= 1}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={t("common.moveDown") ?? "Move down"}
                      onClick={() => moveBomItem(item.tempId, "down")}
                      disabled={item.sequence >= bomItems.length}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      title={t("common.remove") ?? "Remove"}
                      onClick={() => removeBomItem(item.tempId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: PRODUCED PRODUCTS
          ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-green-600" />
              <CardTitle>{t("recipes.producedProducts") ?? "Produced Products"}</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={addOutputItem}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("common.add")}
            </Button>
          </div>
          <CardDescription>
            {t("recipes.producedProductsDesc") ?? "Products produced by this recipe"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {outputItems.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-8 w-8" />}
              title={t("recipes.noOutputs") ?? "No products"}
              description={t("recipes.noOutputsDesc") ?? "Add products produced by this recipe"}
              action={{ label: t("common.add"), onClick: addOutputItem }}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="hidden grid-cols-12 gap-3 px-2 text-xs font-medium uppercase tracking-wider text-text-muted lg:grid">
                <div className="col-span-1">{t("common.order") ?? "#"}</div>
                <div className="col-span-4">{t("recipes.product") ?? "Product"}</div>
                <div className="col-span-2">{t("recipes.quantity") ?? "Qty"}</div>
                <div className="col-span-1">{t("recipes.unit") ?? "Unit"}</div>
                <div className="col-span-2">{t("recipes.notes") ?? "Notes"}</div>
                <div className="col-span-2">{t("common.actions") ?? "Actions"}</div>
              </div>

              {outputItems.map((item) => (
                <div
                  key={item.tempId}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-glass-border bg-glass-surface p-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-center"
                >
                  <div className="col-span-1 flex items-center gap-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-glass-elevated text-xs font-medium text-text-muted">
                      {item.sequence}
                    </span>
                  </div>

                  {/* Stock Card Selector */}
                  <div className="col-span-4">
                    <Combobox
                      options={outputMaterialOptions}
                      value={item.materialId}
                      onChange={(val) => handleOutputMaterialSelect(item.tempId, val)}
                      placeholder={t("recipes.selectProduct") ?? "Mamul/Yarı Mamul seç..."}
                      searchPlaceholder={t("recipes.searchMaterial") ?? "Stok kartı ara..."}
                      loading={materialsLoading}
                      error={!item.materialId && item.materialId !== undefined}
                    />
                  </div>

                  <div className="col-span-2">
                    <Input
                      type="number"
                      value={item.quantityPerUnit}
                      onChange={(e) =>
                        updateOutputItem(
                          item.tempId,
                          "quantityPerUnit",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      placeholder="1"
                      disabled={submitting}
                      className="h-8 text-xs"
                      min={0}
                      step={0.01}
                    />
                  </div>

                  <div className="col-span-1">
                    <Select
                      value={item.unit}
                      onValueChange={(v) => updateOutputItem(item.tempId, "unit", v)}
                      disabled={submitting}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={t("recipes.unit") ?? "Unit"} />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>
                            {t(u.labelKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="col-span-2">
                    <Input
                      value={item.notes}
                      onChange={(e) =>
                        updateOutputItem(item.tempId, "notes", e.target.value)
                      }
                      placeholder={t("recipes.notes") ?? "Notes..."}
                      disabled={submitting}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="col-span-2 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      title={t("common.remove") ?? "Remove"}
                      onClick={() => removeOutputItem(item.tempId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4: PRODUCTION RULES (Kart 4)
          ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-lg">⚙️</span>
            <CardTitle>{t("recipes.productionRules.title") ?? "Üretim Kuralları"}</CardTitle>
          </div>
          <CardDescription>
            {t("recipes.productionRules.desc") ?? "Reçete için üretim kısıtları ve zorunluluklar"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Left Column: Toggles */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <Switch
                  checked={productionRules.temperRequired}
                  onCheckedChange={(v) => updateProductionRules("temperRequired", v)}
                  disabled={submitting}
                />
                <span className="text-sm font-medium">
                  {t("recipes.productionRules.temperRequired") ?? "Temper Zorunlu"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={productionRules.lowEOrientationRequired}
                  onCheckedChange={(v) => updateProductionRules("lowEOrientationRequired", v)}
                  disabled={submitting}
                />
                <span className="text-sm font-medium">
                  {t("recipes.productionRules.lowEOrientation") ?? "Low-E Yönü Önemli"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={productionRules.rodajRequired}
                  onCheckedChange={(v) => updateProductionRules("rodajRequired", v)}
                  disabled={submitting}
                />
                <span className="text-sm font-medium">
                  {t("recipes.productionRules.rodajRequired") ?? "Rodaj Gerekli"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={productionRules.drillingAllowed}
                  onCheckedChange={(v) => updateProductionRules("drillingAllowed", v)}
                  disabled={submitting}
                />
                <span className="text-sm font-medium">
                  {t("recipes.productionRules.drillingAllowed") ?? "Delik Açılabilir"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={productionRules.cncRequired}
                  onCheckedChange={(v) => updateProductionRules("cncRequired", v)}
                  disabled={submitting}
                />
                <span className="text-sm font-medium">
                  {t("recipes.productionRules.cncRequired") ?? "CNC İşleme Gerekli"}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Switch
                  checked={productionRules.channelAllowed}
                  onCheckedChange={(v) => updateProductionRules("channelAllowed", v)}
                  disabled={submitting}
                />
                <span className="text-sm font-medium">
                  {t("recipes.productionRules.channelAllowed") ?? "Kanal Açılabilir"}
                </span>
              </div>
            </div>

            {/* Right Column: Min/Max Measures */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  {t("recipes.productionRules.minMeasure") ?? "Minimum Ölçü (mm)"}
                </label>
                <Input
                  type="number"
                  value={productionRules.minMeasureMm || ""}
                  onChange={(e) =>
                    updateProductionRules("minMeasureMm", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  disabled={submitting}
                  className="h-9 text-sm"
                  min={0}
                  step={1}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">
                  {t("recipes.productionRules.maxMeasure") ?? "Maksimum Ölçü (mm)"}
                </label>
                <Input
                  type="number"
                  value={productionRules.maxMeasureMm || ""}
                  onChange={(e) =>
                    updateProductionRules("maxMeasureMm", parseFloat(e.target.value) || 0)
                  }
                  placeholder="0"
                  disabled={submitting}
                  className="h-9 text-sm"
                  min={0}
                  step={1}
                />
              </div>
              <p className="text-xs text-text-muted italic">
                {t("recipes.productionRules.measureHint") ?? "0 = sınırsız"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 4.5: PRODUCTION SUMMARY
          ═══════════════════════════════════════════════════════════════ */}
      <ProductionSummaryCard
        result={engineResult}
        factoryConfig={factoryConfig}
        showDetails={showEngineDetails}
        onToggleDetails={() => setShowEngineDetails((prev) => !prev)}
        simNetWidthMm={simNetWidthMm}
        simNetHeightMm={simNetHeightMm}
        simQuantity={simQuantity}
        onWidthChange={setSimNetWidthMm}
        onHeightChange={setSimNetHeightMm}
        onQuantityChange={setSimQuantity}
        submitting={submitting}
      />

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 5: FIRE AYARLARI (Kart 5) — Rodaj + Trim + Üretim Firesi
          ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <CardTitle>{t("recipes.fireSettings") ?? "Fire Ayarları"}</CardTitle>
          </div>
          <CardDescription>
            {t("recipes.fireSettingsDesc") ?? "Rodaj, Trim ve Üretim fire oranları — fire MİKTARI değil, fire KURALI tanımlanır"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col gap-6">

            {/* ─── RODAJ FİRESİ ─── */}
            <div className="rounded-lg border border-red-200 bg-red-50/30 p-4 dark:border-red-800 dark:bg-red-950/20">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-200 text-xs font-bold text-red-800 dark:bg-red-800 dark:text-red-200">R</span>
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
                  {t("recipes.rodaj.fireTitle") ?? "🔥 Rodaj Firesi"}
                </h3>
                <span className="rounded bg-red-200 px-1.5 py-0.5 text-[10px] font-semibold text-red-800 dark:bg-red-800 dark:text-red-200">FIRE</span>
              </div>
              <div className="ml-2 flex flex-col gap-3">
                {/* Source selector */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm text-red-900 dark:text-red-200">
                    <input
                      type="radio"
                      name="rodajSource"
                      checked={rodaj.useDefaults}
                      onChange={() => updateRodaj("useDefaults", true)}
                      disabled={submitting}
                      className="h-3.5 w-3.5 accent-red-600"
                    />
                    <span className="font-medium">☑ {t("recipes.rodaj.useDefaults") ?? "Fabrika ayarını kullan"}</span>
                    {rodaj.useDefaults && factoryConfig && (
                      <span className="text-xs text-red-800/70">
                        ({t("recipes.currentSetting") ?? "Şu an"}: {factoryConfig.grindingConfiguration?.leftMm ?? 1}mm/kenar)
                      </span>
                    )}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-red-900 dark:text-red-200">
                    <input
                      type="radio"
                      name="rodajSource"
                      checked={!rodaj.useDefaults}
                      onChange={() => updateRodaj("useDefaults", false)}
                      disabled={submitting}
                      className="h-3.5 w-3.5 accent-red-600"
                    />
                    <span>☐ {t("recipes.rodaj.useCustom") ?? "Bu reçete için özel değer kullan"}</span>
                  </label>
                </div>

                {/* Custom values */}
                {!rodaj.useDefaults && (
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2 text-sm text-red-900 dark:text-red-200">
                      <input
                        type="checkbox"
                        checked={rodaj.applyAllEdges}
                        onChange={(e) => updateRodaj("applyAllEdges", e.target.checked)}
                        disabled={submitting}
                        className="h-3.5 w-3.5 rounded accent-red-600"
                      />
                      {t("recipes.rodaj.applyAllEdges") ?? "Tüm kenarlara uygula"}
                    </label>

                    {rodaj.applyAllEdges ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-red-800/80 w-16">
                          {t("common.all") ?? "Tümü"}:
                        </span>
                        <Input
                          type="number"
                          value={rodaj.top}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            updateRodaj("top", v);
                            updateRodaj("bottom", v);
                            updateRodaj("left", v);
                            updateRodaj("right", v);
                          }}
                          className="h-8 w-20 text-xs"
                          min={0}
                          step={0.5}
                          disabled={submitting}
                        />
                        <span className="text-xs font-medium text-red-800/80">{t("recipes.rodaj.mm") ?? "mm"}</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: "top" as const, label: t("recipes.rodaj.top") ?? "Üst" },
                          { key: "bottom" as const, label: t("recipes.rodaj.bottom") ?? "Alt" },
                          { key: "left" as const, label: t("recipes.rodaj.left") ?? "Sol" },
                          { key: "right" as const, label: t("recipes.rodaj.right") ?? "Sağ" },
                        ].map((edge) => (
                          <div key={edge.key} className="flex items-center gap-2">
                            <span className="text-xs font-medium text-red-800/80 w-8">{edge.label}:</span>
                            <Input
                              type="number"
                              value={rodaj[edge.key]}
                              onChange={(e) =>
                                updateRodaj(edge.key, parseFloat(e.target.value) || 0)
                              }
                              className="h-8 w-20 text-xs"
                              min={0}
                              step={0.5}
                              disabled={submitting}
                            />
                            <span className="text-xs font-medium text-red-800/80">{t("recipes.rodaj.mm") ?? "mm"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ─── TRİM FİRESİ ─── */}
            <div className="rounded-lg border border-orange-200 bg-orange-50/30 p-4 dark:border-orange-800 dark:bg-orange-950/20">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-200 text-xs font-bold text-orange-800 dark:bg-orange-800 dark:text-orange-200">T</span>
                <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-200">
                  {t("recipes.trim.fireTitle") ?? "🔥 Trim Firesi"}
                </h3>
                <span className="rounded bg-orange-200 px-1.5 py-0.5 text-[10px] font-semibold text-orange-800 dark:bg-orange-800 dark:text-orange-200">FIRE</span>
              </div>
              <div className="ml-2 flex flex-col gap-3">
                {/* Source selector */}
                <div className="flex flex-col gap-2">
                  <label className="flex items-center gap-2 text-sm text-orange-900 dark:text-orange-200">
                    <input
                      type="radio"
                      name="trimSource"
                      checked={trim.useDefaults}
                      onChange={() => updateTrim("useDefaults", true)}
                      disabled={submitting}
                      className="h-3.5 w-3.5 accent-orange-600"
                    />
                    <span className="font-medium">☑ {t("recipes.trim.useDefaults") ?? "Fabrika ayarını kullan"}</span>
                    {trim.useDefaults && factoryConfig && (
                      <span className="text-xs text-orange-800/70">
                        ({t("recipes.currentSetting") ?? "Şu an"}: {factoryConfig.trimConfiguration?.leftMm ?? 20}mm)
                      </span>
                    )}
                  </label>
                  <label className="flex items-center gap-2 text-sm text-orange-900 dark:text-orange-200">
                    <input
                      type="radio"
                      name="trimSource"
                      checked={!trim.useDefaults}
                      onChange={() => updateTrim("useDefaults", false)}
                      disabled={submitting}
                      className="h-3.5 w-3.5 accent-orange-600"
                    />
                    <span>☐ {t("recipes.trim.useCustom") ?? "Bu reçete için özel değer kullan"}</span>
                  </label>
                </div>

                {/* Custom values */}
                {!trim.useDefaults && (
                  <div className="flex flex-col gap-3">
                    <label className="flex items-center gap-2 text-sm text-orange-900 dark:text-orange-200">
                      <input
                        type="checkbox"
                        checked={trim.applyAllEdges}
                        onChange={(e) => updateTrim("applyAllEdges", e.target.checked)}
                        disabled={submitting}
                        className="h-3.5 w-3.5 rounded accent-orange-600"
                      />
                      {t("recipes.trim.applyAllEdges") ?? "Tüm kenarlara uygula"}
                    </label>

                    {trim.applyAllEdges ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-orange-800/80 w-16">
                          {t("common.all") ?? "Tümü"}:
                        </span>
                        <Input
                          type="number"
                          value={trim.top}
                          onChange={(e) => {
                            const v = parseFloat(e.target.value) || 0;
                            updateTrim("top", v);
                            updateTrim("bottom", v);
                            updateTrim("left", v);
                            updateTrim("right", v);
                          }}
                          className="h-8 w-20 text-xs"
                          min={0}
                          step={0.5}
                          disabled={submitting}
                        />
                        <span className="text-xs font-medium text-orange-800/80">{t("recipes.trim.mm") ?? "mm"}</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {[
                          { key: "top" as const, label: t("recipes.trim.top") ?? "Üst" },
                          { key: "bottom" as const, label: t("recipes.trim.bottom") ?? "Alt" },
                          { key: "left" as const, label: t("recipes.trim.left") ?? "Sol" },
                          { key: "right" as const, label: t("recipes.trim.right") ?? "Sağ" },
                        ].map((edge) => (
                          <div key={edge.key} className="flex items-center gap-2">
                            <span className="text-xs font-medium text-orange-800/80 w-8">{edge.label}:</span>
                            <Input
                              type="number"
                              value={trim[edge.key]}
                              onChange={(e) =>
                                updateTrim(edge.key, parseFloat(e.target.value) || 0)
                              }
                              className="h-8 w-20 text-xs"
                              min={0}
                              step={0.5}
                              disabled={submitting}
                            />
                            <span className="text-xs font-medium text-orange-800/80">{t("recipes.trim.mm") ?? "mm"}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* ─── ÜRETİM FİRESİ ─── */}
            <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200 text-xs font-bold text-amber-800 dark:bg-amber-800 dark:text-amber-200">%</span>
                <h3 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                  {t("recipes.productionFire") ?? "🔥 Üretim Firesi"}
                </h3>
                <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-800 dark:text-amber-200">FIRE</span>
              </div>
              <div className="ml-2 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-amber-800/80 dark:text-amber-300">
                      {t("recipes.productionFireRate") ?? "Fire Oranı"}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        value={productionFirePercent}
                        onChange={(e) => setProductionFirePercent(parseFloat(e.target.value) || 0)}
                        className="h-8 w-24 text-xs"
                        min={0}
                        max={100}
                        step={0.5}
                        disabled={submitting}
                      />
                      <span className="text-xs font-medium text-text-muted">%</span>
                    </div>
                  </div>
                  <p className="max-w-xs text-[10px] text-text-muted italic">
                    {t("recipes.productionFireHint") ?? "Kırılma, hata, fire payı — elle girilir. Gerçek fire miktarı üretim anında ölçülere göre hesaplanır."}
                  </p>
                </div>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 6: OPERATIONS
          ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-text-muted" />
              <CardTitle>{t("recipes.operations") ?? "Operations"}</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={addOperation}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("common.add")}
            </Button>
          </div>
          <CardDescription>
            {t("recipes.operationsDesc") ?? "Execution order with mandatory flags"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {operations.length === 0 ? (
            <EmptyState
              icon={<ListChecks className="h-8 w-8" />}
              title={t("recipes.noOperations") ?? "No operations"}
              description={t("recipes.noOperationsDesc") ?? "Add operations to the recipe"}
              action={{ label: t("common.add"), onClick: addOperation }}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {sortedOperations.map((op) => (
                <div
                  key={op.tempId}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-glass-border bg-glass-surface p-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-center"
                >
                  {/* Sequence */}
                  <div className="col-span-1 flex items-center gap-1">
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-glass-elevated text-xs font-medium text-text-muted">
                      {op.sequence}
                    </span>
                  </div>

                  {/* Operation Code (Station) */}
                  <div className="col-span-3">
                    <Combobox
                      options={stationOptions}
                      value={op.operationCode}
                      onChange={(val) =>
                        updateOperation(op.tempId, "operationCode", val)
                      }
                      placeholder={t("recipes.selectStation") ?? "İstasyon seç..."}
                      searchPlaceholder={t("recipes.searchStation") ?? "İstasyon ara..."}
                      loading={stationsLoading}
                    />
                  </div>

                  {/* Mandatory Switch */}
                  <div className="col-span-2 flex items-center gap-2">
                    <Switch
                      checked={op.isMandatory}
                      onCheckedChange={(checked) =>
                        updateOperation(op.tempId, "isMandatory", checked)
                      }
                      disabled={submitting}
                    />
                    <span className="text-xs text-text-muted">
                      {op.isMandatory
                        ? (t("recipes.mandatory") ?? "Mandatory")
                        : (t("recipes.optional") ?? "Optional")}
                    </span>
                  </div>

                  {/* Notes */}
                  <div className="col-span-4">
                    <Input
                      value={op.notes}
                      onChange={(e) =>
                        updateOperation(op.tempId, "notes", e.target.value)
                      }
                      placeholder={t("recipes.operationNotes") ?? "Notes..."}
                      disabled={submitting}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={t("common.moveUp") ?? "Move up"}
                      onClick={() => moveOperation(op.tempId, "up")}
                      disabled={op.sequence <= 1}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      title={t("common.moveDown") ?? "Move down"}
                      onClick={() => moveOperation(op.tempId, "down")}
                      disabled={op.sequence >= operations.length}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      title={t("common.remove") ?? "Remove"}
                      onClick={() => removeOperation(op.tempId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 9: VALIDATION PANEL
          ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-text-muted" />
            <CardTitle>{t("recipes.validationPanel") ?? "Validation Panel"}</CardTitle>
          </div>
          <CardDescription>
            {t("recipes.validationPanelDesc") ?? "Validation results from the Engine — displayed for review"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <ValidationPanel results={validationResults} />
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════
          SECTION 10: VERSION SUMMARY
          ═══════════════════════════════════════════════════════════════ */}
      <VersionSummary
        version={recipeVersion}
        createdAt={createdAt}
        updatedAt={updatedAt}
        loading={false}
      />
    </div>
  );
}
