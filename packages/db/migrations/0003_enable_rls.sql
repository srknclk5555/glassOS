# GlassOS RLS Migration 0003 - HARDENED
# FORCE ROW LEVEL SECURITY + explicit WITH CHECK on all policies
#
# === SECTION 1: 23 tables WITH direct tenant_id ===

ALTER TABLE factories ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE factories FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_factories ON factories
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE users FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_users ON users
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE personnel_titles ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE personnel_titles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_personnel_titles ON personnel_titles
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE personnel ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE personnel FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_personnel ON personnel
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_customers ON customers
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE machines ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE machines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_machines ON machines
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE stations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_stations ON stations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE materials FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_materials ON materials
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE products ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE products FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_products ON products
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE product_categories FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_product_categories ON product_categories
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE recipes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_recipes ON recipes
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE inventory_locations ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE inventory_locations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_inventory_locations ON inventory_locations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE inventory_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_inventory_items ON inventory_items
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE orders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_orders ON orders
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE production_orders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_production_orders ON production_orders
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE production_events ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE production_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_production_events ON production_events
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE cutting_results ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE cutting_results FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_cutting_results ON cutting_results
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE production_operations ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE production_operations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_production_operations ON production_operations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE production_queues ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE production_queues FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_production_queues ON production_queues
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE rework_orders ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE rework_orders FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_rework_orders ON rework_orders
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE fire_inventory_items ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE fire_inventory_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_fire_inventory_items ON fire_inventory_items
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE factory_configurations ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE factory_configurations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_factory_configurations ON factory_configurations
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true)::char(26))
  WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::char(26));

# === SECTION 2: 26 EXISTS-through-parent tables ===

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE emergency_contacts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_emergency_contacts ON emergency_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.id = emergency_contacts.personnel_id
        AND personnel.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.id = emergency_contacts.personnel_id
        AND personnel.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE personnel_health_information ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE personnel_health_information FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_personnel_health_information ON personnel_health_information
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.id = personnel_health_information.personnel_id
        AND personnel.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.id = personnel_health_information.personnel_id
        AND personnel.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE personnel_shifts ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE personnel_shifts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_personnel_shifts ON personnel_shifts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.id = personnel_shifts.personnel_id
        AND personnel.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.id = personnel_shifts.personnel_id
        AND personnel.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE personnel_certificates ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE personnel_certificates FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_personnel_certificates ON personnel_certificates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.id = personnel_certificates.personnel_id
        AND personnel.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.id = personnel_certificates.personnel_id
        AND personnel.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE personnel_station_permissions ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE personnel_station_permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_personnel_station_permissions ON personnel_station_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.id = personnel_station_permissions.personnel_id
        AND personnel.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.id = personnel_station_permissions.personnel_id
        AND personnel.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE personnel_machine_assignments ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE personnel_machine_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_personnel_machine_assignments ON personnel_machine_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.id = personnel_machine_assignments.personnel_id
        AND personnel.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM personnel
      WHERE personnel.id = personnel_machine_assignments.personnel_id
        AND personnel.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE customer_contacts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_customer_contacts ON customer_contacts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_contacts.customer_id
        AND customers.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_contacts.customer_id
        AND customers.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE customer_delivery_points ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE customer_delivery_points FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_customer_delivery_points ON customer_delivery_points
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_delivery_points.customer_id
        AND customers.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_delivery_points.customer_id
        AND customers.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE machine_maintenance_logs ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE machine_maintenance_logs FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_machine_maintenance_logs ON machine_maintenance_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM machines
      WHERE machines.id = machine_maintenance_logs.machine_id
        AND machines.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM machines
      WHERE machines.id = machine_maintenance_logs.machine_id
        AND machines.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE machine_spare_parts ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE machine_spare_parts FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_machine_spare_parts ON machine_spare_parts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM machines
      WHERE machines.id = machine_spare_parts.machine_id
        AND machines.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM machines
      WHERE machines.id = machine_spare_parts.machine_id
        AND machines.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE machine_consumables ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE machine_consumables FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_machine_consumables ON machine_consumables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM machines
      WHERE machines.id = machine_consumables.machine_id
        AND machines.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM machines
      WHERE machines.id = machine_consumables.machine_id
        AND machines.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE station_machine_assignments ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE station_machine_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_station_machine_assignments ON station_machine_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stations
      WHERE stations.id = station_machine_assignments.station_id
        AND stations.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stations
      WHERE stations.id = station_machine_assignments.station_id
        AND stations.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE station_personnel_assignments ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE station_personnel_assignments FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_station_personnel_assignments ON station_personnel_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM stations
      WHERE stations.id = station_personnel_assignments.station_id
        AND stations.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stations
      WHERE stations.id = station_personnel_assignments.station_id
        AND stations.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE material_unit_profiles ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE material_unit_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_material_unit_profiles ON material_unit_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_unit_profiles.material_id
        AND materials.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM materials
      WHERE materials.id = material_unit_profiles.material_id
        AND materials.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE recipe_items ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE recipe_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_recipe_items ON recipe_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_items.recipe_id
        AND recipes.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_items.recipe_id
        AND recipes.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE recipe_operations ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE recipe_operations FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_recipe_operations ON recipe_operations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_operations.recipe_id
        AND recipes.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_operations.recipe_id
        AND recipes.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE recipe_rules ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE recipe_rules FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_recipe_rules ON recipe_rules
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_rules.recipe_id
        AND recipes.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_rules.recipe_id
        AND recipes.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE recipe_versions ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE recipe_versions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_recipe_versions ON recipe_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_versions.recipe_id
        AND recipes.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM recipes
      WHERE recipes.id = recipe_versions.recipe_id
        AND recipes.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE order_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_order_lines ON order_lines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_lines.order_id
        AND orders.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_lines.order_id
        AND orders.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE order_notes ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE order_notes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_order_notes ON order_notes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_notes.order_id
        AND orders.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_notes.order_id
        AND orders.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE inventory_lots ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE inventory_lots FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_inventory_lots ON inventory_lots
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM inventory_items
      WHERE inventory_items.id = inventory_lots.inventory_item_id
        AND inventory_items.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory_items
      WHERE inventory_items.id = inventory_lots.inventory_item_id
        AND inventory_items.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE inventory_barcodes ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE inventory_barcodes FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_inventory_barcodes ON inventory_barcodes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM inventory_items
      WHERE inventory_items.id = inventory_barcodes.inventory_item_id
        AND inventory_items.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM inventory_items
      WHERE inventory_items.id = inventory_barcodes.inventory_item_id
        AND inventory_items.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE production_breakage_events ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE production_breakage_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_production_breakage_events ON production_breakage_events
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM production_orders
      WHERE production_orders.id = production_breakage_events.production_order_id
        AND production_orders.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM production_orders
      WHERE production_orders.id = production_breakage_events.production_order_id
        AND production_orders.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE cutting_result_items ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE cutting_result_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_cutting_result_items ON cutting_result_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM cutting_results
      WHERE cutting_results.id = cutting_result_items.cutting_result_id
        AND cutting_results.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM cutting_results
      WHERE cutting_results.id = cutting_result_items.cutting_result_id
        AND cutting_results.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE production_queue_items ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE production_queue_items FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_production_queue_items ON production_queue_items
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM production_queues
      WHERE production_queues.id = production_queue_items.production_queue_id
        AND production_queues.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM production_queues
      WHERE production_queues.id = production_queue_items.production_queue_id
        AND production_queues.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE rework_history ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE rework_history FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_rework_history ON rework_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM rework_orders
      WHERE rework_orders.id = rework_history.rework_order_id
        AND rework_orders.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM rework_orders
      WHERE rework_orders.id = rework_history.rework_order_id
        AND rework_orders.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

# === SECTION 3: 3 factory-scoped tables ===

ALTER TABLE grinding_profiles ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE grinding_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_grinding_profiles ON grinding_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM factories
      WHERE factories.id = grinding_profiles.factory_id
        AND factories.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM factories
      WHERE factories.id = grinding_profiles.factory_id
        AND factories.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE trim_profiles ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE trim_profiles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_trim_profiles ON trim_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM factories
      WHERE factories.id = trim_profiles.factory_id
        AND factories.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM factories
      WHERE factories.id = trim_profiles.factory_id
        AND factories.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

ALTER TABLE remnant_thresholds ENABLE ROW LEVEL SECURITY;
# FORCE: apply RLS to table owner as well (defense in depth)
ALTER TABLE remnant_thresholds FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_remnant_thresholds ON remnant_thresholds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM factories
      WHERE factories.id = remnant_thresholds.factory_id
        AND factories.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM factories
      WHERE factories.id = remnant_thresholds.factory_id
        AND factories.tenant_id = current_setting('app.current_tenant_id', true)::char(26)
    )
  );

# === Verification ===

-- Tables with FORCE RLS (should list all 52)
SELECT tablename FROM pg_tables t
  JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
  AND c.relforcerowsecurity = true
ORDER BY t.tablename;

-- Policies with explicit WITH CHECK (must match total policies)
SELECT tablename, policyname, with_check IS NOT NULL AS has_with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
