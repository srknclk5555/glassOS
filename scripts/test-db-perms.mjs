import { neon } from '@neondatabase/serverless';

const poolerUrl = 'postgresql://glassos_app:glassos_app_secure_pass_2026@ep-lingering-scene-asutrdl7-pooler.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const directUrl = 'postgresql://glassos_app:glassos_app_secure_pass_2026@ep-lingering-scene-asutrdl7.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';

console.log('=== Testing pooler connection ===');
try {
  const sql1 = neon(poolerUrl);
  const r1 = await sql1('SELECT current_user, current_database()');
  console.log('Pooler:', JSON.stringify(r1));
} catch(e) { console.log('Pooler error:', e.message); }

console.log('\n=== Testing direct connection ===');
try {
  const sql2 = neon(directUrl);
  const r2 = await sql2('SELECT current_user, current_database()');
  console.log('Direct:', JSON.stringify(r2));
} catch(e) { console.log('Direct error:', e.message); }

console.log('\n=== Granting CREATE on schema public (direct) ===');
try {
  const sql2 = neon(directUrl);
  await sql2('GRANT CREATE ON SCHEMA public TO glassos_app');
  console.log('GRANT succeeded');
  const r3 = await sql2("SELECT has_schema_privilege('glassos_app', 'public', 'CREATE') as can_create");
  console.log('Can create:', JSON.stringify(r3));
} catch(e) { console.log('Grant error:', e.message); }
