-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: 0011_recipe_outputs_and_fires
-- Description: Add recipe_outputs (produced products) and recipe_fires (fire/scrap definitions) tables.
-- Also add waste_percentage column to recipe_items.
--
-- Tables added:
--   1. recipe_outputs   — products produced by this recipe (multi-output support)
--   2. recipe_fires     — fire/scrap definitions with calculation methods
--
-- Columns added:
--   recipe_items.waste_percentage — per-material waste percentage
-- ══════════════════════════════════════════════════════════════════════════════

-- Add waste_percentage to recipe_items
ALTER TABLE recipe_items
  ADD COLUMN IF NOT EXISTS waste_percentage NUMERIC(5, 2);

-- Create recipe_outputs table (produced products)
CREATE TABLE IF NOT EXISTS recipe_outputs (
  id CHAR(26) PRIMARY KEY,
  recipe_id CHAR(26) NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  product_id CHAR(26) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  quantity_per_unit NUMERIC(12, 6) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  sequence INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_outputs_recipe_sequence
  ON recipe_outputs(recipe_id, sequence);

-- Create recipe_fires table (fire/scrap definitions)
CREATE TABLE IF NOT EXISTS recipe_fires (
  id CHAR(26) PRIMARY KEY,
  recipe_id CHAR(26) NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,

  fire_type VARCHAR(50) NOT NULL,
  -- grinding | cutting | breakage | temper_loss | operator_loss | custom

  calculation_method VARCHAR(30) NOT NULL,
  -- percentage | per_edge_mm | per_axis_mm | fixed | custom

  rate NUMERIC(8, 4) NOT NULL,
  -- For percentage: 0.05 = 5%
  -- For per_edge_mm: mm amount per edge
  -- For fixed: absolute quantity

  fire_stock_card_id CHAR(26),
  -- Optional: if fire is tracked as a separate stock item (waste stock card)

  sequence INTEGER NOT NULL,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_fires_recipe_sequence
  ON recipe_fires(recipe_id, sequence);
