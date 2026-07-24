// ─── Identity & Organization (Sprint 2.4.1) ───────────────────────────────────
export * from "./core";           // tenants, roles, permissions
export * from "./factories";      // factories
export * from "./users";          // users, user_sessions
export * from "./role-permissions"; // role_permissions
export * from "./personnel";      // personnel + all sub-tables

// ─── Customer (Sprint 2.4.2) ─────────────────────────────────────────────────
export * from "./customers";      // customers, customer_contacts
export * from "./customer-entities"; // customer_glass_catalog, customer_instructions, customer_instruction_conditions

// ─── Machine & Station (Sprint 2.4.2) ────────────────────────────────────────
export * from "./machines";       // machines, machine_maintenance_logs, machine_spare_parts, machine_consumables
export * from "./stations";       // stations, station_machine_assignments, station_personnel_assignments

// ─── Material, Product & Recipe (Sprint 2.4.2) ───────────────────────────────
export * from "./materials-products"; // materials, material_unit_profiles, products, product_categories
export * from "./recipes";            // recipes, recipe_items, recipe_operations, recipe_rules, recipe_outputs, recipe_fires, recipe_versions

// ─── Inventory (Sprint 2.4.2) ────────────────────────────────────────────────
export * from "./inventory";      // inventory_locations, inventory_items, inventory_lots, inventory_barcodes

// ─── Order (Sprint 2.4.2) ────────────────────────────────────────────────────
export * from "./orders";         // orders, order_lines, order_notes

// ─── Production (Sprint 2.4.2) ───────────────────────────────────────────────
export * from "./production";        // production_orders, production_events, production_breakage_events, cutting_results, cutting_result_items
export * from "./production-queue";  // production_operations, production_queues, production_queue_items

// ─── Production Record (Sprint 6.0.0) ────────────────────────────────────────
export * from "./production-record"; // production_records

// ─── Rework & Breakage (Sprint 2.4.2) ────────────────────────────────────────
export * from "./rework";         // rework_orders, fire_inventory_items, rework_history

// ─── Factory Configuration (Sprint 2.4.2) ────────────────────────────────────
export * from "./factory-config"; // factory_configurations, grinding_profiles, trim_profiles, remnant_thresholds

// ─── Manufacturing Order (Sprint 8.1) ────────────────────────────────────────
export * from "./manufacturing-orders"; // manufacturing_orders, manufacturing_order_items

// ─── Settings (Factory-level operational settings) ────────────────────────────
export * from "./settings";       // settings

// ─── Delivery Points (Customer delivery addresses) ────────────────────────────
export * from "./delivery-points"; // delivery_points

// ─── Material Categories & Packaging ─────────────────────────────────────────
export * from "./material-categories";  // material_categories
export * from "./material-packagings";  // material_packagings

// ─── Warehouse (Sprint 2.9.0) ────────────────────────────────────────────────
export * from "./warehouses";     // warehouses

// ─── Material Master (Sprint 2.9.0) ──────────────────────────────────────────
export * from "./materials-master"; // materials_master, material_tags, material_tag_map

// ─── Material Colors (Sprint 2.10.x) ──────────────────────────────────────
export * from "./material-colors"; // material_colors

// ─── Custom Code Definitions (Sprint 2.10.3) ─────────────────────────────────
export * from "./custom-code-definitions"; // custom_code_definitions

// ─── Goods Receipt (Sprint 2.10.0) ───────────────────────────────────────────
export * from "./goods-receipt";  // goods_receipts, goods_receipt_items, goods_receipt_attachments, goods_receipt_plates

// ─── Audit Log (Sprint 2.4.2) ────────────────────────────────────────────────
export * from "./audit-log";      // audit_logs
