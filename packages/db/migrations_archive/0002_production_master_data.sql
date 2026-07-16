CREATE TABLE "material_categories" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    
    "name" varchar(255) NOT NULL,
    "description" text,
    "active" boolean DEFAULT true NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "materials" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "category_id" uuid NOT NULL,
    "material_code" varchar(100) NOT NULL,
    "name" varchar(255) NOT NULL,
    "description" text,
    "thickness_mm" double precision,
    "color" varchar(100),
    "manufacturer" varchar(255),
    "standard_sheet_width_mm" double precision,
    "standard_sheet_height_mm" double precision,
    "stock_tracked" boolean DEFAULT true NOT NULL,
    "temperable" boolean DEFAULT false NOT NULL,
    "laminate_compatible" boolean DEFAULT false NOT NULL,
    "density_kg_per_m3" double precision,
    "default_unit" varchar(50) DEFAULT 'm2' NOT NULL,
    "notes" text,
    "active" boolean DEFAULT true NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_unit_profiles" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "material_id" uuid NOT NULL,
    "tenant_id" uuid NOT NULL,
    "purchase_unit" varchar(50) DEFAULT 'piece' NOT NULL,
    "storage_unit" varchar(50) DEFAULT 'plate' NOT NULL,
    "consumption_unit" varchar(50) DEFAULT 'm2' NOT NULL,
    "weight_unit" varchar(50) DEFAULT 'kg' NOT NULL,
    "length_unit" varchar(50) DEFAULT 'mm' NOT NULL,
    "area_unit" varchar(50) DEFAULT 'm2' NOT NULL,
    "conversion_factor_to_consumption" double precision,
    "density_kg_per_m3" double precision,
    "notes" text,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "material_packagings" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "material_id" uuid NOT NULL,
    "tenant_id" uuid NOT NULL,
    "package_type" varchar(100) NOT NULL,
    "description" text,
    "length_mm" double precision,
    "width_mm" double precision,
    "height_mm" double precision,
    "quantity" double precision DEFAULT 1 NOT NULL,
    "unit" varchar(50) DEFAULT 'piece' NOT NULL,
    "weight_kg" double precision,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "name" varchar(255) NOT NULL,
    "description" text,
    "active" boolean DEFAULT true NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "category_id" uuid NOT NULL,
    "product_code" varchar(100) NOT NULL,
    "name" varchar(255) NOT NULL,
    "description" text,
    "thickness_mm" double precision,
    "color" varchar(100),
    "is_temper" boolean DEFAULT false NOT NULL,
    "is_insulated" boolean DEFAULT false NOT NULL,
    "is_laminated" boolean DEFAULT false NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "deleted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipes" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "product_id" uuid NOT NULL,
    "recipe_code" varchar(100) NOT NULL,
    "name" varchar(255) NOT NULL,
    "description" text,
    "grinding_allowance_mm" double precision DEFAULT 0 NOT NULL,
    "trim_enabled" boolean DEFAULT false NOT NULL,
    "trim_mm" double precision DEFAULT 0 NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_materials" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "recipe_id" uuid NOT NULL,
    "material_id" uuid NOT NULL,
    "consumption_basis" varchar(50) NOT NULL,
    "quantity" double precision NOT NULL,
    "unit" varchar(50) NOT NULL,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipe_operations" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "recipe_id" uuid NOT NULL,
    "sequence" integer NOT NULL,
    "operation_code" varchar(100) NOT NULL,
    "name" varchar(255) NOT NULL,
    "description" text,
    "duration_seconds" integer,
    "machine_group" varchar(100),
    "requires_quality_check" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routing_templates" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "tenant_id" uuid NOT NULL,
    "product_id" uuid,
    "recipe_id" uuid,
    "name" varchar(255) NOT NULL,
    "description" text,
    "is_default" boolean DEFAULT false NOT NULL,
    "active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routing_steps" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "routing_template_id" uuid NOT NULL,
    "sequence" integer NOT NULL,
    "station" varchar(100) NOT NULL,
    "operation_code" varchar(100),
    "estimated_minutes" integer,
    "notes" text,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "material_categories" ADD CONSTRAINT "material_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade;
ALTER TABLE "materials" ADD CONSTRAINT "materials_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade;
ALTER TABLE "materials" ADD CONSTRAINT "materials_category_id_material_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."material_categories"("id") ON DELETE restrict;
ALTER TABLE "material_unit_profiles" ADD CONSTRAINT "material_unit_profiles_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade;
-- removed redundant tenant FK on material_unit_profiles (tenant sourced from materials)
ALTER TABLE "material_packagings" ADD CONSTRAINT "material_packagings_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade;
ALTER TABLE "material_packagings" ADD CONSTRAINT "material_packagings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade;
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade;
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade;
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_product_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id") ON DELETE restrict;
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade;
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade;
ALTER TABLE "recipe_materials" ADD CONSTRAINT "recipe_materials_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade;
ALTER TABLE "recipe_materials" ADD CONSTRAINT "recipe_materials_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE cascade;
ALTER TABLE "recipe_operations" ADD CONSTRAINT "recipe_operations_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade;
ALTER TABLE "routing_templates" ADD CONSTRAINT "routing_templates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade;
ALTER TABLE "routing_templates" ADD CONSTRAINT "routing_templates_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null;
ALTER TABLE "routing_templates" ADD CONSTRAINT "routing_templates_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE set null;
ALTER TABLE "routing_steps" ADD CONSTRAINT "routing_steps_routing_template_id_routing_templates_id_fk" FOREIGN KEY ("routing_template_id") REFERENCES "public"."routing_templates"("id") ON DELETE cascade;
--> statement-breakpoint
ALTER TABLE "material_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "material_unit_profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "material_packagings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "product_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recipes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recipe_materials" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recipe_operations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routing_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routing_steps" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY material_categories_isolation ON "material_categories"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
);

CREATE POLICY materials_isolation ON "materials"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
);

CREATE POLICY material_unit_profiles_isolation ON "material_unit_profiles"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
);

CREATE POLICY material_packagings_isolation ON "material_packagings"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
);

CREATE POLICY product_categories_isolation ON "product_categories"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
);

CREATE POLICY products_isolation ON "products"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
);

CREATE POLICY recipes_isolation ON "recipes"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
);

CREATE POLICY recipe_materials_isolation ON "recipe_materials"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM "recipes"
    WHERE "recipes"."id" = "recipe_materials"."recipe_id"
      AND "recipes"."tenant_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
  )
);

CREATE POLICY recipe_operations_isolation ON "recipe_operations"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM "recipes"
    WHERE "recipes"."id" = "recipe_operations"."recipe_id"
      AND "recipes"."tenant_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
  )
);

CREATE POLICY routing_templates_isolation ON "routing_templates"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR tenant_id = nullif(current_setting('app.current_tenant_id', true), '')::uuid
);

CREATE POLICY routing_steps_isolation ON "routing_steps"
AS PERMISSIVE FOR ALL
USING (
  current_setting('app.current_user_role', true) = 'super_admin'
  OR EXISTS (
    SELECT 1 FROM "routing_templates"
    WHERE "routing_templates"."id" = "routing_steps"."routing_template_id"
      AND "routing_templates"."tenant_id" = nullif(current_setting('app.current_tenant_id', true), '')::uuid
  )
);

-- ===== Indexes and constraints added for Sprint 2.2B hardening =====

-- Unique constraints (tenant-scoped business codes)
CREATE UNIQUE INDEX IF NOT EXISTS ux_materials_tenant_material_code ON materials (tenant_id, material_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_products_tenant_product_code ON products (tenant_id, product_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_recipes_tenant_recipe_code ON recipes (tenant_id, recipe_code);
CREATE UNIQUE INDEX IF NOT EXISTS ux_routing_templates_tenant_name ON routing_templates (tenant_id, name);

-- Sequence uniqueness to guarantee ordering unambiguity
CREATE UNIQUE INDEX IF NOT EXISTS ux_recipe_operations_recipe_sequence ON recipe_operations (recipe_id, sequence);
CREATE UNIQUE INDEX IF NOT EXISTS ux_routing_steps_template_sequence ON routing_steps (routing_template_id, sequence);

-- Performance indexes (tenant-scoped and FK lookups)
CREATE INDEX IF NOT EXISTS idx_materials_tenant_id ON materials (tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products (tenant_id);
CREATE INDEX IF NOT EXISTS idx_recipes_tenant_id ON recipes (tenant_id);

CREATE INDEX IF NOT EXISTS idx_materials_material_code ON materials (material_code);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products (product_code);
CREATE INDEX IF NOT EXISTS idx_recipes_recipe_code ON recipes (recipe_code);

CREATE INDEX IF NOT EXISTS idx_materials_category_id ON materials (category_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_recipes_product_id ON recipes (product_id);

CREATE INDEX IF NOT EXISTS idx_recipe_materials_recipe_id ON recipe_materials (recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_operations_recipe_id ON recipe_operations (recipe_id);
CREATE INDEX IF NOT EXISTS idx_routing_steps_template_id ON routing_steps (routing_template_id);

-- End Sprint 2.2B DB hardening
