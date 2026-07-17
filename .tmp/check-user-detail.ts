import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const sql = postgres(url, { ssl: 'require' });

  await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_role', 'super_admin', true)`;
    const users = await tx`SELECT id, tenant_id, role_id, name, email, active, deleted_at FROM users WHERE email = 'tenant-admin@example.com'`;
    console.log('User detail:', JSON.stringify(users, null, 2));
  });

  await sql.end({ timeout: 5 });
}

main().catch((err) => { console.error(err); process.exit(1); });
