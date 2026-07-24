CREATE TABLE "material_tag_map" (
	"material_id" char(26) NOT NULL,
	"tag_id" char(26) NOT NULL,
	CONSTRAINT "material_tag_map_material_id_tag_id_pk" PRIMARY KEY("material_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "material_tags" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"name" varchar(100) NOT NULL,
	"color" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials_master" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"material_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"short_name" varchar(100),
	"description" text,
	"material_type" varchar(50) NOT NULL,
	"material_group_id" char(26),
	"brand" varchar(255),
	"model" varchar(255),
	"default_warehouse_id" char(26),
	"default_location_id" char(26),
	"default_supplier_id" char(26),
	"base_unit" varchar(50) DEFAULT 'piece' NOT NULL,
	"stock_tracking" boolean DEFAULT true NOT NULL,
	"inventory_item" boolean DEFAULT true NOT NULL,
	"purchasable" boolean DEFAULT false NOT NULL,
	"sellable" boolean DEFAULT false NOT NULL,
	"manufacturable" boolean DEFAULT false NOT NULL,
	"quality_inspection_required" boolean DEFAULT false NOT NULL,
	"batch_tracking" boolean DEFAULT false NOT NULL,
	"serial_tracking" boolean DEFAULT false NOT NULL,
	"expiration_tracking" boolean DEFAULT false NOT NULL,
	"min_stock" numeric(14, 4),
	"max_stock" numeric(14, 4),
	"critical_stock" numeric(14, 4),
	"safety_stock" numeric(14, 4),
	"reorder_point" numeric(14, 4),
	"reorder_quantity" numeric(14, 4),
	"standard_cost" numeric(16, 4),
	"average_cost" numeric(16, 4),
	"last_purchase_price" numeric(16, 4),
	"currency" varchar(10),
	"barcode" varchar(100),
	"qr_code" varchar(500),
	"rfid_code" varchar(100),
	"image_url" varchar(500),
	"technical_drawing_url" varchar(500),
	"document_url" varchar(500),
	"custom_code_1" varchar(100),
	"custom_code_2" varchar(100),
	"custom_code_3" varchar(100),
	"custom_code_4" varchar(100),
	"custom_code_5" varchar(100),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
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
ALTER TABLE "material_tag_map" ADD CONSTRAINT "material_tag_map_material_id_materials_master_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials_master"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_tag_map" ADD CONSTRAINT "material_tag_map_tag_id_material_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."material_tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_tags" ADD CONSTRAINT "material_tags_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials_master" ADD CONSTRAINT "materials_master_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials_master" ADD CONSTRAINT "materials_master_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "materials_master" ADD CONSTRAINT "materials_master_default_warehouse_id_warehouses_id_fk" FOREIGN KEY ("default_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE set null ON UPDATE no action;