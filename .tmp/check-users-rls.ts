import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const sql = postgres(url, { ssl: 'require' });

  const policies = await sql`
    SELECT tablename, policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename IN ('users', 'tenants') 
    ORDER BY tablename, policyname
  `;
  console.log('Policies:', JSON.stringify(policies, null, 2));

  const rlsStatus = await sql`
    SELECT tablename, rowsecurity, force_row_security 
    FROM pg_tables 
    WHERE schemaname = 'public' AND tablename IN ('users', 'tenants')
  `;
  console.log('RLS status:', JSON.stringify(rlsStatus, null, 2));

  await sql.end({ timeout: 5 });
}

main().catch((err) => { console.error(err); process.exit(1); });
