// ─── Identity & Organization (Sprint 2.4.1) ───────────────────────────────────
export * from "./core";           // tenants, roles, permissions
export * from "./factories";      // factories
export * from "./users";          // users, user_sessions
export * from "./role-permissions"; // role_permissions
export * from "./personnel";      // personnel + all sub-tables

// ─── Customer (Sprint 2.4.2) ─────────────────────────────────────────────────
export * from "./customers";      // customers, customer_contacts, customer_delivery_points

// ─── Machine & Station (Sprint 2.4.2) ────────────────────────────────────────
export * from "./machines";       // machines, machine_maintenance_logs, machine_spare_parts, machine_consumables
export * from "./stations";       // stations, station_machine_assignments, station_personnel_assignments

// ─── Material, Product & Recipe (Sprint 2.4.2) ───────────────────────────────
export * from "./materials-products"; // materials, material_unit_profiles, products, product_categories
export * from "./recipes";            // recipes, recipe_items, recipe_operations, recipe_rules, recipe_versions

// ─── Inventory (Sprint 2.4.2) ────────────────────────────────────────────────
export * from "./inventory";      // inventory_locations, inventory_items, inventory_lots, inventory_barcodes

// ─── Order (Sprint 2.4.2) ────────────────────────────────────────────────────
export * from "./orders";         // orders, order_lines, order_notes

// ─── Production (Sprint 2.4.2) ───────────────────────────────────────────────
export * from "./production";        // production_orders, production_events, production_breakage_events, cutting_results, cutting_result_items
export * from "./production-queue";  // production_operations, production_queues, production_queue_items

// ─── Rework & Breakage (Sprint 2.4.2) ────────────────────────────────────────
export * from "./rework";         // rework_orders, fire_inventory_items, rework_history

// ─── Factory Configuration (Sprint 2.4.2) ────────────────────────────────────
export * from "./factory-config"; // factory_configurations, grinding_profiles, trim_profiles, remnant_thresholds

// ─── Audit Log (Sprint 2.4.2) ────────────────────────────────────────────────
export * from "./audit-log";      // audit_logs
