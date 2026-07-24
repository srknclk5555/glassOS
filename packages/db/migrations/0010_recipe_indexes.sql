-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: 0010_recipe_indexes
-- Description: Add missing unique indexes for recipe tables
--
-- These indexes were documented in the schema comments but never generated
-- in the initial migration (0000_brave_gideon.sql).
--
-- Indexes added:
--   1. idx_recipes_tenant_code          — UNIQUE on recipes(tenant_id, recipe_code)
--   2. idx_recipe_items_recipe_sequence — UNIQUE on recipe_items(recipe_id, sequence)
--   3. idx_recipe_operations_recipe_seq — UNIQUE on recipe_operations(recipe_id, sequence)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE UNIQUE INDEX IF NOT EXISTS idx_recipes_tenant_code
ON recipes(tenant_id, recipe_code);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_items_recipe_sequence
ON recipe_items(recipe_id, sequence);

CREATE UNIQUE INDEX IF NOT EXISTS idx_recipe_operations_recipe_sequence
ON recipe_operations(recipe_id, sequence);
