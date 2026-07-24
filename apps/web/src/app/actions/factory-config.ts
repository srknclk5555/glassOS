"use server";

import type { FactoryConfiguration } from "@repo/types";
import { requireSession } from "@/lib/session";
import type { AuthenticatedSession } from "@/lib/session";

/**
 * Returns the FactoryConfiguration for the current user's factory.
 * Reads from the factory_configurations key-value table.
 * Falls back to sensible defaults if no configuration is found.
 */
export async function getMyFactoryConfigurationAction(): Promise<FactoryConfiguration> {
  const session = await requireSession();
  const user = session.user as AuthenticatedSession["user"];
  const factoryId = user.selectedFactoryId ?? user.factoryId;

  if (!factoryId) {
    // No factory assigned — return defaults
    return getDefaultFactoryConfiguration();
  }

  try {
    // Dynamically import db to avoid bundling issues on server
    const { db, factoryConfigurations, eq, and } = await import("@repo/db");

    // Load trim configuration
    const trimRows = await db
      .select()
      .from(factoryConfigurations)
      .where(
        and(
          eq(factoryConfigurations.factoryId, factoryId),
          eq(factoryConfigurations.configType, "trim"),
        ),
      );

    // Load grinding (rodaj) configuration
    const grindingRows = await db
      .select()
      .from(factoryConfigurations)
      .where(
        and(
          eq(factoryConfigurations.factoryId, factoryId),
          eq(factoryConfigurations.configType, "grinding"),
        ),
      );

    // Parse stored values into typed config
    const getConfigValue = (rows: typeof trimRows, key: string, defaultVal: number): number => {
      const row = rows.find((r) => r.configKey === key);
      if (!row || !row.configValue) return defaultVal;
      const parsed = Number(row.configValue);
      return Number.isFinite(parsed) ? parsed : defaultVal;
    };

    const getConfigEnabled = (rows: typeof trimRows, defaultVal: boolean): boolean => {
      const row = rows.find((r) => r.configKey === "enabled");
      if (!row || !row.configValue) return defaultVal;
      return row.configValue === "true";
    };

    return {
      version: 1,
      trimConfiguration: {
        enabled: getConfigEnabled(trimRows, true),
        strategy: "PER_EDGE",
        leftMm: getConfigValue(trimRows, "leftMm", 10),
        rightMm: getConfigValue(trimRows, "rightMm", 10),
        topMm: getConfigValue(trimRows, "topMm", 10),
        bottomMm: getConfigValue(trimRows, "bottomMm", 10),
      },
      grindingConfiguration: {
        enabled: getConfigEnabled(grindingRows, true),
        strategy: "PER_EDGE",
        leftMm: getConfigValue(grindingRows, "leftMm", 2),
        rightMm: getConfigValue(grindingRows, "rightMm", 2),
        topMm: getConfigValue(grindingRows, "topMm", 1),
        bottomMm: getConfigValue(grindingRows, "bottomMm", 1),
      },
      remnantConfiguration: {
        enabled: true,
        minimumWidthMm: 200,
        minimumHeightMm: 200,
        minimumAreaMm2: 60000,
      },
      inventoryConfiguration: {
        inventoryValuationMethod: "SPECIFIC_IDENTIFICATION",
        allowLotSelection: false,
        allowSpecificIdentification: false,
        negativeStockPolicy: null,
        reservationPolicy: null,
      },
      kerfConfiguration: {
        enabled: true,
        value: 0,
        unit: "MM",
      },
      toleranceMatching: {
        widthMm: 10,
        heightMm: 10,
      },
    };
  } catch {
    // If DB read fails, return defaults
    return getDefaultFactoryConfiguration();
  }
}

function getDefaultFactoryConfiguration(): FactoryConfiguration {
  return {
    version: 1,
    trimConfiguration: {
      enabled: true,
      strategy: "PER_EDGE",
      leftMm: 10,
      rightMm: 10,
      topMm: 10,
      bottomMm: 10,
    },
    grindingConfiguration: {
      enabled: true,
      strategy: "PER_EDGE",
      leftMm: 2,
      rightMm: 2,
      topMm: 1,
      bottomMm: 1,
    },
    remnantConfiguration: {
      enabled: true,
      minimumWidthMm: 200,
      minimumHeightMm: 200,
      minimumAreaMm2: 60000,
    },
    inventoryConfiguration: {
      inventoryValuationMethod: "SPECIFIC_IDENTIFICATION",
      allowLotSelection: false,
      allowSpecificIdentification: false,
      negativeStockPolicy: null,
      reservationPolicy: null,
    },
    kerfConfiguration: {
      enabled: true,
      value: 0,
      unit: "MM",
    },
    toleranceMatching: {
      widthMm: 10,
      heightMm: 10,
    },
  };
}
