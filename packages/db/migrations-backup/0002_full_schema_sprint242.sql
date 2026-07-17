CREATE TABLE "audit_logs" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"table_name" varchar(100) NOT NULL,
	"record_id" varchar(26) NOT NULL,
	"operation" varchar(20) NOT NULL,
	"before_value" jsonb,
	"after_value" jsonb,
	"changed_by" char(26),
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reason" text,
	"workstation" varchar(255),
	"device" varchar(255),
	"ip_address" varchar(45),
	"is_manual_operation" boolean DEFAULT true NOT NULL,
	"is_system_operation" boolean DEFAULT false NOT NULL,
	"session_id" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "customer_contacts" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"customer_id" char(26) NOT NULL,
	"name" varchar(255) NOT NULL,
	"title" varchar(100),
	"phone" varchar(50),
	"email" varchar(255),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_delivery_points" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"customer_id" char(26) NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"city" varchar(100),
	"gps_lat" numeric(10, 7),
	"gps_lng" numeric(10, 7),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"customer_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"short_name" varchar(100),
	"tax_number" varchar(50),
	"tax_office" varchar(100),
	"phone" varchar(50),
	"email" varchar(255),
	"address" text,
	"city" varchar(100),
	"country" varchar(100),
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "factory_configurations" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26) NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" varchar(500),
	"config_type" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grinding_profiles" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"factory_id" char(26) NOT NULL,
	"machine_id" char(26),
	"product_type" varchar(50),
	"left_mm" numeric(5, 2) NOT NULL,
	"right_mm" numeric(5, 2) NOT NULL,
	"top_mm" numeric(5, 2) NOT NULL,
	"bottom_mm" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "remnant_thresholds" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"factory_id" char(26) NOT NULL,
	"minimum_width_mm" numeric(8, 2) NOT NULL,
	"minimum_height_mm" numeric(8, 2) NOT NULL,
	"minimum_area_m2" numeric(8, 4),
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trim_profiles" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"factory_id" char(26) NOT NULL,
	"material_id" char(26),
	"left_mm" numeric(5, 2) NOT NULL,
	"right_mm" numeric(5, 2) NOT NULL,
	"top_mm" numeric(5, 2) NOT NULL,
	"bottom_mm" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machine_consumables" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"machine_id" char(26) NOT NULL,
	"consumable_name" varchar(255) NOT NULL,
	"installed_at" date,
	"replaced_at" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machine_maintenance_logs" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"machine_id" char(26) NOT NULL,
	"maintenance_type" varchar(50) NOT NULL,
	"performed_at" date NOT NULL,
	"performed_by" char(26),
	"cost" numeric(12, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machine_spare_parts" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"machine_id" char(26) NOT NULL,
	"part_name" varchar(255) NOT NULL,
	"part_number" varchar(100),
	"supplier" varchar(255),
	"replaced_at" date,
	"cost" numeric(12, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "machines" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"station_id" char(26),
	"machine_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"machine_type" varchar(50) NOT NULL,
	"brand" varchar(100),
	"model" varchar(100),
	"serial_number" varchar(100),
	"manufacture_year" integer,
	"purchased_at" date,
	"commissioned_at" date,
	"warranty_starts_at" date,
	"warranty_ends_at" date,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"hourly_capacity" numeric(10, 2),
	"daily_capacity" numeric(10, 2),
	"max_glass_width_mm" numeric(8, 2),
	"max_glass_height_mm" numeric(8, 2),
	"max_thickness_mm" numeric(5, 2),
	"min_thickness_mm" numeric(5, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "station_machine_assignments" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"station_id" char(26) NOT NULL,
	"machine_id" char(26) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "station_personnel_assignments" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"station_id" char(26) NOT NULL,
	"personnel_id" char(26) NOT NULL,
	"is_head_operator" boolean DEFAULT false NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stations" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"station_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"station_type" varchar(50) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"max_concurrent_jobs" integer DEFAULT 1 NOT NULL,
	"max_machines" integer,
	"max_operators" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "material_unit_profiles" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"material_id" char(26) NOT NULL,
	"unit_type" varchar(20) NOT NULL,
	"conversion_factor" numeric(12, 6) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"material_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"glass_type" varchar(50),
	"thickness_mm" numeric(5, 2),
	"color" varchar(100),
	"manufacturer" varchar(255),
	"standard_width_mm" numeric(8, 2),
	"standard_height_mm" numeric(8, 2),
	"density_kg_m2" numeric(6, 3),
	"can_be_tempered" boolean DEFAULT false NOT NULL,
	"can_be_laminated" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"product_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"product_type" varchar(50) NOT NULL,
	"recipe_id" char(26),
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "recipe_items" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"recipe_id" char(26) NOT NULL,
	"material_id" char(26) NOT NULL,
	"consumption_basis" varchar(30) NOT NULL,
	"quantity_per_unit" numeric(12, 6) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"sequence" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_operations" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"recipe_id" char(26) NOT NULL,
	"operation_code" varchar(50) NOT NULL,
	"sequence" integer NOT NULL,
	"is_mandatory" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_rules" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"recipe_id" char(26) NOT NULL,
	"rule_type" varchar(100) NOT NULL,
	"rule_value" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_versions" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"recipe_id" char(26) NOT NULL,
	"version_number" integer NOT NULL,
	"snapshot_json" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"recipe_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"product_type" varchar(50),
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "inventory_barcodes" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"inventory_item_id" char(26) NOT NULL,
	"lot_id" char(26),
	"barcode" varchar(100) NOT NULL,
	"glass_barcode" varchar(100),
	"width_mm" numeric(8, 2),
	"height_mm" numeric(8, 2),
	"thickness_mm" numeric(5, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_barcodes_barcode_unique" UNIQUE("barcode")
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"inventory_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"inventory_type" varchar(50) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"material_id" char(26),
	"product_id" char(26),
	"location_id" char(26),
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "inventory_locations" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"location_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"location_type" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_lots" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"inventory_item_id" char(26) NOT NULL,
	"lot_number" varchar(100),
	"supplier_lot" varchar(100),
	"quantity" numeric(14, 4) NOT NULL,
	"remaining_quantity" numeric(14, 4) NOT NULL,
	"unit_cost" numeric(14, 4) NOT NULL,
	"currency" varchar(10) DEFAULT 'TRY' NOT NULL,
	"received_at" timestamp with time zone NOT NULL,
	"expiration_date" date,
	"status" varchar(30) DEFAULT 'active' NOT NULL,
	"barcode" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_lines" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"order_id" char(26) NOT NULL,
	"product_id" char(26) NOT NULL,
	"recipe_id" char(26),
	"width_mm" numeric(8, 2) NOT NULL,
	"height_mm" numeric(8, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"completed_quantity" integer DEFAULT 0 NOT NULL,
	"broken_quantity" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_notes" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"order_id" char(26) NOT NULL,
	"note_text" text NOT NULL,
	"is_internal" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"customer_id" char(26) NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"order_date" date NOT NULL,
	"due_date" date,
	"status" varchar(30) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "cutting_result_items" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"cutting_result_id" char(26) NOT NULL,
	"production_order_id" char(26) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cutting_results" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"station_id" char(26),
	"machine_id" char(26),
	"operator_id" char(26),
	"material_id" char(26),
	"sheets_planned" integer NOT NULL,
	"sheets_used" integer,
	"cutting_date" date NOT NULL,
	"batch_status" varchar(20) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_breakage_events" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"production_order_id" char(26) NOT NULL,
	"breakage_station_id" char(26),
	"breakage_machine_id" char(26),
	"breakage_operator_id" char(26),
	"breakage_reason" text,
	"breakage_category" varchar(30),
	"broken_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_events" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"production_order_id" char(26) NOT NULL,
	"event_type" varchar(30) NOT NULL,
	"from_operation" varchar(50),
	"to_operation" varchar(50),
	"station_id" char(26),
	"machine_id" char(26),
	"operator_id" char(26),
	"shift_id" char(26),
	"event_at" timestamp with time zone NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_orders" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"order_line_id" char(26) NOT NULL,
	"glass_barcode" varchar(100) NOT NULL,
	"width_mm" numeric(8, 2) NOT NULL,
	"height_mm" numeric(8, 2) NOT NULL,
	"production_width_mm" numeric(8, 2),
	"production_height_mm" numeric(8, 2),
	"product_type" varchar(50),
	"current_operation" varchar(50),
	"current_station_id" char(26),
	"current_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"is_rework" boolean DEFAULT false NOT NULL,
	"revision_number" integer DEFAULT 0 NOT NULL,
	"parent_id" char(26),
	"completed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "production_operations" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"operation_code" varchar(50) NOT NULL,
	"operation_name" varchar(100) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_queue_items" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"queue_id" char(26) NOT NULL,
	"production_order_id" char(26) NOT NULL,
	"entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"status" varchar(20) DEFAULT 'waiting' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "production_queues" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"station_id" char(26) NOT NULL,
	"operation_code" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fire_inventory_items" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"rework_order_id" char(26),
	"breakage_event_id" char(26),
	"inventory_type" varchar(20) NOT NULL,
	"width_mm" numeric(8, 2),
	"height_mm" numeric(8, 2),
	"thickness_mm" numeric(5, 2),
	"glass_type" varchar(50),
	"status" varchar(30) DEFAULT 'in_depot' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rework_history" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"rework_order_id" char(26) NOT NULL,
	"previous_status" varchar(30),
	"new_status" varchar(30) NOT NULL,
	"changed_by" char(26),
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rework_orders" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"parent_production_order_id" char(26) NOT NULL,
	"breakage_event_id" char(26),
	"rework_reason" text,
	"rework_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"new_production_order_id" char(26),
	"internal_customer" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD CONSTRAINT "customer_contacts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_delivery_points" ADD CONSTRAINT "customer_delivery_points_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_configurations" ADD CONSTRAINT "factory_configurations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "factory_configurations" ADD CONSTRAINT "factory_configurations_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grinding_profiles" ADD CONSTRAINT "grinding_profiles_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grinding_profiles" ADD CONSTRAINT "grinding_profiles_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "remnant_thresholds" ADD CONSTRAINT "remnant_thresholds_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trim_profiles" ADD CONSTRAINT "trim_profiles_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trim_profiles" ADD CONSTRAINT "trim_profiles_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_consumables" ADD CONSTRAINT "machine_consumables_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_maintenance_logs" ADD CONSTRAINT "machine_maintenance_logs_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machine_spare_parts" ADD CONSTRAINT "machine_spare_parts_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "machines" ADD CONSTRAINT "machines_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_machine_assignments" ADD CONSTRAINT "station_machine_assignments_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_machine_assignments" ADD CONSTRAINT "station_machine_assignments_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_personnel_assignments" ADD CONSTRAINT "station_personnel_assignments_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "station_personnel_assignments" ADD CONSTRAINT "station_personnel_assignments_personnel_id_personnel_id_fk" FOREIGN KEY ("personnel_id") REFERENCES "public"."personnel"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stations" ADD CONSTRAINT "stations_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_unit_profiles" ADD CONSTRAINT "material_unit_profiles_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials" ADD CONSTRAINT "materials_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_items" ADD CONSTRAINT "recipe_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_operations" ADD CONSTRAINT "recipe_operations_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_rules" ADD CONSTRAINT "recipe_rules_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_versions" ADD CONSTRAINT "recipe_versions_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_barcodes" ADD CONSTRAINT "inventory_barcodes_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_barcodes" ADD CONSTRAINT "inventory_barcodes_lot_id_inventory_lots_id_fk" FOREIGN KEY ("lot_id") REFERENCES "public"."inventory_lots"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_location_id_inventory_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."inventory_locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_notes" ADD CONSTRAINT "order_notes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cutting_result_items" ADD CONSTRAINT "cutting_result_items_cutting_result_id_cutting_results_id_fk" FOREIGN KEY ("cutting_result_id") REFERENCES "public"."cutting_results"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cutting_result_items" ADD CONSTRAINT "cutting_result_items_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cutting_results" ADD CONSTRAINT "cutting_results_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cutting_results" ADD CONSTRAINT "cutting_results_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cutting_results" ADD CONSTRAINT "cutting_results_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cutting_results" ADD CONSTRAINT "cutting_results_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cutting_results" ADD CONSTRAINT "cutting_results_operator_id_personnel_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."personnel"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cutting_results" ADD CONSTRAINT "cutting_results_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_breakage_events" ADD CONSTRAINT "production_breakage_events_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_breakage_events" ADD CONSTRAINT "production_breakage_events_breakage_station_id_stations_id_fk" FOREIGN KEY ("breakage_station_id") REFERENCES "public"."stations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_breakage_events" ADD CONSTRAINT "production_breakage_events_breakage_machine_id_machines_id_fk" FOREIGN KEY ("breakage_machine_id") REFERENCES "public"."machines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_breakage_events" ADD CONSTRAINT "production_breakage_events_breakage_operator_id_personnel_id_fk" FOREIGN KEY ("breakage_operator_id") REFERENCES "public"."personnel"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_events" ADD CONSTRAINT "production_events_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_events" ADD CONSTRAINT "production_events_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_events" ADD CONSTRAINT "production_events_machine_id_machines_id_fk" FOREIGN KEY ("machine_id") REFERENCES "public"."machines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_events" ADD CONSTRAINT "production_events_operator_id_personnel_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."personnel"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_events" ADD CONSTRAINT "production_events_shift_id_personnel_shifts_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."personnel_shifts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_order_line_id_order_lines_id_fk" FOREIGN KEY ("order_line_id") REFERENCES "public"."order_lines"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_current_station_id_stations_id_fk" FOREIGN KEY ("current_station_id") REFERENCES "public"."stations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_operations" ADD CONSTRAINT "production_operations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_queue_items" ADD CONSTRAINT "production_queue_items_queue_id_production_queues_id_fk" FOREIGN KEY ("queue_id") REFERENCES "public"."production_queues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_queue_items" ADD CONSTRAINT "production_queue_items_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_queues" ADD CONSTRAINT "production_queues_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_queues" ADD CONSTRAINT "production_queues_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_queues" ADD CONSTRAINT "production_queues_station_id_stations_id_fk" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fire_inventory_items" ADD CONSTRAINT "fire_inventory_items_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fire_inventory_items" ADD CONSTRAINT "fire_inventory_items_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fire_inventory_items" ADD CONSTRAINT "fire_inventory_items_rework_order_id_rework_orders_id_fk" FOREIGN KEY ("rework_order_id") REFERENCES "public"."rework_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fire_inventory_items" ADD CONSTRAINT "fire_inventory_items_breakage_event_id_production_breakage_events_id_fk" FOREIGN KEY ("breakage_event_id") REFERENCES "public"."production_breakage_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rework_history" ADD CONSTRAINT "rework_history_rework_order_id_rework_orders_id_fk" FOREIGN KEY ("rework_order_id") REFERENCES "public"."rework_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rework_history" ADD CONSTRAINT "rework_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rework_orders" ADD CONSTRAINT "rework_orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rework_orders" ADD CONSTRAINT "rework_orders_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rework_orders" ADD CONSTRAINT "rework_orders_parent_production_order_id_production_orders_id_fk" FOREIGN KEY ("parent_production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rework_orders" ADD CONSTRAINT "rework_orders_breakage_event_id_production_breakage_events_id_fk" FOREIGN KEY ("breakage_event_id") REFERENCES "public"."production_breakage_events"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rework_orders" ADD CONSTRAINT "rework_orders_new_production_order_id_production_orders_id_fk" FOREIGN KEY ("new_production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE restrict ON UPDATE no action;