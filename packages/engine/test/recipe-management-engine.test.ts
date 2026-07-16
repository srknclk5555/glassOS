import { describe, expect, it } from "vitest";
import { RecipeManagementEngine } from "../src/index.js";

describe("RecipeManagementEngine", () => {
  it("creates a recipe with materials and ordered operations", () => {
    const recipe = RecipeManagementEngine.createRecipe({
      recipeCode: "RC-1001",
      productName: "Tempered IGU",
      description: "Temperlenmiş ısıcam",
      status: "ACTIVE",
    });

    const withMaterials = RecipeManagementEngine.addMaterial(recipe, {
      materialCode: "MAT-1001",
      name: "Float 4 mm",
      quantity: 1,
      unit: "m2",
    });

    const withOperations = RecipeManagementEngine.addOperation(withMaterials, {
      operationCode: "TEMPERING",
      name: "Tempering",
      sequence: 1,
    });

    const withSecondOperation = RecipeManagementEngine.addOperation(withOperations, {
      operationCode: "QUALITY",
      name: "Quality",
      sequence: 2,
    });

    expect(recipe.productName).toBe("Tempered IGU");
    expect(withMaterials.materials).toHaveLength(1);
    expect(withSecondOperation.operations).toHaveLength(2);
    expect(withSecondOperation.operations[0]?.sequence).toBe(1);
    expect(withSecondOperation.operations[1]?.sequence).toBe(2);
  });

  it("stores operation rules for production knowledge", () => {
    const recipe = RecipeManagementEngine.createRecipe({
      recipeCode: "RC-1002",
      productName: "Low-E IGU",
      description: "Low-E ısıcam",
      status: "ACTIVE",
    });

    const withRule = RecipeManagementEngine.addOperationRule(recipe, {
      ruleCode: "LOW_E_ORIENTATION",
      description: "Low-E orientation must be preserved",
      isRequired: true,
    });

    expect(withRule.operationRules).toHaveLength(1);
    expect(withRule.operationRules[0]?.ruleCode).toBe("LOW_E_ORIENTATION");
  });

  it("stores capacity rules as metadata only", () => {
    const recipe = RecipeManagementEngine.createRecipe({
      recipeCode: "RC-1003",
      productName: "Tempered Glass",
      description: "Temperlenmiş cam",
      status: "ACTIVE",
    });

    const withCapacityRule = RecipeManagementEngine.addCapacityRule(recipe, {
      operationCode: "TEMPERING",
      multiplier: 2,
      description: "Temper operation requires double capacity",
    });

    expect(withCapacityRule.capacityRules).toHaveLength(1);
    expect(withCapacityRule.capacityRules[0]?.multiplier).toBe(2);
  });

  it("stores consumption definitions without inventory logic", () => {
    const recipe = RecipeManagementEngine.createRecipe({
      recipeCode: "RC-1004",
      productName: "Laminated Glass",
      description: "Lamine cam",
      status: "ACTIVE",
    });

    const withConsumptionRule = RecipeManagementEngine.addConsumptionRule(recipe, {
      sourceMaterialCode: "MAT-2001",
      targetMaterialCode: "MAT-2002",
      quantity: 2,
      unit: "m2",
      description: "Two square meters of float for each finished square meter",
    });

    expect(withConsumptionRule.consumptionRules).toHaveLength(1);
    expect(withConsumptionRule.consumptionRules[0]?.quantity).toBe(2);
  });

  it("stores validation models for recipe integrity", () => {
    const recipe = RecipeManagementEngine.createRecipe({
      recipeCode: "RC-1005",
      productName: "Float Glass",
      description: "Standart cam",
      status: "ACTIVE",
    });

    const withValidation = RecipeManagementEngine.addValidation(recipe, {
      validationCode: "MISSING_OPERATION",
      description: "Recipe is missing a required operation",
      severity: "WARNING",
    });

    expect(withValidation.validations).toHaveLength(1);
    expect(withValidation.validations[0]?.validationCode).toBe("MISSING_OPERATION");
  });

  it("supports versioned recipes with a single active version", () => {
    const recipe = RecipeManagementEngine.createRecipe({
      recipeCode: "RC-1006",
      productName: "Tempered IGU",
      description: "Versioned recipe",
      status: "ACTIVE",
    });

    const withVersionOne = RecipeManagementEngine.addVersion(recipe, {
      versionNumber: 1,
      effectiveDate: "2026-01-01",
      notes: "Initial version",
      isActive: true,
    });

    const withVersionTwo = RecipeManagementEngine.addVersion(withVersionOne, {
      versionNumber: 2,
      effectiveDate: "2026-07-01",
      notes: "Updated version",
      isActive: true,
    });

    expect(withVersionTwo.versions).toHaveLength(2);
    expect(withVersionTwo.versions.find((version) => version.versionNumber === 2)?.isActive).toBe(true);
    expect(withVersionTwo.versions.find((version) => version.versionNumber === 1)?.isActive).toBe(false);
  });

  it("supports BOM item types and formulas", () => {
    const recipe = RecipeManagementEngine.createRecipe({
      recipeCode: "RC-1007",
      productName: "IGU Unit",
      description: "BOM example",
      status: "ACTIVE",
    });

    const withItem = RecipeManagementEngine.addRecipeItem(recipe, {
      materialCode: "MAT-3001",
      name: "Spacer",
      quantity: 1,
      unit: "m",
      itemType: "AUXILIARY_MATERIAL",
      formula: "Quantity per piece",
    });

    expect(withItem.items).toHaveLength(1);
    expect(withItem.items[0]?.itemType).toBe("AUXILIARY_MATERIAL");
    expect(withItem.items[0]?.formula).toBe("Quantity per piece");
  });

  it("validates inactive recipes, duplicate items and invalid quantities", () => {
    const recipe = RecipeManagementEngine.createRecipe({
      recipeCode: "RC-1008",
      productName: "Inactive Recipe",
      description: "Validation test",
      status: "INACTIVE",
    });

    const withFirstItem = RecipeManagementEngine.addRecipeItem(recipe, {
      materialCode: "MAT-4001",
      name: "Float 4 mm",
      quantity: 1,
      unit: "m2",
      itemType: "RAW_MATERIAL",
    });

    const withDuplicateItem = RecipeManagementEngine.addRecipeItem(withFirstItem, {
      materialCode: "MAT-4001",
      name: "Float 4 mm",
      quantity: 1,
      unit: "m2",
      itemType: "RAW_MATERIAL",
    });

    const withInvalidQuantity = RecipeManagementEngine.addRecipeItem(withDuplicateItem, {
      materialCode: "MAT-4002",
      name: "Argon",
      quantity: -1,
      unit: "m3",
      itemType: "CONSUMABLE",
    });

    const validations = RecipeManagementEngine.validateRecipe(withInvalidQuantity);

    expect(validations.some((validation) => validation.validationCode === "INACTIVE_RECIPE")).toBe(true);
    expect(validations.some((validation) => validation.validationCode === "DUPLICATE_ITEM")).toBe(true);
    expect(validations.some((validation) => validation.validationCode === "INVALID_QUANTITY")).toBe(true);
  });
});
