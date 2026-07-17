CREATE TABLE "delivery_points" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"customer_id" char(26) NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"city" varchar(100),
	"district" varchar(100),
	"latitude" numeric(10, 7),
	"longitude" numeric(10, 7),
	"phone" varchar(50),
	"note" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"factory_id" char(26) NOT NULL,
	"tolerances" jsonb,
	"trim_mm" numeric(8, 2),
	"qr_type" varchar(20) DEFAULT 'QR',
	"shift_settings" jsonb,
	"cost_settings" jsonb,
	"notification_settings" jsonb,
	"factory_configuration" jsonb,
	"logo_url" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "material_categories" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "material_packagings" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"material_id" char(26) NOT NULL,
	"name" varchar(255) NOT NULL,
	"quantity_per_package" numeric(10, 2) NOT NULL,
	"unit" varchar(20) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD COLUMN "role" varchar(100);--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD COLUMN "whatsapp" varchar(50);--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "category_id" char(26);--> statement-breakpoint
ALTER TABLE "delivery_points" ADD CONSTRAINT "delivery_points_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_categories" ADD CONSTRAINT "material_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "material_packagings" ADD CONSTRAINT "material_packagings_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;