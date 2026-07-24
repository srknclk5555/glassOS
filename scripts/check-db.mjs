import { neon } from '@neondatabase/serverless';

const url = 'postgresql://glassos_app:glassos_app_secure_pass_2026@ep-lingering-scene-asutrdl7.c-4.eu-central-1.aws.neon.tech/neondb?sslmode=require';
const sql = neon(url);

// Check current user
const r = await sql('SELECT current_user, session_user, current_database()');
console.log('User info:', JSON.stringify(r));

// Check database owner
const r2 = await sql("SELECT datname, datdba::regrole as owner FROM pg_database WHERE datname = current_database()");
console.log('DB owner:', JSON.stringify(r2));

// Check schema owner
const r3 = await sql("SELECT nspname, nspowner::regrole as owner FROM pg_namespace WHERE nspname = 'public'");
console.log('Schema owner:', JSON.stringify(r3));

// Check what roles exist
const r4 = await sql("SELECT rolname FROM pg_roles WHERE rolname NOT LIKE 'pg_%' ORDER BY rolname");
console.log('Roles:', JSON.stringify(r4));
