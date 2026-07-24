CREATE TABLE "custom_code_definitions" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"field_number" integer NOT NULL,
	"value" varchar(100) NOT NULL,
	"label" varchar(255) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26)
);
--> statement-breakpoint
ALTER TABLE "material_categories" ADD COLUMN "material_type" varchar(50);--> statement-breakpoint
ALTER TABLE "materials_master" ADD COLUMN "origin_type" varchar(20);--> statement-breakpoint
ALTER TABLE "materials_master" ADD COLUMN "origin_country" varchar(100);--> statement-breakpoint
ALTER TABLE "custom_code_definitions" ADD CONSTRAINT "custom_code_definitions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;