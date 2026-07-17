import dotenv from 'dotenv';
import postgres from 'postgres';

dotenv.config({ path: './apps/web/.env.local' });

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function check() {
  const tenants = await sql`select column_name from information_schema.columns where table_name='tenants' order by column_name`;
  const users = await sql`select column_name from information_schema.columns where table_name='users' order by column_name`;
  console.log('tenants columns:', tenants.map(r=>r.column_name));
  console.log('users columns:', users.map(r=>r.column_name));
  await sql.end();
}

check().catch(err=>{ console.error(err); process.exit(1) });
