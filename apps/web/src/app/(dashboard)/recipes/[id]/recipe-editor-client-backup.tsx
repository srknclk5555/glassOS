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
  createRecipe,
  updateRecipe,
  getRecipeDetail,
  listRecipeVersions,
} from "@/app/actions/recipes";
import { getMaterialsAction } from "@/app/actions/materials";

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

interface RuleItem {
  tempId: string;
  ruleType: string;
  ruleValue: string;
}

interface ValidationResult {
  type: "error" | "warning" | "info";
  message: string;
  field?: string;
}

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

/* ═══════════════════════════════════════════════════════════════════════════
   RecipeEditorClient — Full Recipe Editor with 7 Sections
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
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [recipeVersion, setRecipeVersion] = useState<number | undefined>(undefined);
  const [createdAt, setCreatedAt] = useState<string | undefined>(undefined);
  const [updatedAt, setUpdatedAt] = useState<string | undefined>(undefined);
  const [isActive, setIsActive] = useState(true);

  /* ── Material Combobox State ── */
  const [materialOptions, setMaterialOptions] = useState<ComboboxOption[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);

  /* ── Fetch Materials (for Combobox) ── */
  const fetchMaterials = useCallback(async (search?: string) => {
    setMaterialsLoading(true);
    try {
      const result = await getMaterialsAction({
        search,
        pageSize: 50,
        sortBy: "materialCode",
        sortOrder: "asc",
      });
      setMaterialOptions(
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

  // Initial material fetch
  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

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

        // Rules
        if (Array.isArray(detail.rules)) {
          setRules(
            detail.rules.map((rule: any, idx: number) => ({
              tempId: `loaded_rule_${idx}`,
              ruleType: rule.ruleType ?? "",
              ruleValue: rule.ruleValue ?? "",
            }))
          );
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
      const selected = materialOptions.find((o) => o.value === materialId);
      if (!selected) {
        updateBomItem(tempId, "materialId", materialId);
        return;
      }
      // Parse materialCode and name from label like "CODE - Name"
      const labelParts = selected.label.split(" - ");
      setBomItems((prev) =>
        prev.map((item) =>
          item.tempId === tempId
            ? {
                ...item,
                materialId,
                materialCode: labelParts[0] ?? "",
                materialName: labelParts.slice(1).join(" - ") ?? selected.label,
              }
            : item
        )
      );
    },
    [materialOptions, updateBomItem]
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

  /* ── Rule Handlers ── */
  const addRule = useCallback(() => {
    setRules((prev) => [
      ...prev,
      {
        tempId: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ruleType: "",
        ruleValue: "",
      },
    ]);
  }, []);

  const removeRule = useCallback((tempId: string) => {
    setRules((prev) => prev.filter((r) => r.tempId !== tempId));
  }, []);

  const updateRule = useCallback(
    (tempId: string, key: keyof RuleItem, value: string) => {
      setRules((prev) =>
        prev.map((rule) =>
          rule.tempId === tempId ? { ...rule, [key]: value } : rule
        )
      );
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
    if (operations.length === 0) {
      results.push({
        type: "warning",
        message: t("recipes.validation.noOperations") ?? "No operations defined",
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
  }, [form, bomItems, operations, t]);

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
      if (recipeId) {
        // Edit mode — update root fields only
        await updateRecipe(recipeId, {
          name: form.name.trim() || undefined,
          recipeCode: form.recipeCode.trim() || undefined,
          productType: form.productType || undefined,
          notes: form.notes.trim() || undefined,
        });
        router.push(`/recipes/${recipeId}`);
      } else {
        // Create mode
        const result = await createRecipe({
          id: generateULID(),
          recipeCode: form.recipeCode.trim(),
          name: form.name.trim(),
          productType: form.productType || undefined,
          notes: form.notes.trim() || undefined,
        });
        router.push(`/recipes/${result.id}`);
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t("recipes.error.saveFailed");
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }, [form, recipeId, router, t, runValidation]);

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
          SECTION 3: MATERIALS (BOM)
          ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-text-muted" />
              <CardTitle>{t("recipes.bom") ?? "Bill of Materials"}</CardTitle>
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
                      options={materialOptions}
                      value={item.materialId}
                      onChange={(val) => handleMaterialSelect(item.tempId, val)}
                      placeholder={t("recipes.selectMaterial") ?? "Select material..."}
                      searchPlaceholder={t("recipes.searchMaterial") ?? "Search material..."}
                      loading={materialsLoading}
                      error={!item.materialId && item.materialId !== undefined}
                    />
                  </div>

                  {/* Consumption Basis */}
                  <div className="col-span-2">
                    <Input
                      value={item.consumptionBasis}
                      onChange={(e) =>
                        updateBomItem(item.tempId, "consumptionBasis", e.target.value)
                      }
                      placeholder="per unit"
                      disabled={submitting}
                      className="h-8 text-xs"
                    />
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
          SECTION 4: OPERATIONS
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

                  {/* Operation Code */}
                  <div className="col-span-3">
                    <Input
                      value={op.operationCode}
                      onChange={(e) =>
                        updateOperation(op.tempId, "operationCode", e.target.value)
                      }
                      placeholder={t("recipes.operationCode") ?? "Operation code"}
                      disabled={submitting}
                      className="h-8 text-xs"
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
          SECTION 5: RULES
          ═══════════════════════════════════════════════════════════════ */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-text-muted" />
              <CardTitle>{t("recipes.rules") ?? "Rules"}</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={addRule}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t("common.add")}
            </Button>
          </div>
          <CardDescription>
            {t("recipes.rulesDesc") ?? "Recipe rules and constraints"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {rules.length === 0 ? (
            <EmptyState
              icon={<ClipboardList className="h-8 w-8" />}
              title={t("recipes.noRules") ?? "No rules"}
              description={t("recipes.noRulesDesc") ?? "Add rules to the recipe"}
              action={{ label: t("common.add"), onClick: addRule }}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="hidden grid-cols-12 gap-3 px-2 text-xs font-medium uppercase tracking-wider text-text-muted lg:grid">
                <div className="col-span-4">{t("recipes.ruleType") ?? "Rule Type"}</div>
                <div className="col-span-6">{t("recipes.ruleValue") ?? "Rule Value"}</div>
                <div className="col-span-2">{t("common.actions") ?? "Actions"}</div>
              </div>

              {rules.map((rule) => (
                <div
                  key={rule.tempId}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-glass-border bg-glass-surface p-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-center"
                >
                  {/* Rule Type */}
                  <div className="col-span-4">
                    <Input
                      value={rule.ruleType}
                      onChange={(e) => updateRule(rule.tempId, "ruleType", e.target.value)}
                      placeholder={t("recipes.ruleTypePlaceholder") ?? "e.g. min_thickness"}
                      disabled={submitting}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Rule Value */}
                  <div className="col-span-6">
                    <Input
                      value={rule.ruleValue}
                      onChange={(e) => updateRule(rule.tempId, "ruleValue", e.target.value)}
                      placeholder={t("recipes.ruleValuePlaceholder") ?? "e.g. 4mm"}
                      disabled={submitting}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Actions */}
                  <div className="col-span-2 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
                      title={t("common.remove") ?? "Remove"}
                      onClick={() => removeRule(rule.tempId)}
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
          SECTION 6: VALIDATION PANEL
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
          SECTION 7: VERSION SUMMARY
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
