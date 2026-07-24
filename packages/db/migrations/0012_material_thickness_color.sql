-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: 0012_material_thickness_color
-- Description: Add thickness_mm and color columns to materials_master table
--
-- These columns are used for:
--   1. Material selection dialogs to display physical attributes
--   2. Goods receipt item dimension auto-calculation
--   3. Production planning (thickness-based machine selection)
--
-- Columns added:
--   materials_master.thickness_mm  — NUMERIC(5,2), material thickness in mm
--   materials_master.color         — VARCHAR(100), material color name
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE materials_master
  ADD COLUMN IF NOT EXISTS thickness_mm NUMERIC(5, 2);

ALTER TABLE materials_master
  ADD COLUMN IF NOT EXISTS color VARCHAR(100);

-- ─── Material Colors Lookup Table ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS material_colors (
  id CHAR(26) PRIMARY KEY,
  tenant_id CHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
  name VARCHAR(100) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL,
  created_by CHAR(26),
  updated_by CHAR(26),
  CONSTRAINT uq_material_colors_tenant_name UNIQUE (tenant_id, name)
);
