import { neon } from '@neondatabase/serverless';

// Test with glassos_app via pooler (same as the app uses)
const poolerUrl = 'postgresql://glassos_app:glassos_app_secure_pass_2026@ep-lingering-scene-asutrdl7-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';
const sql = neon(poolerUrl);

try {
  const r = await sql("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'manufacturing%' ORDER BY table_name");
  console.log('Tables visible via glassos_app pooler:', JSON.stringify(r));
  
  if (r.length > 0) {
    // Try a simple query
    const r2 = await sql('SELECT count(*) as cnt FROM manufacturing_orders');
    console.log('Count:', JSON.stringify(r2));
  }
} catch (e) {
  console.error('Error:', e.message);
}

// Also check via direct connection
console.log('\n--- Direct connection test ---');
const directUrl = 'postgresql://glassos_app:glassos_app_secure_pass_2026@ep-lingering-scene-asutrdl7.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const sql2 = neon(directUrl);
try {
  const r = await sql2("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'manufacturing%' ORDER BY table_name");
  console.log('Tables visible via direct:', JSON.stringify(r));
} catch (e) {
  console.error('Error:', e.message);
}
