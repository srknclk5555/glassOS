import dotenv from 'dotenv';
import postgres from 'postgres';
import fs from 'fs';

dotenv.config({ path: './apps/web/.env.local' });

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function check() {
  const tenants = await sql`select column_name from information_schema.columns where table_name='tenants' order by column_name`;
  const users = await sql`select column_name from information_schema.columns where table_name='users' order by column_name`;
  const out = { tenants: tenants.map(r=>r.column_name), users: users.map(r=>r.column_name) };
  fs.writeFileSync('.tmp/columns.json', JSON.stringify(out, null, 2), 'utf8');
  await sql.end();
}

check().catch(err=>{ console.error(err); process.exit(1) });
