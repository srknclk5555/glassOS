CREATE TABLE "production_records" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"tenant_id" char(26) NOT NULL,
	"factory_id" char(26),
	"production_order_id" char(26) NOT NULL,
	"status" varchar(20) DEFAULT 'collecting' NOT NULL,
	"product_type" varchar(50),
	"business_width_mm" numeric(8, 2) NOT NULL,
	"business_height_mm" numeric(8, 2) NOT NULL,
	"quantity_requested" integer NOT NULL,
	"quantity_completed" integer DEFAULT 0 NOT NULL,
	"quantity_broken" integer DEFAULT 0 NOT NULL,
	"recipe_id" char(26),
	"recipe_version" integer NOT NULL,
	"total_sheets_used" integer,
	"total_glass_area_m2" numeric(12, 4),
	"total_waste_m2" numeric(12, 4),
	"yield_percentage" numeric(5, 2),
	"total_cost" numeric(14, 4),
	"consumption_details" jsonb,
	"cost_details" jsonb,
	"analysis_details" jsonb,
	"traceability" jsonb,
	"collecting_started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"completed_by" char(26),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26)
);
--> statement-breakpoint
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_factory_id_factories_id_fk" FOREIGN KEY ("factory_id") REFERENCES "public"."factories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_production_order_id_production_orders_id_fk" FOREIGN KEY ("production_order_id") REFERENCES "public"."production_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "production_records" ADD CONSTRAINT "production_records_completed_by_users_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_pr_tenant_order" ON "production_records" USING btree ("tenant_id","production_order_id");--> statement-breakpoint
CREATE INDEX "idx_pr_tenant" ON "production_records" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_pr_completed_at" ON "production_records" USING btree ("completed_at");--> statement-breakpoint
CREATE INDEX "idx_pr_product_type" ON "production_records" USING btree ("product_type");--> statement-breakpoint
CREATE INDEX "idx_pr_yield" ON "production_records" USING btree ("yield_percentage");