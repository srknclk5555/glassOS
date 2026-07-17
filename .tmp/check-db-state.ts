import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL missing');
  const sql = postgres(url, { ssl: 'require' });

  await sql.begin(async (tx) => {
    await tx`SELECT set_config('app.current_user_role', 'super_admin', true)`;
    
    const users = await tx`SELECT id, email, active, deleted_at FROM users`;
    console.log('All users:', JSON.stringify(users, null, 2));
    
    const roles = await tx`SELECT id, name FROM roles`;
    console.log('Roles:', JSON.stringify(roles, null, 2));
    
    const tenants = await tx`SELECT id, name FROM tenants`;
    console.log('Tenants:', JSON.stringify(tenants, null, 2));
  });

  await sql.end({ timeout: 5 });
}

main().catch((err) => { console.error(err); process.exit(1); });
