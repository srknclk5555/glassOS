import { neon } from '@neondatabase/serverless';

const adminUrl = 'postgresql://neondb_owner:npg_ZkChQJ7SW9gu@ep-lingering-scene-asutrdl7-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(adminUrl);

const statements = [
  `CREATE TABLE IF NOT EXISTS manufacturing_orders (
    id CHAR(26) PRIMARY KEY,
    tenant_id CHAR(26) NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
    factory_id CHAR(26) REFERENCES factories(id) ON DELETE RESTRICT,
    order_no VARCHAR(50) NOT NULL,
    customer_id CHAR(26) REFERENCES customers(id) ON DELETE RESTRICT,
    customer_name VARCHAR(255),
    production_date TIMESTAMPTZ,
    due_date TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by CHAR(26),
    updated_by CHAR(26),
    deleted_at TIMESTAMPTZ,
    deleted_by CHAR(26)
  )`,

  `CREATE TABLE IF NOT EXISTS manufacturing_order_items (
    id CHAR(26) PRIMARY KEY,
    order_id CHAR(26) NOT NULL REFERENCES manufacturing_orders(id) ON DELETE CASCADE,
    recipe_id CHAR(26) NOT NULL REFERENCES recipes(id) ON DELETE RESTRICT,
    recipe_code VARCHAR(50),
    recipe_name VARCHAR(255),
    net_width_mm NUMERIC(8,1) NOT NULL,
    net_height_mm NUMERIC(8,1) NOT NULL,
    quantity INTEGER NOT NULL,
    engine_snapshot JSONB,
    sequence INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_tenant_id ON manufacturing_orders(tenant_id)`,
  `CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_order_no ON manufacturing_orders(order_no)`,
  `CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_status ON manufacturing_orders(status)`,
  `CREATE INDEX IF NOT EXISTS idx_manufacturing_orders_production_date ON manufacturing_orders(production_date)`,
  `CREATE INDEX IF NOT EXISTS idx_manufacturing_order_items_order_id ON manufacturing_order_items(order_id)`,
  `CREATE INDEX IF NOT EXISTS idx_manufacturing_order_items_recipe_id ON manufacturing_order_items(recipe_id)`,
];

console.log('Creating tables...');
for (const stmt of statements) {
  try {
    await sql(stmt);
    console.log('  OK');
  } catch (e) {
    console.error('  ERROR:', e.message);
  }
}

try {
  await sql('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO glassos_app');
  console.log('  OK: GRANT ALL PRIVILEGES');
} catch (e) {
  console.log('  Note:', e.message);
}

const tables = await sql("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name LIKE 'manufacturing%' ORDER BY table_name");
console.log('\nManufacturing tables:', tables.map(t => t.table_name).join(', '));
