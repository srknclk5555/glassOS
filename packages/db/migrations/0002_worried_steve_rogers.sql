CREATE TABLE "warehouses" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"warehouse_code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"warehouse_type" varchar(50) NOT NULL,
	"description" text,
	"manager_id" char(26),
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
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;