import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const sql = postgres(url, { ssl: 'require' });

  // Check RLS status on roles
  const rlsStatus = await sql`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('roles','tenants','permissions')`;
  console.log('RLS status:', JSON.stringify(rlsStatus, null, 2));

  const policies = await sql`SELECT tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename IN ('roles','tenants','permissions') ORDER BY tablename`;
  console.log('Policies:', JSON.stringify(policies, null, 2));

  await sql.end({ timeout: 5 });
}

main().catch((err) => { console.error(err); process.exit(1); });
