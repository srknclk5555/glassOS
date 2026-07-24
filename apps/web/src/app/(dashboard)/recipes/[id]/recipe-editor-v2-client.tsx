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
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
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
  Layers,
  ListChecks,
  FlaskConical,
  Settings2,
  Zap,
  Ruler,
  Package,
  GripVertical,
  Info,
} from "lucide-react";
import {
  saveRecipe,
  getRecipeDetail,
} from "@/app/actions/recipes";
import { getMaterialsAction } from "@/app/actions/materials";
import { getStationsAction } from "@/app/actions/stations";
import { getMyFactoryConfigurationAction } from "@/app/actions/factory-config";
import { RecipeEngine } from "@repo/engine";
import type { RecipeEngineInput, RecipeEngineOutput } from "@repo/engine";
import type { FactoryConfiguration } from "@repo/types";

/* ══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ══════════════════════════════════════════════════════════════════════════ */

const PRODUCT_TYPE_OPTIONS = [
  { value: "flat_tempered",  label: "Düz Temperli Cam" },
  { value: "insulated",      label: "Isıcam (IGU)" },
  { value: "laminated",      label: "Lamine Cam" },
  { value: "bent_tempered",  label: "Kavisli Temperli" },
  { value: "coated",         label: "Kaplamalı Cam" },
  { value: "mirror",         label: "Ayna" },
] as const;

/** Tüketim tipi → hangi birimle hesaplanır */
const CONSUMPTION_BASIS_OPTIONS = [
  {
    value: "area",
    label: "Alan (m²)",
    hint: "Float cam, lamine PVB gibi — ölçü × ölçü",
    icon: "□",
    autoUnit: "m2",
  },
  {
    value: "perimeter",
    label: "Çevre (m)",
    hint: "Isıcam çıtası, butil, thiokol, silikon — 2×(En+Boy)",
    icon: "⬜",
    autoUnit: "m",
  },
  {
    value: "piece",
    label: "Adet (pcs)",
    hint: "Etiket, köşe koruyucu, dübel, klips",
    icon: "●",
    autoUnit: "pieces",
  },
  {
    value: "volume",
    label: "Hacim (m³ / lt)",
    hint: "Argon gazı, nem alıcı kimyasal",
    icon: "◈",
    autoUnit: "litre",
  },
  {
    value: "fixed",
    label: "Sabit Miktar",
    hint: "Her üretim biriminde sabit tüketilen miktar",
    icon: "=",
    autoUnit: "kg",
  },
] as const;

const UNIT_OPTIONS = [
  { value: "m2",     label: "m²" },
  { value: "m",      label: "m (metre)" },
  { value: "pieces", label: "adet" },
  { value: "litre",  label: "litre" },
  { value: "kg",     label: "kg" },
  { value: "ton",    label: "ton" },
  { value: "m3",     label: "m³" },
] as const;

function genId(): string {
  const chars = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  const ts = Date.now().toString(36).toUpperCase().padStart(10, "0");
  let rnd = "";
  for (let i = 0; i < 16; i++) rnd += chars[Math.floor(Math.random() * 32)];
  return (ts + rnd).slice(0, 26);
}

/* ══════════════════════════════════════════════════════════════════════════
   TYPES
   ══════════════════════════════════════════════════════════════════════════ */

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

interface EdgeValues {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface GrindSettings {
  useFactoryDefault: boolean;
  allEdgesSame: boolean;
  allMm: number;
  edges: EdgeValues;
}

interface TrimSettings {
  useFactoryDefault: boolean;
  allEdgesSame: boolean;
  allMm: number;
  edges: EdgeValues;
}

interface ProductionRules {
  temperRequired: boolean;
  lowEOrientationRequired: boolean;
  grindRequired: boolean;
  drillingAllowed: boolean;
  cncRequired: boolean;
  channelAllowed: boolean;
  minWidthMm: number;
  maxWidthMm: number;
  minHeightMm: number;
  maxHeightMm: number;
}

interface FormData {
  recipeCode: string;
  name: string;
  productType: string;
  notes: string;
}

const defaultGrind: GrindSettings = {
  useFactoryDefault: true,
  allEdgesSame: true,
  allMm: 1,
  edges: { top: 1, bottom: 1, left: 1, right: 1 },
};

const defaultTrim: TrimSettings = {
  useFactoryDefault: true,
  allEdgesSame: true,
  allMm: 20,
  edges: { top: 20, bottom: 20, left: 20, right: 20 },
};

const defaultRules: ProductionRules = {
  temperRequired: true,
  lowEOrientationRequired: false,
  grindRequired: true,
  drillingAllowed: false,
  cncRequired: false,
  channelAllowed: false,
  minWidthMm: 0,
  maxWidthMm: 0,
  minHeightMm: 0,
  maxHeightMm: 0,
};

/* ══════════════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════════════════ */

function ConsumptionBasisPill({ basis }: { basis: string }) {
  const opt = CONSUMPTION_BASIS_OPTIONS.find((o) => o.value === basis);
  if (!opt) return null;

  const colorMap: Record<string, string> = {
    area: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    perimeter: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    piece: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    volume: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    fixed: "bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400",
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${colorMap[basis] ?? "bg-gray-100 text-gray-600"}`}>
      <span>{opt.icon}</span>
      <span>{opt.label}</span>
    </span>
  );
}

function EdgeGrid({
  values,
  onChange,
  color = "blue",
  disabled,
}: {
  values: EdgeValues;
  onChange: (key: keyof EdgeValues, val: number) => void;
  color?: "blue" | "red" | "orange";
  disabled?: boolean;
}) {
  const edges: { key: keyof EdgeValues; label: string; pos: string }[] = [
    { key: "top",    label: "Üst",  pos: "col-start-2 row-start-1" },
    { key: "left",   label: "Sol",  pos: "col-start-1 row-start-2" },
    { key: "right",  label: "Sağ",  pos: "col-start-3 row-start-2" },
    { key: "bottom", label: "Alt",  pos: "col-start-2 row-start-3" },
  ];

  const colorClass = {
    blue: "border-blue-300 focus:border-blue-500 dark:border-blue-700",
    red: "border-red-300 focus:border-red-500 dark:border-red-700",
    orange: "border-orange-300 focus:border-orange-500 dark:border-orange-700",
  }[color];

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-2 w-fit mx-auto">
      <div className="col-start-2 row-start-2 flex h-14 w-14 items-center justify-center rounded-lg border-2 border-dashed border-glass-border bg-glass-surface text-2xl">
        🔲
      </div>
      {edges.map((e) => (
        <div key={e.key} className={`${e.pos} flex flex-col items-center gap-1`}>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            {e.label}
          </label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={values[e.key]}
              onChange={(ev) => onChange(e.key, parseFloat(ev.target.value) || 0)}
              disabled={disabled}
              min={0}
              step={0.5}
              className={`h-8 w-14 rounded-md border bg-background px-2 text-center text-xs font-semibold focus:outline-none focus:ring-1 ${colorClass}`}
            />
            <span className="text-[10px] text-text-muted">mm</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function FireLayerCard({
  type,
  icon,
  title,
  description,
  children,
}: {
  type: "grind" | "trim" | "normal";
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const colorMap = {
    grind: {
      border: "border-l-4 border-l-red-500 border-t-glass-border border-r-glass-border border-b-glass-border",
      badge: "bg-red-500/10 text-red-500 dark:bg-red-500/20 dark:text-red-400",
      pill: "border border-red-500/20 text-red-500",
    },
    trim: {
      border: "border-l-4 border-l-orange-500 border-t-glass-border border-r-glass-border border-b-glass-border",
      badge: "bg-orange-500/10 text-orange-500 dark:bg-orange-500/20 dark:text-orange-400",
      pill: "border border-orange-500/20 text-orange-500",
    },
    normal: {
      border: "border-l-4 border-l-yellow-500 border-t-glass-border border-r-glass-border border-b-glass-border",
      badge: "bg-yellow-500/10 text-yellow-500 dark:bg-yellow-500/20 dark:text-yellow-400",
      pill: "border border-yellow-500/20 text-yellow-500",
    },
  };

  const c = colorMap[type];

  return (
    <div className={`rounded-xl border bg-glass-surface p-5 shadow-sm ${c.border}`}>
      <div className="mb-4 flex items-start gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.badge} text-base`}>
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold text-text-primary">{title}</h3>
          <p className="mt-0.5 text-xs font-medium text-text-muted">{description}</p>
        </div>
        <span className={`ml-auto shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${c.pill}`}>
          FİRE KATMANI
        </span>
      </div>
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}


/* ── Production Simulation Card ───────────────────────────────────────────── */
function ProductionSimCard({
  result,
  factoryConfig,
  simWidth,
  simHeight,
  simQty,
  onWidthChange,
  onHeightChange,
  onQtyChange,
}: {
  result: RecipeEngineOutput | null;
  factoryConfig: FactoryConfiguration | null;
  simWidth: number;
  simHeight: number;
  simQty: number;
  onWidthChange: (v: number) => void;
  onHeightChange: (v: number) => void;
  onQtyChange: (v: number) => void;
}) {
  const fmt3 = (v: number) => v.toFixed(3);

  // Rodaj değerlerini engine sonucundan veya 0 al
  const rodajL = result?.appliedSettings?.rodaj?.left ?? 0;
  const rodajR = result?.appliedSettings?.rodaj?.right ?? 0;
  const rodajT = result?.appliedSettings?.rodaj?.top ?? 0;
  const rodajB = result?.appliedSettings?.rodaj?.bottom ?? 0;
  const rodajOn = result?.appliedSettings?.rodaj?.enabled ?? false;

  const netW = simWidth || 0;
  const netH = simHeight || 0;
  const cutW = rodajOn ? netW + rodajL + rodajR : netW;
  const cutH = rodajOn ? netH + rodajT + rodajB : netH;

  const netAreaM2 = (netW * netH) / 1_000_000;
  const cutAreaM2 = (cutW * cutH) / 1_000_000;
  const rodajLossM2 = Math.max(0, cutAreaM2 - netAreaM2);
  const rodajLossPct = cutAreaM2 > 0 ? (rodajLossM2 / cutAreaM2) * 100 : 0;

  const perimeterNetM = (2 * (netW + netH)) / 1000;

  // Trim plaka hesabı
  const [plateW, setPlateW] = useState(6000);
  const [plateH, setPlateH] = useState(3210);
  const trimL = result?.appliedSettings?.trim?.left ?? 0;
  const trimR = result?.appliedSettings?.trim?.right ?? 0;
  const trimT = result?.appliedSettings?.trim?.top ?? 0;
  const trimB = result?.appliedSettings?.trim?.bottom ?? 0;
  const trimOn = result?.appliedSettings?.trim?.enabled ?? false;

  const trimLossM2 = trimOn && plateW > 0 && plateH > 0
    ? ((trimL + trimR) * plateH + (trimT + trimB) * plateW) / 1_000_000
    : 0;
  const plateAreaM2 = (plateW * plateH) / 1_000_000;

  return (
    <Card className="overflow-hidden border border-glass-border">
      <CardHeader className="bg-glass-surface/50 pb-4 pt-5 border-b border-glass-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-glass-elevated border border-glass-border shadow-sm">
              <Zap className="h-5 w-5 text-glass-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-text-primary">
                Canlı Üretim & Fire Simülasyonu
              </CardTitle>
              <CardDescription className="text-xs">
                Ölçü verilerini girin — Net ölçü, kesimhane ölçüsü ve toza dönüşen fireyi anında görün
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="border-glass-primary/50 text-glass-primary font-semibold">
            CANLI HESAPLAMA
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {/* Ölçü Girdi Alanları */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              MÜŞTERİ EN (MM)
            </label>
            <Input
              type="number"
              value={simWidth}
              onChange={(e) => onWidthChange(parseFloat(e.target.value) || 0)}
              min={1}
              step={1}
              className="h-10 text-center text-lg font-bold text-text-primary bg-glass-surface"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              MÜŞTERİ BOY (MM)
            </label>
            <Input
              type="number"
              value={simHeight}
              onChange={(e) => onHeightChange(parseFloat(e.target.value) || 0)}
              min={1}
              step={1}
              className="h-10 text-center text-lg font-bold text-text-primary bg-glass-surface"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
              ÜRETİM ADEDİ
            </label>
            <Input
              type="number"
              value={simQty}
              onChange={(e) => onQtyChange(Math.max(1, parseInt(e.target.value) || 1))}
              min={1}
              step={1}
              className="h-10 text-center text-lg font-bold text-text-primary bg-glass-surface"
            />
          </div>
        </div>

        {netW > 0 && netH > 0 ? (
          <div className="space-y-6">
            
            {/* Dönüşüm Kartları (Net vs Kesimhane) */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              
              {/* Sol: Müşteri Net Ölçüsü */}
              <div className="flex flex-col overflow-hidden rounded-xl border border-glass-border bg-glass-surface shadow-sm">
                <div className="border-b border-glass-border bg-glass-elevated/50 px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        1. Müşteri Net Ölçüsü
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold">
                      NET BİTİŞ
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col p-5 space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tight text-text-primary">{netW}</span>
                    <span className="text-xl font-medium text-text-muted">×</span>
                    <span className="text-4xl font-black tracking-tight text-text-primary">{netH}</span>
                    <span className="text-sm font-semibold text-text-muted ml-1">mm</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-text-muted">Tek Cam Net Alanı</span>
                      <span className="text-lg font-bold text-text-primary">{fmt3(netAreaM2)} m²</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-text-muted">Toplam ({simQty} adet)</span>
                      <span className="text-lg font-bold text-text-primary">{fmt3(netAreaM2 * simQty)} m²</span>
                    </div>
                  </div>

                  <div className="mt-2 rounded-lg border border-glass-border bg-glass-elevated/50 p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-lg leading-none">📏</span>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-text-primary">Isıcam Çevre Tüketimi (Çıta, Butil)</span>
                        <span className="text-xs text-text-muted">
                          Tek çevre: <span className="font-medium text-text-primary">{perimeterNetM.toFixed(3)} m</span> · Toplam: <span className="font-medium text-text-primary">{(perimeterNetM * simQty).toFixed(3)} m</span>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sağ: Kesimhane Ölçüsü */}
              <div className="flex flex-col overflow-hidden rounded-xl border border-glass-border bg-glass-surface shadow-sm">
                <div className="border-b border-glass-border bg-glass-elevated/50 px-5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                        2. Kesimhane Ölçüsü
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs font-semibold">
                      + RODAJ PAYI
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col p-5 space-y-4">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black tracking-tight text-text-primary">{cutW}</span>
                    <span className="text-xl font-medium text-text-muted">×</span>
                    <span className="text-4xl font-black tracking-tight text-text-primary">{cutH}</span>
                    <span className="text-sm font-semibold text-text-muted ml-1">mm</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-text-muted">Tek Cam Kesim Alanı</span>
                      <span className="text-lg font-bold text-text-primary">{fmt3(cutAreaM2)} m²</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-text-muted">Toplam ({simQty} adet)</span>
                      <span className="text-lg font-bold text-text-primary">{fmt3(cutAreaM2 * simQty)} m²</span>
                    </div>
                  </div>

                  <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-lg leading-none">🔥</span>
                      <div className="flex flex-col gap-0.5 w-full">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-text-primary">Toza Dönüşen Rodaj Firesi</span>
                          <span className="text-xs font-bold text-red-500">+{fmt3(rodajLossM2 * simQty)} m²</span>
                        </div>
                        <span className="text-xs text-text-muted">Toplam alana oranı: %{rodajLossPct.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* Jumbo Plaka Trim Kartı */}
            <div className="rounded-xl border border-glass-border bg-glass-surface p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg leading-none">✂️</span>
                <span className="text-sm font-bold uppercase tracking-wider text-text-primary">
                  Jumbo Plaka Trim Firesi (Plaka Dış Kenar Temizliği)
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-medium text-text-muted">Plaka Ebadı (mm)</span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={plateW}
                      onChange={(e) => setPlateW(parseFloat(e.target.value) || 0)}
                      className="h-9 w-24 text-center font-semibold bg-glass-elevated"
                    />
                    <span className="text-text-muted">×</span>
                    <Input
                      type="number"
                      value={plateH}
                      onChange={(e) => setPlateH(parseFloat(e.target.value) || 0)}
                      className="h-9 w-24 text-center font-semibold bg-glass-elevated"
                    />
                    <span className="text-sm font-semibold text-text-primary ml-2">= {fmt3(plateAreaM2)} m²</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-text-primary">Plaka Başı Trim Kaybı</span>
                    <span className="text-sm font-bold text-amber-500">{fmt3(trimLossM2)} m² / plaka</span>
                  </div>
                  <span className="text-[10px] text-text-muted">
                    ({trimL}mm sol/sağ - {trimT}mm üst/alt tıraşlama) — Oran: %{((trimLossM2 / plateAreaM2) * 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex items-center justify-center rounded-xl border border-dashed border-glass-border bg-glass-surface/50 py-12">
            <div className="flex flex-col items-center gap-2 text-text-muted">
              <Ruler className="h-8 w-8 opacity-50" />
              <p className="text-sm font-medium">Simülasyon için en ve boy ölçülerini giriniz.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT — ORIGINAL STACKED CARD LAYOUT
   ══════════════════════════════════════════════════════════════════════════ */

interface RecipeEditorV2Props {
  recipeId?: string;
}

export function RecipeEditorV2Client({ recipeId }: RecipeEditorV2Props) {
  const { t } = useI18n();
  const router = useRouter();

  const [loading, setLoading] = useState(!!recipeId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    recipeCode: "",
    name: "",
    productType: "",
    notes: "",
  });

  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [outputItems, setOutputItems] = useState<OutputItem[]>([]);
  const [grind, setGrind] = useState<GrindSettings>(defaultGrind);
  const [trim, setTrim] = useState<TrimSettings>(defaultTrim);
  const [normalFirePct, setNormalFirePct] = useState(3);
  const [rules, setRules] = useState<ProductionRules>(defaultRules);
  const [operations, setOperations] = useState<OperationItem[]>([]);

  const [factoryConfig, setFactoryConfig] = useState<FactoryConfiguration | null>(null);
  const [engineResult, setEngineResult] = useState<RecipeEngineOutput | null>(null);
  const [simWidth, setSimWidth] = useState(500);
  const [simHeight, setSimHeight] = useState(2000);
  const [simQty, setSimQty] = useState(1);

  const [bomMaterialOpts, setBomMaterialOpts] = useState<ComboboxOption[]>([]);
  const [outputMaterialOpts, setOutputMaterialOpts] = useState<ComboboxOption[]>([]);
  const [stationOpts, setStationOpts] = useState<ComboboxOption[]>([]);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [stationsLoading, setStationsLoading] = useState(false);

  const [isActive, setIsActive] = useState(true);
  const [recipeVersion, setRecipeVersion] = useState<number | undefined>();

  useEffect(() => {
    getMyFactoryConfigurationAction()
      .then((c) => setFactoryConfig(c))
      .catch(() => setFactoryConfig(null));
  }, []);

  const loadBomMaterials = useCallback(async (search?: string) => {
    setMaterialsLoading(true);
    try {
      const r = await getMaterialsAction({
        search,
        status: "active",
        materialType: "raw_material,semi_finished,consumable",
        pageSize: 100,
        sortBy: "materialCode",
        sortOrder: "asc",
      });
      setBomMaterialOpts(
        (r?.items ?? []).map((m: any) => ({
          value: m.id,
          label: `${m.materialCode} — ${m.name}`,
          subtitle: m.materialType,
        }))
      );
    } finally {
      setMaterialsLoading(false);
    }
  }, []);

  const loadOutputMaterials = useCallback(async (search?: string) => {
    setMaterialsLoading(true);
    try {
      const r = await getMaterialsAction({
        search,
        status: "active",
        materialType: "finished_good,semi_finished",
        pageSize: 100,
        sortBy: "materialCode",
        sortOrder: "asc",
      });
      setOutputMaterialOpts(
        (r?.items ?? []).map((m: any) => ({
          value: m.id,
          label: `${m.materialCode} — ${m.name}`,
          subtitle: m.materialType,
        }))
      );
    } finally {
      setMaterialsLoading(false);
    }
  }, []);

  const loadStations = useCallback(async (search?: string) => {
    setStationsLoading(true);
    try {
      const r = await getStationsAction({ search, pageSize: 50 });
      setStationOpts(
        (r?.items ?? []).map((s: any) => ({
          value: s.stationCode ?? s.id,
          label: `${s.stationCode} — ${s.name}`,
          subtitle: s.stationType,
        }))
      );
    } finally {
      setStationsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBomMaterials();
    loadOutputMaterials();
    loadStations();
  }, [loadBomMaterials, loadOutputMaterials, loadStations]);

  useEffect(() => {
    if (!recipeId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const detail = await getRecipeDetail(recipeId!);
        if (cancelled) return;

        setForm({
          recipeCode: detail.recipeCode ?? "",
          name: detail.name ?? "",
          productType: detail.productType ?? "",
          notes: detail.notes ?? "",
        });
        setIsActive(detail.isActive ?? true);
        setRecipeVersion(detail.version);

        if (Array.isArray(detail.recipeItems)) {
          setBomItems(
            detail.recipeItems.map((it: any, idx: number) => ({
              tempId: `loaded_bom_${idx}`,
              materialId: it.materialId ?? "",
              materialCode: it.materialCode ?? "",
              materialName: it.materialName ?? "",
              materialType: it.materialType ?? "",
              consumptionBasis: it.consumptionBasis ?? "area",
              quantityPerUnit: Number(it.quantityPerUnit) || 1,
              unit: it.unit ?? "m2",
              sequence: it.sequence ?? idx + 1,
              wastePercentage: it.wastePercentage ?? null,
            }))
          );
        }

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

        if (Array.isArray(detail.outputs)) {
          setOutputItems(
            detail.outputs.map((o: any, idx: number) => ({
              tempId: `loaded_out_${idx}`,
              materialId: o.materialId ?? "",
              materialCode: o.materialCode ?? "",
              materialName: o.materialName ?? "",
              materialType: o.materialType ?? "",
              quantityPerUnit: o.quantityPerUnit ?? 1,
              unit: o.unit ?? "m2",
              sequence: o.sequence ?? idx + 1,
              notes: o.notes ?? "",
            }))
          );
        }

        if (detail.rodajSettings) {
          setGrind({
            useFactoryDefault: detail.rodajSettings.useDefaults ?? true,
            allEdgesSame: detail.rodajSettings.applyAllEdges ?? true,
            allMm: detail.rodajSettings.top ?? 1,
            edges: {
              top: detail.rodajSettings.top ?? 1,
              bottom: detail.rodajSettings.bottom ?? 1,
              left: detail.rodajSettings.left ?? 1,
              right: detail.rodajSettings.right ?? 1,
            },
          });
        }

        if (detail.trimSettings) {
          setTrim({
            useFactoryDefault: detail.trimSettings.useDefaults ?? true,
            allEdgesSame: detail.trimSettings.applyAllEdges ?? true,
            allMm: detail.trimSettings.top ?? 20,
            edges: {
              top: detail.trimSettings.top ?? 20,
              bottom: detail.trimSettings.bottom ?? 20,
              left: detail.trimSettings.left ?? 20,
              right: detail.trimSettings.right ?? 20,
            },
          });
        }

        if (detail.productionFirePercent !== undefined) {
          setNormalFirePct(Number(detail.productionFirePercent) || 3);
        }

        if (detail.productionRules) {
          setRules({
            temperRequired: detail.productionRules.temperRequired ?? true,
            lowEOrientationRequired: detail.productionRules.lowEOrientationRequired ?? false,
            grindRequired: detail.productionRules.rodajRequired ?? true,
            drillingAllowed: detail.productionRules.drillingAllowed ?? false,
            cncRequired: detail.productionRules.cncRequired ?? false,
            channelAllowed: detail.productionRules.channelAllowed ?? false,
            minWidthMm: detail.productionRules.minMeasureMm ?? 0,
            maxWidthMm: detail.productionRules.maxMeasureMm ?? 0,
            minHeightMm: 0,
            maxHeightMm: 0,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Reçete yüklenemedi");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [recipeId]);

  useEffect(() => {
    if (!factoryConfig) { setEngineResult(null); return; }

    const rodajInput = {
      useDefaults: grind.useFactoryDefault,
      top: grind.edges.top,
      bottom: grind.edges.bottom,
      left: grind.edges.left,
      right: grind.edges.right,
    };

    const trimInput = {
      useDefaults: trim.useFactoryDefault,
      top: trim.edges.top,
      bottom: trim.edges.bottom,
      left: trim.edges.left,
      right: trim.edges.right,
    };

    const input: RecipeEngineInput = {
      netWidthMm: simWidth,
      netHeightMm: simHeight,
      quantity: simQty,
      rodaj: rodajInput,
      trim: trimInput,
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
      fireItems: normalFirePct > 0
        ? [
            {
              fireType: "operatorLoss",
              fireTypeLabel: "Üretim Firesi",
              rate: normalFirePct,
              unit: "%",
            },
          ]
        : [],
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
      setEngineResult(RecipeEngine.calculate(input));
    } catch {
      // keep
    }
  }, [factoryConfig, simWidth, simHeight, simQty, grind, trim, bomItems, normalFirePct, outputItems]);

  const addBomItem = useCallback(() => {
    const seq = bomItems.length > 0 ? Math.max(...bomItems.map((i) => i.sequence)) + 1 : 1;
    setBomItems((prev) => [
      ...prev,
      {
        tempId: `bom_${genId()}`,
        materialId: "",
        materialCode: "",
        materialName: "",
        materialType: "",
        consumptionBasis: "",
        quantityPerUnit: 1,
        unit: "",
        sequence: seq,
        wastePercentage: null,
      },
    ]);
  }, [bomItems]);

  const removeBomItem = useCallback((id: string) => {
    setBomItems((prev) => prev.filter((i) => i.tempId !== id));
  }, []);

  const updateBomItem = useCallback((id: string, key: keyof BOMItem, val: unknown) => {
    setBomItems((prev) =>
      prev.map((item) => {
        if (item.tempId !== id) return item;
        const updated = { ...item, [key]: val };
        if (key === "consumptionBasis") {
          const basisOpt = CONSUMPTION_BASIS_OPTIONS.find((o) => o.value === val);
          if (basisOpt && !item.unit) updated.unit = basisOpt.autoUnit;
        }
        return updated;
      })
    );
  }, []);

  const moveBomItem = useCallback((id: string, dir: "up" | "down") => {
    setBomItems((prev) => {
      const idx = prev.findIndex((i) => i.tempId === id);
      if (idx === -1) return prev;
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
      return next.map((item, i) => ({ ...item, sequence: i + 1 }));
    });
  }, []);

  const handleMaterialSelect = useCallback(
    (id: string, materialId: string) => {
      const sel = bomMaterialOpts.find((o) => o.value === materialId);
      if (!sel) { updateBomItem(id, "materialId", materialId); return; }
      const parts = sel.label.split(" — ");
      setBomItems((prev) =>
        prev.map((item) =>
          item.tempId !== id
            ? item
            : {
                ...item,
                materialId,
                materialCode: parts[0] ?? "",
                materialName: parts.slice(1).join(" — "),
                materialType: sel.subtitle ?? "",
              }
        )
      );
    },
    [bomMaterialOpts, updateBomItem]
  );

  const addOutputItem = useCallback(() => {
    const seq = outputItems.length > 0 ? Math.max(...outputItems.map((i) => i.sequence)) + 1 : 1;
    setOutputItems((prev) => [
      ...prev,
      {
        tempId: `out_${genId()}`,
        materialId: "",
        materialCode: "",
        materialName: "",
        materialType: "",
        quantityPerUnit: 1,
        unit: "m2",
        sequence: seq,
        notes: "",
      },
    ]);
  }, [outputItems]);

  const removeOutputItem = useCallback((id: string) => {
    setOutputItems((prev) => prev.filter((i) => i.tempId !== id));
  }, []);

  const updateOutputItem = useCallback((id: string, key: keyof OutputItem, val: unknown) => {
    setOutputItems((prev) => prev.map((o) => (o.tempId === id ? { ...o, [key]: val } : o)));
  }, []);

  const handleOutputMaterialSelect = useCallback(
    (id: string, materialId: string) => {
      const sel = outputMaterialOpts.find((o) => o.value === materialId);
      if (!sel) { updateOutputItem(id, "materialId", materialId); return; }
      const parts = sel.label.split(" — ");
      setOutputItems((prev) =>
        prev.map((item) =>
          item.tempId !== id
            ? item
            : {
                ...item,
                materialId,
                materialCode: parts[0] ?? "",
                materialName: parts.slice(1).join(" — "),
                materialType: sel.subtitle ?? "",
              }
        )
      );
    },
    [outputMaterialOpts, updateOutputItem]
  );

  const addOperation = useCallback(() => {
    const seq = operations.length > 0 ? Math.max(...operations.map((o) => o.sequence)) + 1 : 1;
    setOperations((prev) => [
      ...prev,
      { tempId: `op_${genId()}`, operationCode: "", sequence: seq, isMandatory: true, notes: "" },
    ]);
  }, [operations]);

  const removeOperation = useCallback((id: string) => {
    setOperations((prev) => prev.filter((o) => o.tempId !== id));
  }, []);

  const updateOperation = useCallback((id: string, key: keyof OperationItem, val: unknown) => {
    setOperations((prev) => prev.map((op) => (op.tempId === id ? { ...op, [key]: val } : op)));
  }, []);

  const moveOperation = useCallback((id: string, dir: "up" | "down") => {
    setOperations((prev) => {
      const idx = prev.findIndex((o) => o.tempId === id);
      if (idx === -1) return prev;
      const swapIdx = dir === "up" ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[swapIdx]] = [next[swapIdx]!, next[idx]!];
      return next.map((op, i) => ({ ...op, sequence: i + 1 }));
    });
  }, []);

  const updateGrindEdge = useCallback((key: keyof EdgeValues, val: number) => {
    setGrind((prev) => ({ ...prev, edges: { ...prev.edges, [key]: val } }));
  }, []);

  const setGrindAllEdges = useCallback((val: number) => {
    setGrind((prev) => ({
      ...prev,
      allMm: val,
      edges: { top: val, bottom: val, left: val, right: val },
    }));
  }, []);

  const updateTrimEdge = useCallback((key: keyof EdgeValues, val: number) => {
    setTrim((prev) => ({ ...prev, edges: { ...prev.edges, [key]: val } }));
  }, []);

  const setTrimAllEdges = useCallback((val: number) => {
    setTrim((prev) => ({
      ...prev,
      allMm: val,
      edges: { top: val, bottom: val, left: val, right: val },
    }));
  }, []);

  const hasErrors = useMemo(() => {
    return !form.recipeCode.trim() || !form.name.trim();
  }, [form]);

  const handleSubmit = useCallback(async () => {
    if (hasErrors) {
      setError("Reçete kodu ve adı zorunludur.");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const payload: any = {
        recipeCode: form.recipeCode.trim(),
        name: form.name.trim(),
        productType: form.productType || undefined,
        notes: form.notes.trim() || undefined,
        isActive,
        recipeItems: bomItems.map((b) => ({
          materialId: b.materialId,
          consumptionBasis: b.consumptionBasis,
          quantityPerUnit: b.quantityPerUnit,
          unit: b.unit,
          sequence: b.sequence,
          wastePercentage: b.wastePercentage,
        })),
        recipeOperations: operations.map((op) => ({
          operationCode: op.operationCode,
          sequence: op.sequence,
          isMandatory: op.isMandatory,
          notes: op.notes,
        })),
        recipeOutputs: outputItems.map((o) => ({
          materialId: o.materialId,
          productName: o.materialName,
          quantityPerUnit: o.quantityPerUnit,
          unit: o.unit,
          sequence: o.sequence,
          notes: o.notes,
        })),
        productionFirePercent: normalFirePct,
        productionRules: {
          temperRequired: rules.temperRequired,
          lowEOrientationRequired: rules.lowEOrientationRequired,
          rodajRequired: rules.grindRequired,
          drillingAllowed: rules.drillingAllowed,
          cncRequired: rules.cncRequired,
          channelAllowed: rules.channelAllowed,
          minMeasureMm: rules.minWidthMm,
          maxMeasureMm: rules.maxWidthMm,
        },
        rodajSettings: {
          enabled: !grind.useFactoryDefault,
          useDefaults: grind.useFactoryDefault,
          applyAllEdges: grind.allEdgesSame,
          top: grind.edges.top,
          bottom: grind.edges.bottom,
          left: grind.edges.left,
          right: grind.edges.right,
        },
        trimSettings: {
          enabled: !trim.useFactoryDefault,
          useDefaults: trim.useFactoryDefault,
          applyAllEdges: trim.allEdgesSame,
          top: trim.edges.top,
          bottom: trim.edges.bottom,
          left: trim.edges.left,
          right: trim.edges.right,
        },
      };

      if (recipeId) {
        payload.id = recipeId;
        await saveRecipe(recipeId, payload);
        router.push(`/recipes/${recipeId}`);
      } else {
        payload.id = genId();
        const result = await saveRecipe(null, payload);
        router.push(`/recipes/${result?.id || payload.id}`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Kaydetme başarısız.");
    } finally {
      setSubmitting(false);
    }
  }, [form, recipeId, router, hasErrors, isActive, bomItems, operations, outputItems, normalFirePct, rules, grind, trim]);

  const sortedBom = useMemo(() => [...bomItems].sort((a, b) => a.sequence - b.sequence), [bomItems]);
  const sortedOps = useMemo(() => [...operations].sort((a, b) => a.sequence - b.sequence), [operations]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const isEdit = !!recipeId;

  return (
    <div className="flex flex-col gap-6 p-6">

      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              {isEdit ? t("recipes.editRecipe") ?? "Reçete Düzenle" : t("recipes.newRecipe") ?? "Yeni Reçete"}
            </h1>
            {isEdit && (
              <Badge variant={isActive ? "success" : "secondary"}>
                {isActive ? "Aktif" : "Arşiv"}
              </Badge>
            )}
            {isEdit && recipeVersion !== undefined && (
              <Badge variant="info">v{recipeVersion}</Badge>
            )}
          </div>
          <p className="text-sm text-text-muted">
            {isEdit ? `${form.recipeCode} — ${form.name}` : "Yeni ürün reçetesi ve üretim kurallarını tanımlayın"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => router.back()} disabled={submitting}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            İptal
          </Button>
          <Button onClick={handleSubmit} disabled={submitting || hasErrors}>
            {submitting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            {submitting ? "Kaydediliyor…" : "Kaydet"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </div>
      )}

      <Tabs defaultValue="genel" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 lg:grid-cols-5 bg-glass-surface border border-glass-border p-1 rounded-xl h-auto">
          <TabsTrigger value="genel" className="rounded-lg py-2.5 text-sm">Genel Bilgiler</TabsTrigger>
          <TabsTrigger value="malzemeler" className="rounded-lg py-2.5 text-sm">Malzemeler</TabsTrigger>
          <TabsTrigger value="cikti_kurallar" className="rounded-lg py-2.5 text-sm">Çıktı & Kurallar</TabsTrigger>
          <TabsTrigger value="simulasyon_fire" className="rounded-lg py-2.5 text-sm">Fire & Simülasyon</TabsTrigger>
          <TabsTrigger value="operasyon" className="rounded-lg py-2.5 text-sm">Operasyon Sırası</TabsTrigger>
        </TabsList>

        <TabsContent value="genel" className="mt-0">

      {/* SECTION 1: GENEL BİLGİLER */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4 text-text-muted" />
            <CardTitle>{t("recipes.generalInfo") ?? "Genel Bilgiler"}</CardTitle>
          </div>
          <CardDescription>Reçete kodu, adı ve ürün tipi</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">
                Reçete Kodu <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.recipeCode}
                onChange={(e) => setForm((p) => ({ ...p, recipeCode: e.target.value }))}
                placeholder="REC-001"
                disabled={submitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">
                Reçete Adı <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="12mm Düz Temperli Cam"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Ürün Tipi</label>
              <Select
                value={form.productType}
                onValueChange={(v) => setForm((p) => ({ ...p, productType: v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ürün tipi seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPE_OPTIONS.map((pt) => (
                    <SelectItem key={pt.value} value={pt.value}>
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-muted">Notlar</label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Opsiyonel notlar..."
                disabled={submitting}
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="malzemeler" className="mt-0">

      {/* SECTION 2: HARCANAN MALZEMELER (BOM) */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-text-muted" />
              <CardTitle>Harcanan Malzemeler</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={addBomItem}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Malzeme Ekle
            </Button>
          </div>
          <CardDescription>
            Her malzeme için Tüketim Tipi seçin — Alan (m²), Çevre (m), Adet veya Hacim
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {bomItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-glass-border p-6 text-center">
              <p className="text-sm text-text-muted">Reçeteye malzeme eklenmedi</p>
              <Button variant="outline" size="sm" onClick={addBomItem}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Ekle
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="hidden grid-cols-12 gap-3 px-2 text-xs font-medium uppercase tracking-wider text-text-muted lg:grid">
                <div className="col-span-1">#</div>
                <div className="col-span-3">Stok Kartı</div>
                <div className="col-span-3">Tüketim Tipi</div>
                <div className="col-span-1">Miktar</div>
                <div className="col-span-1">Birim</div>
                <div className="col-span-1">Fire %</div>
                <div className="col-span-2">İşlem</div>
              </div>

              {sortedBom.map((item) => (
                <div
                  key={item.tempId}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-glass-border bg-glass-surface p-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-center"
                >
                  <div className="col-span-1 flex items-center gap-1">
                    <GripVertical className="h-3.5 w-3.5 text-text-muted" />
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-glass-elevated text-xs font-medium text-text-muted">
                      {item.sequence}
                    </span>
                  </div>

                  <div className="col-span-3">
                    <Combobox
                      options={bomMaterialOpts}
                      value={item.materialId}
                      onChange={(val) => handleMaterialSelect(item.tempId, val)}
                      placeholder="Stok kartı seç..."
                      searchPlaceholder="Stok kartı ara..."
                      loading={materialsLoading}
                      error={!item.materialId}
                    />
                  </div>

                  <div className="col-span-3">
                    <Select
                      value={item.consumptionBasis}
                      onValueChange={(val) => updateBomItem(item.tempId, "consumptionBasis", val)}
                      disabled={submitting}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CONSUMPTION_BASIS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex flex-col">
                              <span className="font-medium">{opt.icon} {opt.label}</span>
                              <span className="text-[10px] text-text-muted">{opt.hint}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {item.consumptionBasis && (
                      <div className="mt-1">
                        <ConsumptionBasisPill basis={item.consumptionBasis} />
                      </div>
                    )}
                  </div>

                  <div className="col-span-1">
                    <Input
                      type="number"
                      value={item.quantityPerUnit}
                      onChange={(e) =>
                        updateBomItem(item.tempId, "quantityPerUnit", parseFloat(e.target.value) || 0)
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
                      onValueChange={(v) => updateBomItem(item.tempId, "unit", v)}
                      disabled={submitting}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Birim" />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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

                  <div className="col-span-2 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveBomItem(item.tempId, "up")}
                      disabled={item.sequence <= 1}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveBomItem(item.tempId, "down")}
                      disabled={item.sequence >= bomItems.length}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
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
      </TabsContent>

      <TabsContent value="cikti_kurallar" className="space-y-6 mt-0">
      {/* SECTION 3: ÜRETİLEN ÜRÜN */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-green-600" />
              <CardTitle>Üretilen Ürün (Çıkan)</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={addOutputItem}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Ürün Ekle
            </Button>
          </div>
          <CardDescription>Bu reçeteyle üretilen mamul / yarı mamul</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {outputItems.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-glass-border p-6 text-center">
              <p className="text-sm text-text-muted">Üretilen ürün eklenmedi</p>
              <Button variant="outline" size="sm" onClick={addOutputItem}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Ekle
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {outputItems.map((item) => (
                <div
                  key={item.tempId}
                  className="flex flex-col gap-2 rounded-lg border border-glass-border bg-glass-surface p-3 sm:flex-row sm:items-center"
                >
                  <div className="flex-1">
                    <Combobox
                      options={outputMaterialOpts}
                      value={item.materialId}
                      onChange={(val) => handleOutputMaterialSelect(item.tempId, val)}
                      placeholder="Mamul / Yarı Mamul seç..."
                      searchPlaceholder="Ara..."
                      loading={materialsLoading}
                      error={!item.materialId}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={item.quantityPerUnit}
                      onChange={(e) =>
                        updateOutputItem(item.tempId, "quantityPerUnit", parseFloat(e.target.value) || 0)
                      }
                      className="h-8 w-20 text-xs"
                      min={0}
                      step={0.01}
                    />
                    <Select
                      value={item.unit}
                      onValueChange={(v) => updateOutputItem(item.tempId, "unit", v)}
                    >
                      <SelectTrigger className="h-8 w-20 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNIT_OPTIONS.map((u) => (
                          <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
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

      {/* SECTION 4: ÜRETİM KURALLARI */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-text-muted" />
            <CardTitle>Üretim Kuralları</CardTitle>
          </div>
          <CardDescription>Reçete için üretim kısıtları ve zorunluluklar</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-4">
              {[
                { key: "temperRequired" as const, label: "Temper Zorunlu" },
                { key: "lowEOrientationRequired" as const, label: "Low-E Yönü Önemli" },
                { key: "grindRequired" as const, label: "Rodaj Gerekli" },
                { key: "drillingAllowed" as const, label: "Delik Açılabilir" },
                { key: "cncRequired" as const, label: "CNC İşleme Gerekli" },
                { key: "channelAllowed" as const, label: "Kanal Açılabilir" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3">
                  <Switch
                    checked={rules[key]}
                    onCheckedChange={(v) => setRules((p) => ({ ...p, [key]: v }))}
                    disabled={submitting}
                  />
                  <span className="text-sm font-medium">{label}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">Minimum Ölçü (mm)</label>
                <Input
                  type="number"
                  value={rules.minWidthMm || ""}
                  onChange={(e) => setRules((p) => ({ ...p, minWidthMm: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                  disabled={submitting}
                  className="h-9 text-sm"
                  min={0}
                  step={1}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-text-muted">Maksimum Ölçü (mm)</label>
                <Input
                  type="number"
                  value={rules.maxWidthMm || ""}
                  onChange={(e) => setRules((p) => ({ ...p, maxWidthMm: parseFloat(e.target.value) || 0 }))}
                  placeholder="0"
                  disabled={submitting}
                  className="h-9 text-sm"
                  min={0}
                  step={1}
                />
              </div>
              <p className="text-xs text-text-muted italic">0 = sınırsız</p>
            </div>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="simulasyon_fire" className="space-y-6 mt-0">
      {/* SECTION 5: CANLI ÜRETİM SİMÜLASYONU */}
      <ProductionSimCard
        result={engineResult}
        factoryConfig={factoryConfig}
        simWidth={simWidth}
        simHeight={simHeight}
        simQty={simQty}
        onWidthChange={setSimWidth}
        onHeightChange={setSimHeight}
        onQtyChange={setSimQty}
      />

      {/* SECTION 6: FİRE AYARLARI */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <CardTitle>Fire Ayarları</CardTitle>
          </div>
          <CardDescription>Rodaj, Trim ve Üretim fire oranları</CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-6">

          {/* RODAJ FİRESİ */}
          <FireLayerCard
            type="grind"
            icon="⚙️"
            title="🔥 Rodaj Firesi"
            description="Her kenar için taşlama payı (mm) — net ölçüye eklenerek kesime girer, fırında taşlanarak toza dönüşür"
          >
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:text-text-primary">
                  <input
                    type="radio"
                    name="grindSource"
                    checked={grind.useFactoryDefault}
                    onChange={() => setGrind((p) => ({ ...p, useFactoryDefault: true }))}
                    disabled={submitting}
                    className="h-3.5 w-3.5 accent-red-600"
                  />
                  <span className="font-semibold">Fabrika Ayarını Kullan</span>
                  {grind.useFactoryDefault && factoryConfig && (
                    <span className="text-xs text-text-muted">
                      (Şu an: {(factoryConfig as any).grindingConfiguration?.leftMm ?? 1}mm/kenar)
                    </span>
                  )}
                </label>
                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:text-text-primary">
                  <input
                    type="radio"
                    name="grindSource"
                    checked={!grind.useFactoryDefault}
                    onChange={() => setGrind((p) => ({ ...p, useFactoryDefault: false }))}
                    disabled={submitting}
                    className="h-3.5 w-3.5 accent-red-600"
                  />
                  <span className="font-medium">Bu reçete için özel değer kullan</span>
                </label>
              </div>

              {!grind.useFactoryDefault && (
                <div className="space-y-3 rounded-lg border border-glass-border bg-glass-elevated/50 p-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-text-primary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={grind.allEdgesSame}
                      onChange={(e) => setGrind((p) => ({ ...p, allEdgesSame: e.target.checked }))}
                      disabled={submitting}
                      className="h-4 w-4 rounded accent-red-600"
                    />
                    Tüm kenarlara aynı değeri uygula
                  </label>

                  {grind.allEdgesSame ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-text-primary w-24">Pay Miktarı:</span>
                      <Input
                        type="number"
                        value={grind.allMm}
                        onChange={(e) => setGrindAllEdges(parseFloat(e.target.value) || 0)}
                        className="h-9 w-24 text-sm font-bold text-center bg-glass-surface"
                        min={0}
                        step={0.5}
                        disabled={submitting}
                      />
                      <span className="text-sm font-semibold text-text-muted">mm</span>
                    </div>
                  ) : (
                    <EdgeGrid values={grind.edges} onChange={updateGrindEdge} color="red" />
                  )}
                </div>
              )}
            </div>
          </FireLayerCard>

          {/* TRİM FİRESİ */}
          <FireLayerCard
            type="trim"
            icon="✂️"
            title="🔥 Trim Firesi"
            description="Jumbo plakanın (6000×3210 mm) kenarlarından kesilen şerit — plaka bazlı fire"
          >
            <div className="space-y-3">
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:text-text-primary">
                  <input
                    type="radio"
                    name="trimSource"
                    checked={trim.useFactoryDefault}
                    onChange={() => setTrim((p) => ({ ...p, useFactoryDefault: true }))}
                    disabled={submitting}
                    className="h-3.5 w-3.5 accent-orange-600"
                  />
                  <span className="font-semibold">Fabrika Ayarını Kullan</span>
                  {trim.useFactoryDefault && factoryConfig && (
                    <span className="text-xs text-text-muted">
                      (Şu an: {(factoryConfig as any).trimConfiguration?.leftMm ?? 20}mm/kenar)
                    </span>
                  )}
                </label>
                <label className="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:text-text-primary">
                  <input
                    type="radio"
                    name="trimSource"
                    checked={!trim.useFactoryDefault}
                    onChange={() => setTrim((p) => ({ ...p, useFactoryDefault: false }))}
                    disabled={submitting}
                    className="h-3.5 w-3.5 accent-orange-600"
                  />
                  <span className="font-medium">Bu reçete için özel değer kullan</span>
                </label>
              </div>

              {!trim.useFactoryDefault && (
                <div className="space-y-3 rounded-lg border border-glass-border bg-glass-elevated/50 p-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-text-primary cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trim.allEdgesSame}
                      onChange={(e) => setTrim((p) => ({ ...p, allEdgesSame: e.target.checked }))}
                      disabled={submitting}
                      className="h-4 w-4 rounded accent-orange-600"
                    />
                    Tüm kenarlara aynı değeri uygula
                  </label>

                  {trim.allEdgesSame ? (
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-text-primary w-24">Pay Miktarı:</span>
                      <Input
                        type="number"
                        value={trim.allMm}
                        onChange={(e) => setTrimAllEdges(parseFloat(e.target.value) || 0)}
                        className="h-9 w-24 text-sm font-bold text-center bg-glass-surface"
                        min={0}
                        step={0.5}
                        disabled={submitting}
                      />
                      <span className="text-sm font-semibold text-text-muted">mm</span>
                    </div>
                  ) : (
                    <EdgeGrid values={trim.edges} onChange={updateTrimEdge} color="orange" />
                  )}
                </div>
              )}
            </div>
          </FireLayerCard>

          {/* ÜRETİM FİRESİ */}
          <FireLayerCard
            type="normal"
            icon="%"
            title="🔥 Üretim Firesi"
            description="Kırılma, operasyonel zayiat — manuel elle yüzde olarak girilir"
          >
            <div className="flex items-center gap-3">
              <Input
                type="number"
                value={normalFirePct}
                onChange={(e) => setNormalFirePct(parseFloat(e.target.value) || 0)}
                className="h-8 w-24 text-xs font-bold"
                min={0}
                max={100}
                step={0.5}
                disabled={submitting}
              />
              <span className="text-xs font-bold">%</span>
            </div>
          </FireLayerCard>

        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="operasyon" className="mt-0">
      {/* SECTION 7: OPERASYON SIRASI */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-text-muted" />
              <CardTitle>Operasyon Sırası</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={addOperation}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Adım Ekle
            </Button>
          </div>
          <CardDescription>Üretim adımları ve zorunlu/opsiyonel durumları</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          {operations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-glass-border p-6 text-center">
              <p className="text-sm text-text-muted">Operasyon eklenmedi</p>
              <Button variant="outline" size="sm" onClick={addOperation}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Ekle
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {sortedOps.map((op, idx) => (
                <div
                  key={op.tempId}
                  className="grid grid-cols-1 gap-3 rounded-lg border border-glass-border bg-glass-surface p-3 sm:grid-cols-2 lg:grid-cols-12 lg:items-center"
                >
                  <div className="col-span-1 flex items-center gap-1">
                    <GripVertical className="h-3.5 w-3.5 text-text-muted" />
                    <span className="flex h-6 w-6 items-center justify-center rounded bg-glass-elevated text-xs font-medium text-text-muted">
                      {op.sequence}
                    </span>
                  </div>

                  <div className="col-span-3">
                    <Combobox
                      options={stationOpts}
                      value={op.operationCode}
                      onChange={(val) => updateOperation(op.tempId, "operationCode", val)}
                      placeholder="İstasyon seç..."
                      searchPlaceholder="İstasyon ara..."
                      loading={stationsLoading}
                    />
                  </div>

                  <div className="col-span-2 flex items-center gap-2">
                    <Switch
                      checked={op.isMandatory}
                      onCheckedChange={(v) => updateOperation(op.tempId, "isMandatory", v)}
                      disabled={submitting}
                    />
                    <span className="text-xs text-text-muted">
                      {op.isMandatory ? "Zorunlu" : "Opsiyonel"}
                    </span>
                  </div>

                  <div className="col-span-4">
                    <Input
                      value={op.notes}
                      onChange={(e) => updateOperation(op.tempId, "notes", e.target.value)}
                      placeholder="Not..."
                      disabled={submitting}
                      className="h-8 text-xs"
                    />
                  </div>

                  <div className="col-span-2 flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveOperation(op.tempId, "up")}
                      disabled={idx === 0}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => moveOperation(op.tempId, "down")}
                      disabled={idx === sortedOps.length - 1}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-500 hover:text-red-600"
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
      </TabsContent>
      </Tabs>
    </div>
  );
}
