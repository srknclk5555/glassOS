import type { FactoryConfiguration } from "@repo/types";
import type {
  RecipeEngineInput,
  RecipeEngineOutput,
  DimensionStage,
  CalculatedConsumedMaterial,
  CalculatedFireLoss,
  CalculatedProduct,
  RodajSetting,
  TrimSetting,
  RecipeBomItem,
  RecipeFireItem,
  RecipeOutputItem,
} from "./recipe-engine-types.js";

// ─── Resolve actual rodaj/trim values ────────────────────────────────────

function resolveRodaj(
  recipeRodaj: RodajSetting,
  factoryConfig: FactoryConfiguration
): { enabled: boolean; top: number; bottom: number; left: number; right: number; source: "factory" | "recipe" } {
  const factory = factoryConfig.grindingConfiguration;
  if (recipeRodaj.useDefaults) {
    return {
      enabled: factory.enabled,
      top: factory.topMm,
      bottom: factory.bottomMm,
      left: factory.leftMm,
      right: factory.rightMm,
      source: "factory",
    };
  }
  return {
    enabled: true,
    top: recipeRodaj.top,
    bottom: recipeRodaj.bottom,
    left: recipeRodaj.left,
    right: recipeRodaj.right,
    source: "recipe",
  };
}

function resolveTrim(
  recipeTrim: TrimSetting,
  factoryConfig: FactoryConfiguration
): { enabled: boolean; top: number; bottom: number; left: number; right: number; source: "factory" | "recipe" } {
  const factory = factoryConfig.trimConfiguration;
  if (recipeTrim.useDefaults) {
    return {
      enabled: factory.enabled,
      top: factory.topMm,
      bottom: factory.bottomMm,
      left: factory.leftMm,
      right: factory.rightMm,
      source: "factory",
    };
  }
  return {
    enabled: true,
    top: recipeTrim.top,
    bottom: recipeTrim.bottom,
    left: recipeTrim.left,
    right: recipeTrim.right,
    source: "recipe",
  };
}

// ─── Dimension helpers ───────────────────────────────────────────────────

function toM2(widthMm: number, heightMm: number): number {
  return (widthMm * heightMm) / 1_000_000;
}

function applyEdgeAllowances(
  widthMm: number,
  heightMm: number,
  edges: { top: number; bottom: number; left: number; right: number },
  enabled: boolean
): { widthMm: number; heightMm: number } {
  if (!enabled) {
    return { widthMm, heightMm };
  }
  return {
    widthMm: widthMm + edges.left + edges.right,
    heightMm: heightMm + edges.top + edges.bottom,
  };
}

function makeDimension(label: string, widthMm: number, heightMm: number): DimensionStage {
  return {
    label,
    widthMm: Math.round(widthMm * 100) / 100,
    heightMm: Math.round(heightMm * 100) / 100,
    areaM2: Math.round(toM2(widthMm, heightMm) * 1_000_000) / 1_000_000,
  };
}

// ─── Calculation pipeline ────────────────────────────────────────────────

export class RecipeEngine {
  /**
   * Run the full recipe calculation pipeline:
   *
   *   Net Size → Trim → Rodaj → Production Size
   *        ↓        ↓        ↓
   *   BOM Consumption  │  Fire Losses
   *                     ↓
   *               Product Output
   *
   * The engine resolves factory defaults vs recipe overrides,
   * then computes all derived quantities.
   */
  static calculate(input: RecipeEngineInput): RecipeEngineOutput {
    const { netWidthMm, netHeightMm, quantity, bomItems, fireItems, outputItems, factoryConfiguration } = input;

    // 1. Resolve settings
    const resolvedRodaj = resolveRodaj(input.rodaj, factoryConfiguration);
    const resolvedTrim = resolveTrim(input.trim, factoryConfiguration);

    // 2. Dimension pipeline: Net → After Rodaj = Production (Cut Size)
    // Note: Trim applies to Jumbo Plate (6000x3210mm), NOT to individual cut pieces.
    const net = makeDimension("Net", netWidthMm, netHeightMm);

    const afterRodajSize = applyEdgeAllowances(netWidthMm, netHeightMm, resolvedRodaj, resolvedRodaj.enabled);
    const afterRodaj = makeDimension("After Rodaj", afterRodajSize.widthMm, afterRodajSize.heightMm);

    // Production size for the individual piece is After Rodaj (Net + Rodaj allowance)
    const production = makeDimension("Production", afterRodajSize.widthMm, afterRodajSize.heightMm);

    // After Trim stage is kept for backward-compat output structure, but equals Net
    const afterTrim = makeDimension("After Trim", netWidthMm, netHeightMm);

    // 3. Totals
    const netAreaM2 = Math.round(net.areaM2 * quantity * 1_000_000) / 1_000_000;
    const productionAreaM2 = Math.round(production.areaM2 * quantity * 1_000_000) / 1_000_000;
    const totalGlassConsumptionM2 = productionAreaM2;

    // 4. BOM Consumption
    const consumedMaterials: CalculatedConsumedMaterial[] = bomItems.map((item: RecipeBomItem) => {
      let netQty: number;
      switch (item.consumptionBasis) {
        case "area":
          netQty = item.quantityPerUnit * productionAreaM2;
          break;
        case "perimeter":
          // Perimeter is calculated from NET dimensions (customer size), NOT cut size
          netQty = item.quantityPerUnit * (2 * (netWidthMm + netHeightMm) / 1000) * quantity;
          break;
        case "piece":
          netQty = item.quantityPerUnit * quantity;
          break;
        case "fixed":
          netQty = item.quantityPerUnit;
          break;
        case "duration":
          netQty = item.quantityPerUnit * quantity;
          break;
        default:
          netQty = item.quantityPerUnit * productionAreaM2;
      }
      const wasteQty = netQty * (item.wastePercentage / 100);
      const grossQty = netQty + wasteQty;

      return {
        materialId: item.materialId,
        materialCode: item.materialCode,
        materialName: item.materialName,
        consumptionBasis: item.consumptionBasis,
        netQuantity: Math.round(netQty * 1_000_000) / 1_000_000,
        wasteQuantity: Math.round(wasteQty * 1_000_000) / 1_000_000,
        grossQuantity: Math.round(grossQty * 1_000_000) / 1_000_000,
        unit: item.unit,
      };
    });

    // 5. Fire Losses
    const fireLosses: CalculatedFireLoss[] = fireItems.map((fire: RecipeFireItem) => {
      let lossAreaM2: number;
      if (fire.unit === "%") {
        lossAreaM2 = (fire.rate / 100) * productionAreaM2;
      } else {
        lossAreaM2 = fire.rate * quantity;
      }
      return {
        fireType: fire.fireType,
        fireTypeLabel: fire.fireTypeLabel,
        rate: fire.rate,
        unit: fire.unit,
        lossAreaM2: Math.round(lossAreaM2 * 1_000_000) / 1_000_000,
        lossPercentage: productionAreaM2 > 0 ? Math.round((lossAreaM2 / productionAreaM2) * 100_000) / 1000 : 0,
      };
    });

    const totalFireRate = fireItems.reduce((sum: number, f: RecipeFireItem) => {
      if (f.unit === "%") return sum + f.rate;
      return sum;
    }, 0);

    // 6. Product Output
    const producedProducts: CalculatedProduct[] = outputItems.map((item: RecipeOutputItem) => ({
      materialId: item.materialId,
      productCode: item.productCode,
      productName: item.productName,
      quantity: Math.round(item.quantityPerUnit * quantity * 1_000_000) / 1_000_000,
      unit: item.unit,
    }));

    // 7. Efficiency
    const efficiency = productionAreaM2 > 0 ? Math.round((netAreaM2 / productionAreaM2) * 100_000) / 100_000 : 0;

    return {
      dimensions: {
        net,
        afterTrim,
        afterRodaj,
        production,
      },
      totals: {
        netAreaM2,
        productionAreaM2,
        totalGlassConsumptionM2,
      },
      appliedSettings: {
        rodaj: resolvedRodaj,
        trim: resolvedTrim,
      },
      consumedMaterials,
      fireLosses,
      totalFireRate: Math.round(totalFireRate * 1000) / 1000,
      producedProducts,
      efficiency,
    };
  }
}
