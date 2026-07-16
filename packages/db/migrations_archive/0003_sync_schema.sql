-- Migration: 0003_sync_schema.sql
-- Purpose: Add columns present in packages/db/src/schema.ts but missing from the DB

-- Tenants: add active and deleted_at
ALTER TABLE IF EXISTS "tenants" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;
ALTER TABLE IF EXISTS "tenants" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

-- Factories: add active and deleted_at
ALTER TABLE IF EXISTS "factories" ADD COLUMN IF NOT EXISTS "active" boolean DEFAULT true NOT NULL;
ALTER TABLE IF EXISTS "factories" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp with time zone;

-- Users: add selected_factory_id and FK
ALTER TABLE IF EXISTS "users" ADD COLUMN IF NOT EXISTS "selected_factory_id" uuid;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_selected_factory_id_factories_id_fk'
  ) THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_selected_factory_id_factories_id_fk" FOREIGN KEY ("selected_factory_id") REFERENCES "public"."factories"("id") ON DELETE set null ON UPDATE no action;
  END IF;
END$$;
