CREATE TABLE "customer_glass_catalog" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"customer_id" char(26) NOT NULL,
	"product_code" varchar(100) NOT NULL,
	"glass_type" varchar(100) NOT NULL,
	"thickness_mm" numeric(5, 1),
	"default_width_mm" numeric(8, 1),
	"default_height_mm" numeric(8, 1),
	"default_pieces" numeric(8, 0),
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
CREATE TABLE "customer_instruction_conditions" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"instruction_id" char(26) NOT NULL,
	"field" varchar(100) NOT NULL,
	"operator" varchar(20) NOT NULL,
	"value" text NOT NULL,
	"value_type" varchar(20) DEFAULT 'number' NOT NULL,
	"logical_group" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
CREATE TABLE "customer_instructions" (
	"id" char(26) PRIMARY KEY NOT NULL,
	"customer_id" char(26) NOT NULL,
	"title" varchar(255) NOT NULL,
	"instruction" text NOT NULL,
	"is_standing" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"created_by" char(26),
	"updated_by" char(26),
	"deleted_at" timestamp with time zone,
	"deleted_by" char(26)
);
--> statement-breakpoint
DROP TABLE "customer_delivery_points" CASCADE;--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD COLUMN "created_by" char(26);--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD COLUMN "updated_by" char(26);--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "customer_contacts" ADD COLUMN "deleted_by" char(26);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "erp_status" varchar(20);--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "quality_profile" jsonb;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "production_preferences" jsonb;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "label_spec" jsonb;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "packaging_profile" jsonb;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "communication_profile" jsonb;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "operational_block" jsonb;--> statement-breakpoint
ALTER TABLE "customers" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_points" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "delivery_points" ADD COLUMN "scheduling_profile" jsonb;--> statement-breakpoint
ALTER TABLE "delivery_points" ADD COLUMN "created_by" char(26);--> statement-breakpoint
ALTER TABLE "delivery_points" ADD COLUMN "updated_by" char(26);--> statement-breakpoint
ALTER TABLE "delivery_points" ADD COLUMN "deleted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "delivery_points" ADD COLUMN "deleted_by" char(26);--> statement-breakpoint
ALTER TABLE "customer_glass_catalog" ADD CONSTRAINT "fk_customer_glass_catalog_customer_id" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_instruction_conditions" ADD CONSTRAINT "fk_customer_instruction_conditions_instruction_id" FOREIGN KEY ("instruction_id") REFERENCES "public"."customer_instructions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_instructions" ADD CONSTRAINT "fk_customer_instructions_customer_id" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_points" DROP COLUMN "active";--> statement-breakpoint

-- Phase 6: Standard indexes
CREATE UNIQUE INDEX idx_customers_tenant_code ON customers (tenant_id, customer_code);
CREATE INDEX idx_customers_tenant_active ON customers (tenant_id, is_active);
CREATE INDEX idx_customers_tenant_name ON customers (tenant_id, name);
CREATE INDEX idx_customer_contacts_customer ON customer_contacts (customer_id);
CREATE INDEX idx_delivery_points_customer ON delivery_points (customer_id);
CREATE INDEX idx_glass_catalog_customer ON customer_glass_catalog (customer_id);
CREATE INDEX idx_customer_instructions_customer ON customer_instructions (customer_id);
CREATE INDEX idx_instruction_conditions_instruction ON customer_instruction_conditions (instruction_id);
--> statement-breakpoint

-- Phase 7: Partial indexes for soft delete (WHERE deleted_at IS NULL)
CREATE INDEX idx_customers_active ON customers (tenant_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_contacts_active ON customer_contacts (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_delivery_points_active ON delivery_points (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_glass_catalog_active ON customer_glass_catalog (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_customer_instructions_active ON customer_instructions (customer_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_instruction_conditions_active ON customer_instruction_conditions (instruction_id) WHERE deleted_at IS NULL;
--> statement-breakpoint

-- Phase 8: Trigram indexes for search
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_customers_trgm_name ON customers USING gin (name gin_trgm_ops);
CREATE INDEX idx_customers_trgm_code ON customers USING gin (customer_code gin_trgm_ops);
CREATE INDEX idx_customers_trgm_phone ON customers USING gin (phone gin_trgm_ops);
--> statement-breakpoint

-- Phase 9: Partial unique indexes for aggregate invariants
CREATE UNIQUE INDEX idx_customer_primary_contact ON customer_contacts (customer_id) WHERE is_primary = true AND deleted_at IS NULL;
CREATE UNIQUE INDEX idx_customer_default_delivery ON delivery_points (customer_id) WHERE is_default = true AND deleted_at IS NULL;
--> statement-breakpoint

-- Phase 10: Full Text Search vector
ALTER TABLE customers ADD COLUMN search_vector tsvector GENERATED ALWAYS AS (
  setweight(to_tsvector('turkish', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('simple', coalesce(customer_code, '')), 'B') ||
  setweight(to_tsvector('simple', coalesce(short_name, '')), 'C') ||
  setweight(to_tsvector('simple', coalesce(phone, '')), 'D')
) STORED;
CREATE INDEX idx_customers_fts ON customers USING gin (search_vector);
--> statement-breakpoint

-- Phase 11: Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers FORCE ROW LEVEL SECURITY;
CREATE POLICY customer_tenant_isolation ON customers FOR ALL USING (tenant_id = current_setting('app.tenant_id', true)::char(26));
--> statement-breakpoint

ALTER TABLE customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_contacts FORCE ROW LEVEL SECURITY;
CREATE POLICY contact_tenant_isolation ON customer_contacts FOR ALL USING (
  customer_id IN (SELECT id FROM customers WHERE tenant_id = current_setting('app.tenant_id', true)::char(26))
);
--> statement-breakpoint

ALTER TABLE delivery_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_points FORCE ROW LEVEL SECURITY;
CREATE POLICY delivery_point_tenant_isolation ON delivery_points FOR ALL USING (
  customer_id IN (SELECT id FROM customers WHERE tenant_id = current_setting('app.tenant_id', true)::char(26))
);
--> statement-breakpoint

ALTER TABLE customer_glass_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_glass_catalog FORCE ROW LEVEL SECURITY;
CREATE POLICY glass_catalog_tenant_isolation ON customer_glass_catalog FOR ALL USING (
  customer_id IN (SELECT id FROM customers WHERE tenant_id = current_setting('app.tenant_id', true)::char(26))
);
--> statement-breakpoint

ALTER TABLE customer_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_instructions FORCE ROW LEVEL SECURITY;
CREATE POLICY instruction_tenant_isolation ON customer_instructions FOR ALL USING (
  customer_id IN (SELECT id FROM customers WHERE tenant_id = current_setting('app.tenant_id', true)::char(26))
);
--> statement-breakpoint

ALTER TABLE customer_instruction_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_instruction_conditions FORCE ROW LEVEL SECURITY;
CREATE POLICY instruction_conditions_tenant_isolation ON customer_instruction_conditions FOR ALL USING (
  instruction_id IN (SELECT ci.id FROM customer_instructions ci JOIN customers c ON c.id = ci.customer_id WHERE c.tenant_id = current_setting('app.tenant_id', true)::char(26))
);