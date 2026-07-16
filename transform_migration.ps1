# GlassOS RLS Migration Complete Regeneration - Sprint 2.6.4A
# FORCE ROW LEVEL SECURITY + explicit WITH CHECK on all 52 policies
$ErrorActionPreference = "Stop"
$outFile = "C:\Users\srknc\Desktop\FABRİKA\glassos\packages\db\migrations\0003_enable_rls.sql"

$header = @"
-- ──────────────────────────────────────────────────────────────────────────────
-- GlassOS RLS Migration 0003
-- Enable Row Level Security on all tenant-scoped tables
--
-- Policy pattern: tenant_isolation_{table}
-- All policies rely ONLY on: current_setting('app.current_tenant_id', true)
--
-- Applied by: glassos_owner (migration role)
-- Enforced for: glassos_app (NOBYPASSRLS)
-- ──────────────────────────────────────────────────────────────────────────────

"@

$section1Header = @"
-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 1: Tables WITH direct tenant_id column
-- Policy: tenant_id = current_setting('app.current_tenant_id', true)
-- ══════════════════════════════════════════════════════════════════════════════

"@

$section2Header = @"
-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 2: Tables WITHOUT tenant_id → EXISTS subquery via owned-by-parent
-- Policy: EXISTS (SELECT 1 FROM parent WHERE parent.id = child.parent_id
--                  AND parent.tenant_id = current_setting(...))
-- ══════════════════════════════════════════════════════════════════════════════

"@

$section3Header = @"
-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 3: Factory-scoped tables
-- Policy: EXISTS (SELECT 1 FROM factories WHERE factories.id = factory_id
--                  AND factories.tenant_id = current_setting(...))
-- ══════════════════════════════════════════════════════════════════════════════

"@

# ─── Helper: generate a SECTION 1 table block ───────────────────────────────
function Add-Table($name, $comment) {
    $lines = @()
    $lines += "-- ─── $($name) ─────────────────────────────────────────────────────────────"
    if ($comment) { $lines += $comment }
    $lines += "ALTER TABLE $name ENABLE ROW LEVEL SECURITY;"
    $lines += "-- FORCE: apply RLS to table owner as well (defense in depth)"
    $lines += "ALTER TABLE $name FORCE ROW LEVEL SECURITY;"
    $lines += "CREATE POLICY tenant_isolation_$name ON $name"
    $lines += "  FOR ALL"
    $lines += "  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))"
    $lines += "  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));"
    $lines += ""
    return $lines
}

# ─── Helper: generate a SECTION 2 table block (EXISTS via parent) ──────────
function Add-ExistsChild($name, $parentName, $fkColumn, $extraWhere) {
    $lines = @()
    $lines += "-- ─── $name → $parentName.$fkColumn ────────────────────────────────────"
    $lines += "ALTER TABLE $name ENABLE ROW LEVEL SECURITY;"
    $lines += "-- FORCE: apply RLS to table owner as well (defense in depth)"
    $lines += "ALTER TABLE $name FORCE ROW LEVEL SECURITY;"
    $lines += "CREATE POLICY tenant_isolation_$name ON $name"
    $lines += "  FOR ALL"
    $lines += "  USING ("
    $lines += "    EXISTS ("
    $lines += "      SELECT 1 FROM $parentName"
    $lines += "      WHERE $parentName.id = $name.$fkColumn"
    if ($extraWhere) { $lines += "        $extraWhere" }
    $lines += "        AND $parentName.tenant_id = current_setting('app.current_tenant_id', true)::char(26)"
    $lines += "    )"
    $lines += "  )"
    $lines += "  WITH CHECK ("
    $lines += "    EXISTS ("
    $lines += "      SELECT 1 FROM $parentName"
    $lines += "      WHERE $parentName.id = $name.$fkColumn"
    if ($extraWhere) { $lines += "        $extraWhere" }
    $lines += "        AND $parentName.tenant_id = current_setting('app.current_tenant_id', true)::char(26)"
    $lines += "    )"
    $lines += "  );"
    $lines += ""
    return $lines
}

# ─── Helper: generate a SECTION 3 table block (factory-scoped) ────────────
function Add-FactoryChild($name, $fkColumn) {
    $lines = @()
    $lines += "-- ─── $name → factories.$fkColumn ──────────────────────────────────"
    $lines += "ALTER TABLE $name ENABLE ROW LEVEL SECURITY;"
    $lines += "-- FORCE: apply RLS to table owner as well (defense in depth)"
    $lines += "ALTER TABLE $name FORCE ROW LEVEL SECURITY;"
    $lines += "CREATE POLICY tenant_isolation_$name ON $name"
    $lines += "  FOR ALL"
    $lines += "  USING ("
    $lines += "    EXISTS ("
    $lines += "      SELECT 1 FROM factories"
    $lines += "      WHERE factories.id = $name.$fkColumn"
    $lines += "        AND factories.tenant_id = current_setting('app.current_tenant_id', true)::char(26)"
    $lines += "    )"
    $lines += "  )"
    $lines += "  WITH CHECK ("
    $lines += "    EXISTS ("
    $lines += "      SELECT 1 FROM factories"
    $lines += "      WHERE factories.id = $name.$fkColumn"
    $lines += "        AND factories.tenant_id = current_setting('app.current_tenant_id', true)::char(26)"
    $lines += "    )"
    $lines += "  );"
    $lines += ""
    return $lines
}

# ──────────────────────────────────────────────────────────────────────────────
# BUILD THE ENTIRE FILE
# ──────────────────────────────────────────────────────────────────────────────
$all = @()

# Header
$all += $header

# ─── SECTION 1: 23 direct tenant_id tables ─────────────────────────────────
$all += $section1Header

$all += Add-Table "factories" $null
$all += Add-Table "users" "-- users (tenant_id is nullable — super admins have NULL)"
$all += Add-Table "personnel_titles" $null
$all += Add-Table "personnel" $null
$all += Add-Table "customers" $null
$all += Add-Table "machines" $null
$all += Add-Table "stations" $null
$all += Add-Table "materials" $null
$all += Add-Table "products" $null
$all += Add-Table "product_categories" $null
$all += Add-Table "recipes" $null
$all += Add-Table "inventory_locations" $null
$all += Add-Table "inventory_items" $null
$all += Add-Table "orders" $null
$all += Add-Table "production_orders" $null
$all += Add-Table "production_events" $null
$all += Add-Table "cutting_results" $null
$all += Add-Table "production_operations" $null
$all += Add-Table "production_queues" $null
$all += Add-Table "rework_orders" $null
$all += Add-Table "fire_inventory_items" $null
$all += Add-Table "factory_configurations" $null
$all += Add-Table "audit_logs" $null

# ─── SECTION 2: 26 EXISTS-through-parent tables ───────────────────────────
$all += $section2Header

# Personnel relationships
$all += Add-ExistsChild "emergency_contacts" "personnel" "personnel_id" $null
$all += Add-ExistsChild "personnel_health_information" "personnel" "personnel_id" $null
$all += Add-ExistsChild "personnel_shifts" "personnel" "personnel_id" $null
$all += Add-ExistsChild "personnel_certificates" "personnel" "personnel_id" $null
$all += Add-ExistsChild "personnel_station_permissions" "personnel" "personnel_id" $null
$all += Add-ExistsChild "personnel_machine_assignments" "personnel" "personnel_id" $null

# Customer relationships
$all += Add-ExistsChild "customer_contacts" "customers" "customer_id" $null
$all += Add-ExistsChild "customer_delivery_points" "customers" "customer_id" $null

# Machine relationships
$all += Add-ExistsChild "machine_maintenance_logs" "machines" "machine_id" $null
$all += Add-ExistsChild "machine_spare_parts" "machines" "machine_id" $null
$all += Add-ExistsChild "machine_consumables" "machines" "machine_id" $null

# Station relationships
$all += Add-ExistsChild "station_machine_assignments" "stations" "station_id" $null
$all += Add-ExistsChild "station_personnel_assignments" "stations" "station_id" $null

# Material relationships
$all += Add-ExistsChild "material_unit_profiles" "materials" "material_id" $null

# Recipe relationships
$all += Add-ExistsChild "recipe_items" "recipes" "recipe_id" $null
$all += Add-ExistsChild "recipe_operations" "recipes" "recipe_id" $null
$all += Add-ExistsChild "recipe_rules" "recipes" "recipe_id" $null
$all += Add-ExistsChild "recipe_versions" "recipes" "recipe_id" $null

# Order relationships
$all += Add-ExistsChild "order_lines" "orders" "order_id" $null
$all += Add-ExistsChild "order_notes" "orders" "order_id" $null

# Inventory relationships
$all += Add-ExistsChild "inventory_lots" "inventory_items" "inventory_item_id" $null
$all += Add-ExistsChild "inventory_barcodes" "inventory_items" "inventory_item_id" $null

# Production relationships
$all += Add-ExistsChild "production_breakage_events" "production_orders" "production_order_id" $null
$all += Add-ExistsChild "cutting_result_items" "cutting_results" "cutting_result_id" $null
$all += Add-ExistsChild "production_queue_items" "production_queues" "production_queue_id" $null
$all += Add-ExistsChild "rework_history" "rework_orders" "rework_order_id" $null

# ─── SECTION 3: 3 factory-scoped tables ──────────────────────────────────
$all += $section3Header

$all += Add-FactoryChild "grinding_profiles" "factory_id"
$all += Add-FactoryChild "trim_profiles" "factory_id"
$all += Add-FactoryChild "remnant_thresholds" "factory_id"

# ─── Verification queries ────────────────────────────────────────────────
$all += "-- ══════════════════════════════════════════════════════════════════════════════"
$all += "-- Verification: list all protected tables and policies"
$all += "-- ══════════════════════════════════════════════════════════════════════════════"
$all += ""
$all += "-- List all tables with RLS enabled"
$all += "SELECT schemaname, tablename, rowsecurity, FORCEREVOKE as force_rls"
$all += "FROM pg_tables"
$all += "LEFT JOIN pg_class ON pg_class.relname = pg_tables.tablename"
$all += "LEFT JOIN pg_policy ON pg_policy.polrelid = pg_class.oid"
$all += "WHERE schemaname = 'public'"
$all += "  AND tablename != '_prisma_migrations'"
$all += "ORDER BY tablename;"
$all += ""
$all += "-- List all RLS policies with their definitions"
$all += "SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check"
$all += "FROM pg_policies"
$all += "WHERE schemaname = 'public'"
$all += "ORDER BY tablename, policyname;"
$all += ""
$all += "-- Check which tables are missing RLS (should return 0 rows)"
$all += "SELECT tablename"
$all += "FROM pg_tables"
$all += "WHERE schemaname = 'public'"
$all += "  AND tablename NOT IN ('_prisma_migrations')"
$all += "  AND NOT rowsecurity"
$all += "ORDER BY tablename;"

# ─── Write the file ──────────────────────────────────────────────────────
($all -join "`r`n") | Set-Content $outFile -NoNewline
Write-Host "Migration file regenerated. Lines: $($all.Count)"
Write-Host "File size: $((Get-Item $outFile).Length) bytes"
