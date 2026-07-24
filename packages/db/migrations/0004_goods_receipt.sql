CREATE TABLE "goods_receipt_attachments" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"goods_receipt_id" char(26) NOT NULL,
	"goods_receipt_item_id" char(26),
	"file_name" varchar(500) NOT NULL,
	"file_type" varchar(20) NOT NULL,
	"file_url" varchar(1000) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"file_size_bytes" numeric(14, 0) NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_items" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"goods_receipt_id" char(26) NOT NULL,
	"line_no" numeric NOT NULL,
	"material_id" char(26) NOT NULL,
	"format_id" char(26),
	"width_mm" numeric(8, 1),
	"height_mm" numeric(8, 1),
	"quantity" numeric(14, 4) NOT NULL,
	"unit" varchar(50) NOT NULL,
	"lot_number" varchar(100),
	"internal_lot_number" varchar(100) NOT NULL,
	"unit_cost" numeric(16, 4),
	"currency" varchar(10),
	"target_warehouse_id" char(26),
	"quality_status" varchar(20) DEFAULT 'accepted' NOT NULL,
	"quality_notes" text,
	"is_plate_tracked" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "goods_receipt_plates" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"goods_receipt_item_id" char(26) NOT NULL,
	"plate_serial" varchar(100) NOT NULL,
	"width_mm" numeric(8, 1) NOT NULL,
	"height_mm" numeric(8, 1) NOT NULL,
	"thickness_mm" numeric(5, 1),
	"barcode_id" char(26)
);
--> statement-breakpoint
CREATE TABLE "goods_receipts" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26) NOT NULL,
	"receipt_number" varchar(50) NOT NULL,
	"receipt_date" varchar(10) NOT NULL,
	"receipt_time" varchar(5) NOT NULL,
	"supplier_id" char(26),
	"purchase_order_id" char(26),
	"warehouse_id" char(26) NOT NULL,
	"received_by_id" char(26) NOT NULL,
	"vehicle_plate" varchar(20),
	"trailer_plate" varchar(20),
	"driver_name" varchar(100),
	"driver_phone" varchar(50),
	"carrier_company" varchar(255),
	"despatch_number" varchar(100),
	"despatch_date" varchar(10),
	"invoice_number" varchar(100),
	"order_reference" varchar(255),
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
ALTER TABLE "goods_receipt_attachments" ADD CONSTRAINT "goods_receipt_attachments_goods_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_goods_receipt_id_goods_receipts_id_fk" FOREIGN KEY ("goods_receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_items" ADD CONSTRAINT "goods_receipt_items_material_id_materials_master_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials_master"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_plates" ADD CONSTRAINT "goods_receipt_plates_goods_receipt_item_id_goods_receipt_items_id_fk" FOREIGN KEY ("goods_receipt_item_id") REFERENCES "public"."goods_receipt_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE restrict ON UPDATE no action;