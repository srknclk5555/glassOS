import { neon } from '@neondatabase/serverless';

// First, try the pooler URL to grant CREATE
const poolerUrl = 'postgresql://glassos_app:glassos_app_secure_pass_2026@ep-lingering-scene-asutrdl7-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const directUrl = 'postgresql://glassos_app:glassos_app_secure_pass_2026@ep-lingering-scene-asutrdl7.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';

// Try granting via direct connection
console.log('=== Attempt 1: Grant via direct connection ===');
try {
  const sql = neon(directUrl);
  await sql('GRANT CREATE ON SCHEMA public TO glassos_app');
  console.log('GRANT succeeded via direct');
  // Check if it worked
  const r = await sql("SELECT has_schema_privilege('glassos_app', 'public', 'CREATE') as can_create");
  console.log('Can create:', JSON.stringify(r));
} catch (e) {
  console.log('Grant via direct failed:', e.message);
}

// Try creating tables using a raw connection approach
console.log('\n=== Attempt 2: Try to create tables via pooler ===');
try {
  const sql = neon(poolerUrl);
  await sql(`CREATE TABLE IF NOT EXISTS manufacturing_orders (id serial primary key, test text)`);
  console.log('CREATE TABLE succeeded via pooler');
  await sql(`DROP TABLE IF EXISTS manufacturing_orders`);
} catch (e) {
  console.log('Create via pooler failed:', e.message);
}

console.log('\n=== Attempt 3: Try creating with explicit schema ===');
try {
  const sql = neon(directUrl);
  await sql('SET search_path TO public');
  await sql(`CREATE TABLE IF NOT EXISTS manufacturing_orders_test (id serial primary key, test text)`);
  console.log('CREATE TABLE succeeded after SET search_path');
  await sql(`DROP TABLE IF EXISTS manufacturing_orders_test`);
} catch (e) {
  console.log('Create with search_path failed:', e.message);
}
