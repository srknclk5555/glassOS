import type { FactoryConfiguration } from "@repo/types";

// ─── Recipe-Level Settings (from Recipe Editor) ───────────────────────────

export interface RodajSetting {
  useDefaults: boolean;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface TrimSetting {
  useDefaults: boolean;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface RecipeBomItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  consumptionBasis: "area" | "perimeter" | "piece" | "fixed" | "duration";
  quantityPerUnit: number;
  unit: string;
  wastePercentage: number;
}

export interface RecipeFireItem {
  fireType: string;
  fireTypeLabel: string;
  rate: number;
  unit: string;
}

export interface RecipeOutputItem {
  materialId: string;
  productCode: string;
  productName: string;
  quantityPerUnit: number;
  unit: string;
}

// ─── Recipe Engine Input ──────────────────────────────────────────────────

export interface RecipeEngineInput {
  /** Net dimensions from the order / sales (mm) */
  netWidthMm: number;
  netHeightMm: number;
  /** Number of pieces to produce */
  quantity: number;

  /** Recipe-level rodaj settings */
  rodaj: RodajSetting;
  /** Recipe-level trim settings */
  trim: TrimSetting;

  /** BOM items (consumed materials) */
  bomItems: RecipeBomItem[];
  /** Fire definitions */
  fireItems: RecipeFireItem[];
  /** Output items (produced products) */
  outputItems: RecipeOutputItem[];

  /** Factory-wide configuration (looked up from DB) */
  factoryConfiguration: FactoryConfiguration;
}

// ─── Dimension Stages ─────────────────────────────────────────────────────

export interface DimensionStage {
  label: string;
  widthMm: number;
  heightMm: number;
  areaM2: number;
}

// ─── Calculated Results ──────────────────────────────────────────────────

export interface CalculatedConsumedMaterial {
  materialId: string;
  materialCode: string;
  materialName: string;
  consumptionBasis: string;
  netQuantity: number;
  wasteQuantity: number;
  grossQuantity: number;
  unit: string;
}

export interface CalculatedFireLoss {
  fireType: string;
  fireTypeLabel: string;
  rate: number;
  unit: string;
  lossAreaM2: number;
  lossPercentage: number;
}

export interface CalculatedProduct {
  materialId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unit: string;
}

// ─── Recipe Engine Output ────────────────────────────────────────────────

export interface RecipeEngineOutput {
  /** Per-piece dimension pipeline */
  dimensions: {
    net: DimensionStage;
    afterTrim: DimensionStage;
    afterRodaj: DimensionStage;
    production: DimensionStage;
  };

  /** Totals for the full quantity */
  totals: {
    netAreaM2: number;
    productionAreaM2: number;
    totalGlassConsumptionM2: number;
  };

  /** Applied settings (resolved — shows what was actually used) */
  appliedSettings: {
    rodaj: { enabled: boolean; top: number; bottom: number; left: number; right: number; source: "factory" | "recipe" };
    trim: { enabled: boolean; top: number; bottom: number; left: number; right: number; source: "factory" | "recipe" };
  };

  /** Calculated consumption */
  consumedMaterials: CalculatedConsumedMaterial[];

  /** Calculated fire losses */
  fireLosses: CalculatedFireLoss[];
  totalFireRate: number;

  /** Calculated production output */
  producedProducts: CalculatedProduct[];

  /** Efficiency metrics */
  efficiency: number; // net area / production area (0–1)
}
