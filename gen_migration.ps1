$ErrorActionPreference = "Stop"
$outFile = "packages\db\migrations\0003_enable_rls.sql"
$lines = New-Object System.Collections.ArrayList

function Add([string]$line) { [void]$lines.Add($line) }

Add "# GlassOS RLS Migration 0003 - HARDENED"
Add "# FORCE ROW LEVEL SECURITY + explicit WITH CHECK on all policies"
Add "#"

# SECTION 1: Direct tenant_id tables (23)
$direct = @(
    "factories","users","personnel_titles","personnel","customers",
    "machines","stations","materials","products","product_categories",
    "recipes","inventory_locations","inventory_items","orders",
    "production_orders","production_events","cutting_results",
    "production_operations","production_queues","rework_orders",
    "fire_inventory_items","factory_configurations","audit_logs"
)

Add "# === SECTION 1: 23 tables WITH direct tenant_id ==="
Add ""

foreach ($t in $direct) {
    Add "ALTER TABLE $t ENABLE ROW LEVEL SECURITY;"
    Add "# FORCE: apply RLS to table owner as well (defense in depth)"
    Add "ALTER TABLE $t FORCE ROW LEVEL SECURITY;"
    Add "CREATE POLICY tenant_isolation_$t ON $t"
    Add "  FOR ALL"
    Add "  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))"
    Add "  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));"
    Add ""
}

# SECTION 2: EXISTS-through-parent tables (26)
Add "# === SECTION 2: 26 EXISTS-through-parent tables ==="
Add ""

$existsTables = @(
    @("emergency_contacts","personnel","personnel_id"),
    @("personnel_health_information","personnel","personnel_id"),
    @("personnel_shifts","personnel","personnel_id"),
    @("personnel_certificates","personnel","personnel_id"),
    @("personnel_station_permissions","personnel","personnel_id"),
    @("personnel_machine_assignments","personnel","personnel_id"),
    @("customer_contacts","customers","customer_id"),
    @("customer_delivery_points","customers","customer_id"),
    @("machine_maintenance_logs","machines","machine_id"),
    @("machine_spare_parts","machines","machine_id"),
    @("machine_consumables","machines","machine_id"),
    @("station_machine_assignments","stations","station_id"),
    @("station_personnel_assignments","stations","station_id"),
    @("material_unit_profiles","materials","material_id"),
    @("recipe_items","recipes","recipe_id"),
    @("recipe_operations","recipes","recipe_id"),
    @("recipe_rules","recipes","recipe_id"),
    @("recipe_versions","recipes","recipe_id"),
    @("order_lines","orders","order_id"),
    @("order_notes","orders","order_id"),
    @("inventory_lots","inventory_items","inventory_item_id"),
    @("inventory_barcodes","inventory_items","inventory_item_id"),
    @("production_breakage_events","production_orders","production_order_id"),
    @("cutting_result_items","cutting_results","cutting_result_id"),
    @("production_queue_items","production_queues","production_queue_id"),
    @("rework_history","rework_orders","rework_order_id")
)

foreach ($e in $existsTables) {
    $t = $e[0]; $p = $e[1]; $fk = $e[2]
    Add "ALTER TABLE $t ENABLE ROW LEVEL SECURITY;"
    Add "# FORCE: apply RLS to table owner as well (defense in depth)"
    Add "ALTER TABLE $t FORCE ROW LEVEL SECURITY;"
    Add "CREATE POLICY tenant_isolation_$t ON $t"
    Add "  FOR ALL"
    Add "  USING ("
    Add "    EXISTS ("
    Add "      SELECT 1 FROM $p"
    Add "      WHERE $p.id = $t.$fk"
    Add "        AND $p.tenant_id = current_setting('app.current_tenant_id', true)::char(26)"
    Add "    )"
    Add "  )"
    Add "  WITH CHECK ("
    Add "    EXISTS ("
    Add "      SELECT 1 FROM $p"
    Add "      WHERE $p.id = $t.$fk"
    Add "        AND $p.tenant_id = current_setting('app.current_tenant_id', true)::char(26)"
    Add "    )"
    Add "  );"
    Add ""
}

# SECTION 3: Factory-scoped tables (3)
Add "# === SECTION 3: 3 factory-scoped tables ==="
Add ""

$factoryTables = @(
    @("grinding_profiles","factory_id"),
    @("trim_profiles","factory_id"),
    @("remnant_thresholds","factory_id")
)

foreach ($f in $factoryTables) {
    $t = $f[0]; $fk = $f[1]
    Add "ALTER TABLE $t ENABLE ROW LEVEL SECURITY;"
    Add "# FORCE: apply RLS to table owner as well (defense in depth)"
    Add "ALTER TABLE $t FORCE ROW LEVEL SECURITY;"
    Add "CREATE POLICY tenant_isolation_$t ON $t"
    Add "  FOR ALL"
    Add "  USING ("
    Add "    EXISTS ("
    Add "      SELECT 1 FROM factories"
    Add "      WHERE factories.id = $t.$fk"
    Add "        AND factories.tenant_id = current_setting('app.current_tenant_id', true)::char(26)"
    Add "    )"
    Add "  )"
    Add "  WITH CHECK ("
    Add "    EXISTS ("
    Add "      SELECT 1 FROM factories"
    Add "      WHERE factories.id = $t.$fk"
    Add "        AND factories.tenant_id = current_setting('app.current_tenant_id', true)::char(26)"
    Add "    )"
    Add "  );"
    Add ""
}

# Verification queries
Add "# === Verification ==="
Add ""
Add "-- Tables with FORCE RLS (should list all 52)"
Add "SELECT tablename FROM pg_tables t"
Add "  JOIN pg_class c ON c.relname = t.tablename"
Add "WHERE t.schemaname = 'public'"
Add "  AND c.relforcerowsecurity = true"
Add "ORDER BY t.tablename;"
Add ""
Add "-- Policies with explicit WITH CHECK (must match total policies)"
Add "SELECT tablename, policyname, with_check IS NOT NULL AS has_with_check"
Add "FROM pg_policies"
Add "WHERE schemaname = 'public'"
Add "ORDER BY tablename, policyname;"

($lines -join "`r`n") | Set-Content $outFile -Encoding utf8
Write-Host "DONE. Lines: $($lines.Count)  Size: $((Get-Item $outFile).Length) bytes"
